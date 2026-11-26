import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  personType: { type: String, enum: ['student', 'staff'], required: true },
  person: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'personModel' },
  personModel: { type: String, enum: ['Student', 'Staff'], required: true },
  fromDate: { type: String, required: true },
  toDate: { type: String, required: true },
  reason: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewerNote: String
}, { timestamps: true });

leaveSchema.index({ person: 1, fromDate: 1, toDate: 1 });
export default mongoose.model('Leave', leaveSchema);
