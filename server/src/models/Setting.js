import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  schoolName: { type: String, default: 'Navira School' },
  logoUrl: String,
  address: String,
  academicYear: { type: String, default: '2026-2027' },
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
  schoolStartTime: { type: String, default: '08:00' },
  lateCutoffTime: { type: String, default: '08:15' },
  halfDayTime: { type: String, default: '12:30' },
  absenceCutoffTime: { type: String, default: '10:00' },
  duplicateWindowSeconds: { type: Number, default: 90 },
  notifications: {
    entryEnabled: { type: Boolean, default: false },
    exitEnabled: { type: Boolean, default: false },
    absenceEnabled: { type: Boolean, default: false },
    entryTemplate: { type: String, default: '{student_name} entered school at {time} on {date}.' },
    exitTemplate: { type: String, default: '{student_name} exited school at {time} on {date}.' }
  }
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);
