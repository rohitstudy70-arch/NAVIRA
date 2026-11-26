import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  channel: { type: String, enum: ['sms', 'whatsapp', 'email'], required: true },
  recipient: { type: String, required: true },
  template: String,
  payload: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
  providerMessageId: String,
  error: String,
  sentAt: Date
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
