import Reminder from '../models/Reminder.js';
import { calculateNextRunAt, normalizePhoneNumber } from '../utils/reminderHelpers.js';

const formatReminder = (reminder) => ({
  ...reminder,
  id: reminder._id.toString(),
});

const getUserContext = (req) => ({
  userId: req.user?.id || null,
  userName: req.user?.fullName || req.user?.email?.split('@')[0] || 'User',
  userEmail: (req.user?.email || '').trim().toLowerCase(),
});

export const listMyReminders = async (req, res) => {
  try {
    const { userEmail } = getUserContext(req);
    const phone = normalizePhoneNumber(req.user?.phone || req.query.phone || '');

    const query = {
      $or: [{ userEmail }],
    };

    if (phone) {
      query.$or.push({ userPhone: phone });
    }

    const reminders = await Reminder.find(query).sort({ nextRunAt: 1, createdAt: -1 }).lean();
    res.json({
      success: true,
      data: reminders.map(formatReminder),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reminders', error: error.message });
  }
};

export const createReminder = async (req, res) => {
  try {
    const { userId, userName, userEmail } = getUserContext(req);
    const {
      medicineName,
      dosage = '',
      reminderTime,
      repeatMode = 'daily',
      notes = '',
      userPhone,
    } = req.body || {};

    const normalizedPhone = normalizePhoneNumber(userPhone || req.user?.phone || '');

    if (!medicineName || !reminderTime || !normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name, reminder time, and phone number are required',
      });
    }

    const nextRunAt = calculateNextRunAt(reminderTime, repeatMode);
    if (!nextRunAt) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder time. Use HH:mm format.',
      });
    }

    const reminder = await Reminder.create({
      userId,
      userName,
      userEmail,
      userPhone: normalizedPhone,
      medicineName: medicineName.trim(),
      dosage: dosage.trim(),
      reminderTime: reminderTime.trim(),
      repeatMode,
      notes: notes.trim(),
      nextRunAt,
      whatsappEnabled: true,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: formatReminder(reminder.toObject()),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create reminder', error: error.message });
  }
};

export const updateReminderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    const reminder = await Reminder.findByIdAndUpdate(
      id,
      { isActive: Boolean(isActive) },
      { new: true }
    ).lean();

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.json({
      success: true,
      message: 'Reminder updated successfully',
      data: formatReminder(reminder),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update reminder', error: error.message });
  }
};

export const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;

    const reminder = await Reminder.findByIdAndDelete(id).lean();
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete reminder', error: error.message });
  }
};

export const getDueReminders = async (limit = 25) => {
  const now = new Date();
  return Reminder.find({
    isActive: true,
    whatsappEnabled: true,
    nextRunAt: { $lte: now },
  })
    .sort({ nextRunAt: 1 })
    .limit(limit)
    .lean();
};

export const rescheduleReminderAfterSend = async (reminder, sentAt = new Date()) => {
  if (reminder.repeatMode === 'once') {
    return Reminder.findByIdAndUpdate(reminder._id, {
      isActive: false,
      lastSentAt: sentAt,
      sentCount: (reminder.sentCount || 0) + 1,
      lastError: '',
    });
  }

  const nextRunAt = calculateNextRunAt(reminder.reminderTime, reminder.repeatMode, sentAt);
  return Reminder.findByIdAndUpdate(reminder._id, {
    nextRunAt: nextRunAt || reminder.nextRunAt,
    lastSentAt: sentAt,
    sentCount: (reminder.sentCount || 0) + 1,
    lastError: '',
  });
};

export const recordReminderFailure = async (reminder, errorMessage) => {
  return Reminder.findByIdAndUpdate(reminder._id, {
    lastError: errorMessage,
  });
};