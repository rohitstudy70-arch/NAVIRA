import User, { ROLES } from '../models/User.js';
import { audit } from '../utils/audit.js';

export async function listUsers(req, res) {
  const items = await User.find().populate('staff', 'name employeeNo').populate('assignedClasses', 'name academicYear').sort({ createdAt: -1 });
  res.json({ items: items.map((item) => item.toSafeJSON()) });
}

export async function createUser(req, res) {
  const { name, email, password, role, staff, assignedClasses } = req.body;
  if (!ROLES.includes(role)) return res.status(400).json({ message: 'Invalid user role' });
  const item = await User.create({ name, email, password, role, staff, assignedClasses });
  await audit(req, 'create', 'User', item._id, undefined, item.toSafeJSON());
  res.status(201).json({ item: item.toSafeJSON() });
}

export async function updateUser(req, res) {
  const item = await User.findById(req.params.id).select('+password');
  if (!item) return res.status(404).json({ message: 'User not found' });
  const before = item.toSafeJSON();
  const { password, role, ...rest } = req.body;
  if (role && !ROLES.includes(role)) return res.status(400).json({ message: 'Invalid user role' });
  Object.assign(item, rest);
  if (role) item.role = role;
  if (password) item.password = password;
  await item.save();
  await audit(req, 'update', 'User', item._id, before, item.toSafeJSON());
  res.json({ item: item.toSafeJSON() });
}
