export const normalizePhoneNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('91') && digits.length >= 12) {
    return digits;
  }

  if (digits.length === 10) {
    const countryCode = String(process.env.DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '') || '91';
    return `${countryCode}${digits}`;
  }

  if (digits.startsWith('0') && digits.length > 10) {
    return digits.replace(/^0+/, '');
  }

  return digits;
};

export const calculateNextRunAt = (reminderTime, repeatMode = 'daily', fromDate = new Date()) => {
  const timeMatch = String(reminderTime || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return null;

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
    return null;
  }

  const nextRun = new Date(fromDate);
  nextRun.setSeconds(0, 0);
  nextRun.setHours(hours, minutes, 0, 0);

  if (nextRun <= fromDate) {
    const advanceDays = repeatMode === 'weekly' ? 7 : 1;
    nextRun.setDate(nextRun.getDate() + advanceDays);
  }

  return nextRun;
};

export const buildReminderMessage = (reminder) => {
  const sections = [
    '⏰ *MEDICINE REMINDER*',
    `👤 Patient: *${reminder.userName}*`,
    `💊 Medicine: *${reminder.medicineName}*`,
    reminder.dosage ? `🧪 Dosage: ${reminder.dosage}` : null,
    `🕒 Time: ${reminder.reminderTime}`,
    `🔁 Repeat: ${String(reminder.repeatMode || 'daily').toUpperCase()}`,
    reminder.notes ? `📝 Notes: ${reminder.notes}` : null,
    '',
    'Please take your medicine on time.'
  ].filter(Boolean);

  return sections.join('\n');
};