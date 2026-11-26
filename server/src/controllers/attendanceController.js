import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import { schoolDate } from '../utils/date.js';
import { audit } from '../utils/audit.js';

export async function listAttendance(req, res) {
  const { date = schoolDate(), classId, section, status, personType } = req.query;
  const filter = { date };
  if (status) filter.status = status;
  if (personType) filter.personType = personType;
  let allowedStudentIds;
  if (classId || section || req.user.role === 'teacher') {
    const studentFilter = {};
    if (classId) studentFilter.class = classId;
    if (section) studentFilter.section = section;
    if (req.user.role === 'teacher') studentFilter.class = { $in: req.user.assignedClasses };
    allowedStudentIds = await Student.find(studentFilter).distinct('_id');
    filter.$or = [{ personType: 'staff' }, { person: { $in: allowedStudentIds } }];
  }
  const items = await Attendance.find(filter).populate('person').populate('inDevice outDevice', 'name location').sort({ inTime: -1 });
  res.json({ items });
}

export async function correctAttendance(req, res) {
  const { id } = req.params;
  const { status, inTime, outTime, reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ message: 'A correction reason is mandatory' });
  const row = await Attendance.findById(id).populate('person');
  if (!row) return res.status(404).json({ message: 'Attendance record not found' });
  if (req.user.role === 'teacher' && row.personType === 'student' && !req.user.assignedClasses.some((classId) => classId.equals(row.person.class))) return res.status(403).json({ message: 'This record is outside your assigned classes' });
  const before = row.toObject();
  if (status) row.status = status;
  if (inTime !== undefined) row.inTime = inTime || null;
  if (outTime !== undefined) row.outTime = outTime || null;
  row.manuallyChanged = true;
  row.correctionReason = reason.trim();
  row.correctedBy = req.user._id;
  await row.save();
  await audit(req, 'attendance_correction', 'Attendance', row._id, before, row.toObject());
  res.json({ item: row });
}

export async function dashboard(req, res) {
  const date = req.query.date || schoolDate();
  const [byStatus, liveScans, totalStudents, totalStaff] = await Promise.all([
    Attendance.aggregate([{ $match: { date } }, { $group: { _id: { personType: '$personType', status: '$status' }, count: { $sum: 1 } } }]),
    Attendance.find({ date }).populate('person', 'name photo class section department designation').populate('inDevice outDevice', 'name location').sort({ updatedAt: -1 }).limit(12),
    Student.countDocuments({ status: 'active' }),
    (await import('../models/Staff.js')).default.countDocuments({ status: 'active' })
  ]);
  const summary = { students: { total: totalStudents, present: 0, absent: 0, late: 0, leave: 0 }, staff: { total: totalStaff, present: 0, absent: 0, late: 0, leave: 0 } };
  byStatus.forEach(({ _id, count }) => { summary[_id.personType][ _id.status === 'half_day' ? 'present' : _id.status ] = count; });
  res.json({ date, summary, liveScans });
}
