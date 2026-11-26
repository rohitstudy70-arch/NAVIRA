import bcrypt from 'bcryptjs';
import Class from '../models/Class.js';
import Device from '../models/Device.js';
import Holiday from '../models/Holiday.js';
import Leave from '../models/Leave.js';
import Setting from '../models/Setting.js';
import AuditLog from '../models/AuditLog.js';
import { audit } from '../utils/audit.js';

const models = { classes: Class, holidays: Holiday, leaves: Leave };
const currentResource = (req) => req.params.resource || req.path.split('/').filter(Boolean)[0];
export async function listResource(req, res) {
  const Model = models[currentResource(req)];
  if (!Model) return res.status(404).json({ message: 'Resource not found' });
  const items = await Model.find().sort({ createdAt: -1 }).populate('person reviewedBy classTeacher sections.classTeacher');
  res.json({ items });
}
export async function createResource(req, res) {
  const Model = models[currentResource(req)];
  if (!Model) return res.status(404).json({ message: 'Resource not found' });
  const item = await Model.create(req.body);
  await audit(req, 'create', Model.modelName, item._id, undefined, item.toObject());
  res.status(201).json({ item });
}
export async function updateResource(req, res) {
  const Model = models[currentResource(req)];
  if (!Model) return res.status(404).json({ message: 'Resource not found' });
  const item = await Model.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Record not found' });
  const before = item.toObject();
  Object.assign(item, req.body);
  await item.save();
  await audit(req, 'update', Model.modelName, item._id, before, item.toObject());
  res.json({ item });
}

export async function listDevices(req, res) {
  const items = await Device.find().sort({ location: 1 }).select('-apiKeyHash');
  res.json({ items });
}
export async function createDevice(req, res) {
  const { apiKey, ...deviceData } = req.body;
  if (!apiKey || apiKey.length < 16) return res.status(400).json({ message: 'Provide a device API key of at least 16 characters' });
  const item = await Device.create({ ...deviceData, deviceId: deviceData.deviceId?.toUpperCase(), apiKeyHash: await bcrypt.hash(apiKey, 12) });
  await audit(req, 'create', 'Device', item._id, undefined, { ...item.toObject(), apiKeyHash: undefined });
  res.status(201).json({ item: item.toObject({ transform: (_, ret) => { delete ret.apiKeyHash; return ret; } }) });
}
export async function updateDevice(req, res) {
  const item = await Device.findById(req.params.id).select('+apiKeyHash');
  if (!item) return res.status(404).json({ message: 'Device not found' });
  const before = item.toObject();
  const { apiKey, ...values } = req.body;
  Object.assign(item, values);
  if (apiKey) item.apiKeyHash = await bcrypt.hash(apiKey, 12);
  await item.save();
  await audit(req, 'update', 'Device', item._id, { ...before, apiKeyHash: undefined }, { ...item.toObject(), apiKeyHash: undefined });
  const out = item.toObject(); delete out.apiKeyHash;
  res.json({ item: out });
}

export async function getSettings(req, res) { res.json({ item: await Setting.findOne() || await Setting.create({}) }); }
export async function updateSettings(req, res) {
  const item = await Setting.findOne() || new Setting();
  const before = item.toObject();
  Object.assign(item, req.body);
  await item.save();
  await audit(req, 'update', 'Setting', item._id, before, item.toObject());
  res.json({ item });
}
export async function getAuditLogs(req, res) {
  const { page = 1, limit = 50 } = req.query;
  const safeLimit = Math.min(100, Number(limit));
  const [items, total] = await Promise.all([AuditLog.find().populate('actor', 'name email role').sort({ createdAt: -1 }).skip((Number(page) - 1) * safeLimit).limit(safeLimit), AuditLog.countDocuments()]);
  res.json({ items, total });
}
