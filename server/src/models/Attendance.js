import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  personType: { type: String, enum: ['student', 'staff'], required: true },
  person: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'personModel' },
  personModel: { type: String, enum: ['Student', 'Staff'], required: true },
  date: { type: String, required: true }, // local school date (YYYY-MM-DD)
  status: { type: String, enum: ['present', 'absent', 'late', 'leave', 'half_day'], default: 'present' },
  inTime: Date,
  outTime: Date,
  inDevice: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  outDevice: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  scans: [{ timestamp: Date, device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' }, direction: { type: String, enum: ['in', 'out'] } }],
  manuallyChanged: { type: Boolean, default: false },
  correctionReason: String,
  correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

attendanceSchema.index({ person: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, personType: 1, status: 1 });
export default mongoose.model('Attendance', attendanceSchema);
