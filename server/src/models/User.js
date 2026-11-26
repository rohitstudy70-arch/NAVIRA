import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['super_admin', 'school_admin', 'principal', 'teacher', 'office_staff'];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ROLES, default: 'teacher' },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  assignedClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
  passwordChangedAt: Date,
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: Date
}, { timestamps: true });

userSchema.pre('save', async function encryptPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.verifyPassword = function verifyPassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return { id: this._id, name: this.name, email: this.email, role: this.role, assignedClasses: this.assignedClasses };
};

export default mongoose.model('User', userSchema);
