import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import Staff from '../models/Staff.js';
import Student from '../models/Student.js';
import Device from '../models/Device.js';
import Setting from '../models/Setting.js';

async function seed() {
  await connectDatabase();
  const setting = await Setting.findOne() || await Setting.create({ schoolName: 'Navira School', academicYear: '2026-2027' });
  let classTen = await Class.findOne({ name: '10', academicYear: setting.academicYear });
  if (!classTen) classTen = await Class.create({ name: '10', academicYear: setting.academicYear, sections: [{ name: 'A', capacity: 40 }, { name: 'B', capacity: 40 }] });
  let teacher = await Staff.findOne({ employeeNo: 'NAV-STAFF-001' });
  if (!teacher) teacher = await Staff.create({ employeeNo: 'NAV-STAFF-001', name: 'Anita Sharma', department: 'Academics', designation: 'Class Teacher', phone: '9876543210', email: 'anita@naviraschool.edu', cardUID: 'STAFF-A1B2C3D4', cardStatus: 'active', shift: { name: 'Day', startTime: '07:45', endTime: '15:30', lateCutoff: '08:15' } });
  await Class.updateOne({ _id: classTen._id, 'sections.name': 'A' }, { $set: { 'sections.$.classTeacher': teacher._id } });
  const student = await Student.findOne({ admissionNo: 'NAV-2026-0001' });
  if (!student) await Student.create({ admissionNo: 'NAV-2026-0001', name: 'Aarav Kumar', class: classTen._id, section: 'A', rollNo: 1, parentName: 'Rohit Kumar', parentPhone: '9876543211', parentEmail: 'parent@example.com', cardUID: 'A1B2C3D4', cardStatus: 'active' });
  const adminEmail = 'admin@naviraschool.edu';
  let admin = await User.findOne({ email: adminEmail }).select('+password');
  if (!admin) admin = await User.create({ name: 'Navira Super Admin', email: adminEmail, password: 'ChangeMe123!', role: 'super_admin' });
  const deviceId = 'GATE01';
  if (!await Device.findOne({ deviceId })) await Device.create({ deviceId, name: 'Main Gate Reader', location: 'Main Entrance', direction: 'auto', apiKeyHash: await bcrypt.hash('navira-demo-device-key-change-me', 12) });
  console.log('\nSeed data is ready.');
  console.log(`Super Admin: ${adminEmail} / ChangeMe123!`);
  console.log('Demo RFID device: GATE01 / navira-demo-device-key-change-me');
  console.log('Demo student card: A1B2C3D4');
  process.exit(0);
}
seed().catch((error) => { console.error(error); process.exit(1); });
