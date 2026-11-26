import Student from '../models/Student.js';
import Staff from '../models/Staff.js';
import { audit } from '../utils/audit.js';

const modelFor = (type) => type === 'students' ? Student : type === 'staff' ? Staff : null;

export async function listPeople(req, res) {
  const Model = modelFor(req.params.type);
  if (!Model) return res.status(404).json({ message: 'Unknown people type' });
  const { q = '', page = 1, limit = 20, classId, section, status = 'active' } = req.query;
  const filter = status === 'all' ? {} : { status };
  if (req.params.type === 'students') {
    if (classId) filter.class = classId;
    if (section) filter.section = section;
    if (req.user.role === 'teacher' && req.user.assignedClasses.length) filter.class = { $in: req.user.assignedClasses };
  }
  if (q) filter.$or = req.params.type === 'students'
    ? [{ name: new RegExp(q, 'i') }, { admissionNo: new RegExp(q, 'i') }, { cardUID: new RegExp(q, 'i') }]
    : [{ name: new RegExp(q, 'i') }, { employeeNo: new RegExp(q, 'i') }, { cardUID: new RegExp(q, 'i') }];
  const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit));
  const [items, total] = await Promise.all([
    Model.find(filter).populate('class', 'name academicYear').sort({ name: 1 }).skip(skip).limit(Math.min(100, Number(limit))),
    Model.countDocuments(filter)
  ]);
  res.json({ items, total, page: Number(page), limit: Math.min(100, Number(limit)) });
}

export async function createPerson(req, res) {
  const Model = modelFor(req.params.type);
  if (!Model) return res.status(404).json({ message: 'Unknown people type' });
  const person = await Model.create(req.body);
  await audit(req, 'create', req.params.type === 'students' ? 'Student' : 'Staff', person._id, undefined, person.toObject());
  res.status(201).json({ item: person });
}

export async function updatePerson(req, res) {
  const Model = modelFor(req.params.type);
  if (!Model) return res.status(404).json({ message: 'Unknown people type' });
  const before = await Model.findById(req.params.id);
  if (!before) return res.status(404).json({ message: 'Record not found' });
  if (req.user.role === 'teacher' && req.params.type === 'students' && !req.user.assignedClasses.some((id) => id.equals(before.class))) return res.status(403).json({ message: 'This student is outside your assigned classes' });
  Object.assign(before, req.body);
  await before.save();
  await audit(req, 'update', req.params.type === 'students' ? 'Student' : 'Staff', before._id, before.toObject(), req.body);
  res.json({ item: before });
}

export async function deletePerson(req, res) {
  const Model = modelFor(req.params.type);
  if (!Model) return res.status(404).json({ message: 'Unknown people type' });
  const person = await Model.findById(req.params.id);
  if (!person) return res.status(404).json({ message: 'Record not found' });
  person.status = 'inactive';
  await person.save();
  await audit(req, 'deactivate', req.params.type === 'students' ? 'Student' : 'Staff', person._id, { status: 'active' }, { status: 'inactive' });
  res.status(204).end();
}
