import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import User from '../models/User.js';
import { audit } from '../utils/audit.js';
import Notification from '../models/Notification.js';

function signToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.isActive || !(await user.verifyPassword(password))) return res.status(401).json({ message: 'Invalid email or password' });
  user.lastLoginAt = new Date();
  await user.save();
  req.user = user;
  await audit(req, 'login', 'User', user._id, undefined, { email: user.email });
  res.json({ token: signToken(user), user: user.toSafeJSON() });
}

export async function me(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}

export async function forgotPassword(req, res) {
  const email = req.body.email?.toLowerCase().trim();
  if (!email) return res.status(400).json({ message: 'Email is required' });
  const user = await User.findOne({ email }).select('+passwordResetTokenHash');
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    // A provider worker should turn this queued message into a real email; never return rawToken from production API.
    await Notification.create({ channel: 'email', recipient: user.email, template: 'password_reset', payload: { name: user.name, resetToken: rawToken, expiresMinutes: 15 }, status: 'queued' });
  }
  res.json({ message: 'If this email exists, password-reset instructions have been queued.' });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) return res.status(400).json({ message: 'A valid reset token and an 8+ character password are required' });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } }).select('+passwordResetTokenHash');
  if (!user) return res.status(400).json({ message: 'Reset token is invalid or expired' });
  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
  res.json({ message: 'Password has been reset. You can now sign in.' });
}
