import cron from 'node-cron';
import { sendStockWhatsApp, getWhatsAppStatus } from './whatsappNotification.js';

let scheduledTask = null;

/**
 * Start the daily stock notification scheduler.
 * Default: every day at 9:00 AM.
 * Override with WHATSAPP_NOTIFY_CRON env var (standard cron syntax).
 * e.g. "0 9 * * *" = 9:00 AM daily
 *      "0 9,18 * * *" = 9 AM and 6 PM daily
 */
export const startStockScheduler = () => {
  if (!process.env.WHATSAPP_NOTIFICATIONS_ENABLED || process.env.WHATSAPP_NOTIFICATIONS_ENABLED !== 'true') {
    console.log('📵 WhatsApp notifications disabled (set WHATSAPP_NOTIFICATIONS_ENABLED=true to enable)');
    return;
  }

  const cronExpr = process.env.WHATSAPP_NOTIFY_CRON || '0 9 * * *';

  if (!cron.validate(cronExpr)) {
    console.error(`❌ Invalid WHATSAPP_NOTIFY_CRON expression: "${cronExpr}"`);
    return;
  }

  scheduledTask = cron.schedule(cronExpr, async () => {
    console.log(`🔔 Running daily stock notification (${new Date().toLocaleString('en-IN')})...`);
    try {
      const status = getWhatsAppStatus();
      if (!status.connected) {
        console.warn('⚠️  WhatsApp client not connected, skipping scheduled notification');
        return;
      }
      await sendStockWhatsApp();
    } catch (err) {
      console.error('❌ WhatsApp notification failed:', err.message);
    }
  }, {
    timezone: process.env.TZ || 'Asia/Kolkata',
  });

  console.log(`✅ Stock notification scheduler started — cron: "${cronExpr}", channel: WhatsApp`);
};

export const stopStockScheduler = () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('🛑 Stock scheduler stopped');
  }
};
