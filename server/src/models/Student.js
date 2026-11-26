import mongoose from 'mongoose';
import { addressSchema, photoSchema } from './base.js';

const studentSchema = new mongoose.Schema({
  admissionNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  photo: photoSchema,
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  section: { type: String, required: true, trim: true },
  rollNo: { type: Number, min: 1 },
  parentName: { type: String, trim: true },
  parentPhone: { type: String, trim: true },
  parentEmail: { type: String, trim: true, lowercase: true },
  address: addressSchema,
  cardUID: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
  cardStatus: { type: String, enum: ['unassigned', 'active', 'blocked', 'replaced'], default: 'unassigned' },
  status: { type: String, enum: ['active', 'inactive', 'graduated'], default: 'active' },
  joinedAt: Date
}, { timestamps: true });

studentSchema.index({ class: 1, section: 1, rollNo: 1 });
export default mongoose.model('Student', studentSchema);
