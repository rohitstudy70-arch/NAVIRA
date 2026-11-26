import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  description: String,
  academicYear: String
}, { timestamps: true });

export default mongoose.model('Holiday', holidaySchema);
