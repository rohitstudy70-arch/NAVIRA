import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  ipAddress: { type: String, trim: true },
  apiKeyHash: { type: String, required: true, select: false },
  direction: { type: String, enum: ['in', 'out', 'auto'], default: 'auto' },
  isActive: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: false },
  lastSyncAt: Date,
  lastScanAt: Date,
  firmwareVersion: String
}, { timestamps: true });

export default mongoose.model('Device', deviceSchema);
