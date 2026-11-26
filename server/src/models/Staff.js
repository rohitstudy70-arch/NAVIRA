import mongoose from 'mongoose';
import { addressSchema, photoSchema } from './base.js';

const staffSchema = new mongoose.Schema({
  employeeNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  photo: photoSchema,
  department: { type: String, required: true, trim: true },
  designation: { type: String, required: true, trim: true },
  phone: String,
  email: { type: String, lowercase: true, trim: true },
  address: addressSchema,
  cardUID: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
  cardStatus: { type: String, enum: ['unassigned', 'active', 'blocked', 'replaced'], default: 'unassigned' },
  shift: { name: String, startTime: String, endTime: String, lateCutoff: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

export default mongoose.model('Staff', staffSchema);
