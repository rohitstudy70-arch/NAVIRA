import bcrypt from 'bcryptjs';
import Device from '../models/Device.js';
import Student from '../models/Student.js';
import Staff from '../models/Staff.js';
import Attendance from '../models/Attendance.js';
import Setting from '../models/Setting.js';
import Notification from '../models/Notification.js';
import { schoolDate, timeInSchoolZone } from '../utils/date.js';

function buildPersonResponse(person, personType) {
  return {
    id: person._id,
    name: person.name,
    photo: person.photo?.url || null,
    personType,
    class: personType === 'student' ? person.class : undefined,
    section: personType === 'student' ? person.section : undefined,
    designation: personType === 'staff' ? person.designation : undefined
  };
}

export async function scanCard(req, res) {
  const { cardUID, deviceId, timestamp } = req.body;
  const apiKey = req.get('x-device-api-key');
  if (!cardUID || !deviceId || !apiKey) return res.status(400).json({ success: false, message: 'cardUID, deviceId and x-device-api-key are required' });
  const device = await Device.findOne({ deviceId: deviceId.toUpperCase(), isActive: true }).select('+apiKeyHash');
  if (!device || !(await bcrypt.compare(apiKey, device.apiKeyHash))) return res.status(401).json({ success: false, message: 'Invalid device credentials' });
  const when = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(when.getTime())) return res.status(400).json({ success: false, message: 'timestamp must be an ISO date' });
  const uid = cardUID.trim().toUpperCase();
  let person = await Student.findOne({ cardUID: uid, cardStatus: 'active', status: 'active' }).populate('class', 'name');
  let personType = 'student';
  if (!person) {
    person = await Staff.findOne({ cardUID: uid, cardStatus: 'active', status: 'active' });
    personType = 'staff';
  }
  device.isOnline = true;
  device.lastSyncAt = new Date();
  device.lastScanAt = when;
  await device.save();
  if (!person) {
    req.app.get('io')?.emit('attendance:alert', { type: 'unregistered_card', cardUID: uid, device: { id: device.deviceId, name: device.name }, timestamp: when });
    return res.status(404).json({ success: false, code: 'CARD_NOT_REGISTERED', message: 'Card is not registered' });
  }
  const date = schoolDate(when);
  const [settings, existing] = await Promise.all([
    Setting.findOne(),
    Attendance.findOne({ person: person._id, date })
  ]);
  const duplicateSeconds = settings?.duplicateWindowSeconds ?? Number(process.env.RFID_DUPLICATE_WINDOW_SECONDS || 90);
  const lastScan = existing?.scans?.at(-1);
  if (lastScan && when.getTime() - new Date(lastScan.timestamp).getTime() < duplicateSeconds * 1000) {
    return res.json({ success: true, duplicate: true, message: 'Duplicate scan ignored', person: buildPersonResponse(person, personType), attendance: existing });
  }
  let direction = device.direction;
  if (direction === 'auto') direction = existing?.inTime && !existing?.outTime ? 'out' : 'in';
  const isLate = direction === 'in' && timeInSchoolZone(when) > (settings?.lateCutoffTime || '08:15');
  const attendance = existing || new Attendance({ personType, person: person._id, personModel: personType === 'student' ? 'Student' : 'Staff', date });
  if (direction === 'in') {
    attendance.inTime = attendance.inTime || when;
    attendance.inDevice = attendance.inDevice || device._id;
    attendance.status = isLate ? 'late' : 'present';
  } else {
    attendance.outTime = when;
    attendance.outDevice = device._id;
  }
  attendance.scans.push({ timestamp: when, device: device._id, direction });
  await attendance.save();
  const scanEvent = { attendance: await attendance.populate('person inDevice outDevice'), person: buildPersonResponse(person, personType), direction, timestamp: when, device: { id: device.deviceId, name: device.name, location: device.location } };
  req.app.get('io')?.emit('attendance:scan', scanEvent);
  if (personType === 'student' && person.parentPhone && ((direction === 'in' && settings?.notifications?.entryEnabled) || (direction === 'out' && settings?.notifications?.exitEnabled))) {
    await Notification.create({ channel: 'sms', recipient: person.parentPhone, template: direction === 'in' ? settings.notifications.entryTemplate : settings.notifications.exitTemplate, payload: { student_name: person.name, time: timeInSchoolZone(when), date }, status: 'queued' });
  }
  res.status(201).json({ success: true, duplicate: false, message: `${direction === 'in' ? 'IN' : 'OUT'} scan recorded`, direction, person: buildPersonResponse(person, personType), attendance });
}
