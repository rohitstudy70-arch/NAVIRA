import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  capacity: { type: Number, min: 1 }
}, { timestamps: false });

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  academicYear: { type: String, required: true },
  sections: [sectionSchema],
  subjects: [{ name: String, code: String, teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' } }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

classSchema.index({ name: 1, academicYear: 1 }, { unique: true });
export default mongoose.model('Class', classSchema);
