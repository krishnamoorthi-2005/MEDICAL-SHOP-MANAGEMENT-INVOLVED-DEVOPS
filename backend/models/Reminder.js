import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, required: true, trim: true },
  userEmail: { type: String, required: true, trim: true, lowercase: true },
  userPhone: { type: String, required: true, trim: true },
  medicineName: { type: String, required: true, trim: true },
  dosage: { type: String, default: '', trim: true },
  reminderTime: { type: String, required: true, trim: true },
  repeatMode: { type: String, enum: ['once', 'daily', 'weekly'], default: 'daily' },
  notes: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true },
  nextRunAt: { type: Date, required: true },
  lastSentAt: { type: Date, default: null },
  sentCount: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
  whatsappEnabled: { type: Boolean, default: true },
}, { timestamps: true });

reminderSchema.index({ userEmail: 1, nextRunAt: 1 });
reminderSchema.index({ userPhone: 1, nextRunAt: 1 });
reminderSchema.index({ isActive: 1, nextRunAt: 1 });

export default mongoose.model('Reminder', reminderSchema);