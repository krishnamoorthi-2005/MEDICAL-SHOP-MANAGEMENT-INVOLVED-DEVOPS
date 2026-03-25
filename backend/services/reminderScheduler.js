import cron from 'node-cron';
import { getWhatsAppStatus, sendReminderWhatsApp } from './whatsappNotification.js';
import { getDueReminders, recordReminderFailure, rescheduleReminderAfterSend } from '../controllers/reminderController.js';

let scheduledTask = null;

export const startReminderScheduler = () => {
  if (!process.env.WHATSAPP_NOTIFICATIONS_ENABLED || process.env.WHATSAPP_NOTIFICATIONS_ENABLED !== 'true') {
    console.log('📵 Reminder scheduler disabled because WhatsApp notifications are off');
    return;
  }

  const cronExpr = process.env.REMINDER_NOTIFY_CRON || '* * * * *';
  if (!cron.validate(cronExpr)) {
    console.error(`❌ Invalid REMINDER_NOTIFY_CRON expression: "${cronExpr}"`);
    return;
  }

  scheduledTask = cron.schedule(cronExpr, async () => {
    try {
      const status = getWhatsAppStatus();
      if (!status.connected) {
        console.warn('⚠️  WhatsApp client not connected, skipping reminder dispatch');
        return;
      }

      const dueReminders = await getDueReminders();
      if (dueReminders.length === 0) {
        return;
      }

      for (const reminder of dueReminders) {
        try {
          await sendReminderWhatsApp(reminder);
          await rescheduleReminderAfterSend(reminder, new Date());
          console.log(`✅ Reminder sent for ${reminder.medicineName} to ${reminder.userPhone}`);
        } catch (error) {
          await recordReminderFailure(reminder, error.message);
          console.error(`❌ Failed to send reminder ${reminder._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Reminder scheduler error:', error.message);
    }
  }, {
    timezone: process.env.TZ || 'Asia/Kolkata',
  });

  console.log(`✅ Reminder scheduler started — cron: "${cronExpr}", channel: WhatsApp`);
};

export const stopReminderScheduler = () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('🛑 Reminder scheduler stopped');
  }
};