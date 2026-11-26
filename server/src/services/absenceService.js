import Attendance from '../models/Attendance.js';
import Holiday from '../models/Holiday.js';
import Leave from '../models/Leave.js';
import Setting from '../models/Setting.js';
import Student from '../models/Student.js';
import Staff from '../models/Staff.js';
import { schoolDate, timeInSchoolZone } from '../utils/date.js';

function weekdayInSchoolZone(now) {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(now);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day);
}

export async function markAbsenteesIfDue(now = new Date()) {
  const settings = await Setting.findOne();
  if (!settings || timeInSchoolZone(now) < settings.absenceCutoffTime || !settings.workingDays.includes(weekdayInSchoolZone(now))) return { skipped: true };
  const date = schoolDate(now);
  if (await Holiday.exists({ date })) return { skipped: true, reason: 'holiday' };
  const [studentRows, staffRows, presentPeople, approvedLeaves] = await Promise.all([
    Student.find({ status: 'active' }).select('_id'),
    Staff.find({ status: 'active' }).select('_id'),
    Attendance.find({ date }).select('person personType'),
    Leave.find({ status: 'approved', fromDate: { $lte: date }, toDate: { $gte: date } }).select('person personType')
  ]);
  const recorded = new Set(presentPeople.map((row) => `${row.personType}:${row.person}`));
  const leave = new Set(approvedLeaves.map((row) => `${row.personType}:${row.person}`));
  const docs = [];
  for (const person of studentRows) if (!recorded.has(`student:${person._id}`)) docs.push({ personType: 'student', person: person._id, personModel: 'Student', date, status: leave.has(`student:${person._id}`) ? 'leave' : 'absent' });
  for (const person of staffRows) if (!recorded.has(`staff:${person._id}`)) docs.push({ personType: 'staff', person: person._id, personModel: 'Staff', date, status: leave.has(`staff:${person._id}`) ? 'leave' : 'absent' });
  if (!docs.length) return { date, created: 0 };
  try { await Attendance.insertMany(docs, { ordered: false }); } catch (error) { if (error.code !== 11000) throw error; }
  return { date, created: docs.length };
}

export function startAttendanceScheduler() {
  markAbsenteesIfDue().catch((error) => console.error('Initial absence check failed', error));
  setInterval(() => markAbsenteesIfDue().catch((error) => console.error('Scheduled absence check failed', error)), 5 * 60 * 1000).unref();
}
