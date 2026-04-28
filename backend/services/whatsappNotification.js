import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import Medicine from '../models/Medicine.js';
import Batch from '../models/Batch.js';
import StockLedger from '../models/StockLedger.js';
import { buildReminderMessage, normalizePhoneNumber } from '../utils/reminderHelpers.js';

let whatsappClient = null;
let isClientReady = false;
let latestQRCode = null;
let whatsappInitPromise = null;

const whatsappSessionPath = path.resolve(process.cwd(), '.wwebjs_auth', 'session-pharmacy-bot');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const destroyWhatsAppClient = async () => {
  if (!whatsappClient) {
    return;
  }

  try {
    await whatsappClient.destroy();
  } catch (err) {
    console.error('Error destroying WhatsApp client:', err.message);
  }

  whatsappClient = null;
  isClientReady = false;
  latestQRCode = null;
};

const clearWhatsAppSession = async () => {
  try {
    await fs.rm(whatsappSessionPath, { recursive: true, force: true });
    console.log('🧹 Cleared WhatsApp auth session cache');
  } catch (err) {
    console.error('Failed to clear WhatsApp auth session:', err.message);
  }
};

// ─── Initialize WhatsApp Client ───────────────────────────────────────────────
export const initializeWhatsAppClient = async (options = {}) => {
  const { force = false, resetSession = false } = options;

  if (whatsappInitPromise) {
    console.log('ℹ️  WhatsApp client initialization already in progress');
    return whatsappInitPromise;
  }

  if (whatsappClient && !force) {
    console.log('ℹ️  WhatsApp client already initialized');
    return;
  }

  whatsappInitPromise = (async () => {
    try {
      if (whatsappClient && force) {
        await destroyWhatsAppClient();
        await sleep(1500);
      }

      if (resetSession) {
        await destroyWhatsAppClient();
        await clearWhatsAppSession();
        await sleep(1500);
      }

      const buildClient = () => {
        const browserPath = process.platform === 'win32' ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
        ].find(p => existsSync(p)) : undefined;

        whatsappClient = new Client({
          authStrategy: new LocalAuth({
            clientId: 'pharmacy-bot'
          }),
          webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
          },
          puppeteer: {
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-gpu',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote'
            ],
            timeout: 120000,
            executablePath: browserPath
          }
        });

        whatsappClient.on('qr', async (qr) => {
          console.log('\n📱 WhatsApp QR Code generated. Scanning with phone...');
          try {
            latestQRCode = await qrcode.toDataURL(qr);
            console.log('✅ QR Code image generated successfully');
          } catch (err) {
            console.error('Failed to convert QR to image:', err.message);
            latestQRCode = `data:image/svg+xml;base64,${Buffer.from(qr).toString('base64')}`;
          }
          const setupPort = process.env.PORT || 5000;
          console.log(`ℹ️  Open http://localhost:${setupPort}/api/notifications/qr to view QR code and scan with your phone\n`);
        });

        whatsappClient.on('ready', () => {
          isClientReady = true;
          console.log('✅ WhatsApp Client is ready! Connected and authenticated.');
          console.log('📱 You can now send WhatsApp stock reports!');
        });

        whatsappClient.on('auth_failure', async (msg) => {
          console.error('❌ WhatsApp auth failed:', msg);
          isClientReady = false;
          latestQRCode = null;
        });

        whatsappClient.on('disconnected', () => {
          console.warn('⚠️  WhatsApp disconnected');
          isClientReady = false;
          whatsappClient = null;
        });

        whatsappClient.on('error', (err) => {
          console.error('❌ WhatsApp client error:', err.message);
        });
      };

      const attemptInitialize = async () => {
        buildClient();

        const initTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Initialization timeout - took longer than 120 seconds')), 120000)
        );

        await Promise.race([whatsappClient.initialize(), initTimeout]);
        console.log('✅ WhatsApp client initialized successfully');
      };

      try {
        console.log('🔄 Initializing WhatsApp Web client (this may take 30-60 seconds)...');
        await attemptInitialize();
      } catch (firstErr) {
        const retryable = /already running|userDataDir|session-pharmacy-bot|Target closed/i.test(firstErr.message);

        if (!retryable) {
          throw firstErr;
        }

        console.warn('⚠️  WhatsApp browser lock detected, retrying with a clean session...');
        await destroyWhatsAppClient();
        await clearWhatsAppSession();
        await sleep(2000);

        console.log('🔄 Retrying WhatsApp Web client initialization...');
        await attemptInitialize();
      }
    } catch (err) {
      console.error('❌ Failed to initialize WhatsApp client:', err.message);
      console.error('💡 Troubleshooting tips:');
      console.error('   - Make sure Chromium/Chrome is installed');
      console.error(`   - Check if port ${process.env.PORT || 5000} is available`);
      console.error('   - Restart the server and try again');

      await destroyWhatsAppClient();
      throw err;
    } finally {
      whatsappInitPromise = null;
    }
  })();

  return whatsappInitPromise;
};

// ─── Get WhatsApp Client Status ───────────────────────────────────────────────
export const getWhatsAppStatus = () => {
  return {
    connected: isClientReady,
    initialized: !!whatsappClient
  };
};

// ─── Get Latest QR Code Image ─────────────────────────────────────────────────
export const getQRCodeImage = () => {
  return latestQRCode;
};

export const getWhatsAppQRCodeState = () => {
  return {
    connected: isClientReady,
    initialized: !!whatsappClient,
    qrImage: latestQRCode,
  };
};

// ─── Disconnect WhatsApp Client ──────────────────────────────────────────────
export const disconnectWhatsApp = async () => {
  if (whatsappClient) {
    await whatsappClient.destroy();
    whatsappClient = null;
    isClientReady = false;
    latestQRCode = null;
    console.log('🛑 WhatsApp client disconnected');
  }
};

export const resetWhatsAppClient = async () => {
  if (whatsappClient) {
    try {
      await whatsappClient.destroy();
    } catch (err) {
      console.error('Error destroying WhatsApp client during reset:', err.message);
    }
  }

  whatsappClient = null;
  isClientReady = false;
  latestQRCode = null;
  await clearWhatsAppSession();
};

// ─── Gather stock snapshot ──────────────────────────────────────────────────────
export const getStockSnapshot = async () => {
  const medicines = await Medicine.find({ discontinued: { $ne: true } }).lean();
  if (medicines.length === 0) return null;

  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const medicineIds = medicines.map(m => m._id);

  const [allBatches, ledgerBalances] = await Promise.all([
    Batch.find({ medicineId: { $in: medicineIds } }).lean(),
    StockLedger.aggregate([
      { $match: { medicineId: { $in: medicineIds } } },
      { $group: { _id: '$batchId', quantity: { $sum: '$quantity' } } },
    ]),
  ]);

  const balanceMap = new Map(ledgerBalances.map(l => [l._id.toString(), l.quantity || 0]));
  const batchesByMed = new Map();
  for (const b of allBatches) {
    const key = b.medicineId.toString();
    if (!batchesByMed.has(key)) batchesByMed.set(key, []);
    batchesByMed.get(key).push(b);
  }

  const healthy = [];
  const lowStock = [];
  const expiringSoon = [];
  const expired = [];

  for (const med of medicines) {
    const batches = batchesByMed.get(med._id.toString()) || [];
    const totalStock = batches.reduce((sum, b) => sum + (balanceMap.get(b._id.toString()) || 0), 0);
    const minLevel = med.minStockLevel || 0;

    // Expired batches with stock
    const expiredBatches = batches.filter(b => new Date(b.expiryDate) < now && (balanceMap.get(b._id.toString()) || 0) > 0);
    if (expiredBatches.length > 0) {
      const qty = expiredBatches.reduce((s, b) => s + (balanceMap.get(b._id.toString()) || 0), 0);
      expired.push({ name: med.name, qty, batches: expiredBatches.length });
      continue;
    }

    // Expiring soon (within 30 days)
    const soonBatches = batches.filter(b => {
      const exp = new Date(b.expiryDate);
      return exp >= now && exp <= in30Days && (balanceMap.get(b._id.toString()) || 0) > 0;
    });
    if (soonBatches.length > 0) {
      const earliest = soonBatches.reduce((min, b) => new Date(b.expiryDate) < new Date(min.expiryDate) ? b : min, soonBatches[0]);
      const daysLeft = Math.ceil((new Date(earliest.expiryDate) - now) / (1000 * 60 * 60 * 24));
      expiringSoon.push({ name: med.name, qty: totalStock, daysLeft });
      continue;
    }

    // Low stock
    if (minLevel > 0 && totalStock < minLevel) {
      lowStock.push({ name: med.name, qty: totalStock, minLevel });
      continue;
    }

    // Healthy
    if (totalStock > 0) {
      healthy.push({ name: med.name, qty: totalStock });
    }
  }

  return { healthy, lowStock, expiringSoon, expired, total: medicines.length };
};

// ─── Format WhatsApp message ────────────────────────────────────────────────────
const formatWhatsAppMessage = (snapshot) => {
  const { healthy, lowStock, expiringSoon, expired, total } = snapshot;
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let msg = `📦 *PHARMACY STOCK REPORT*\n`;
  msg += `📅 ${date} | 🕐 ${time}\n`;
  msg += `Total Medicines: *${total}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;

  // Expired
  if (expired.length > 0) {
    msg += `\n🔴 *EXPIRED (${expired.length})*\n`;
    expired.forEach(i => {
      msg += `  • *${i.name}*: ${i.qty} units (${i.batches} batch${i.batches > 1 ? 'es' : ''})\n`;
    });
  }

  // Low stock
  if (lowStock.length > 0) {
    msg += `\n🟠 *LOW STOCK (${lowStock.length})*\n`;
    lowStock.forEach(i => {
      msg += `  • *${i.name}*: ${i.qty}/${i.minLevel} units\n`;
    });
  }

  // Expiring soon
  if (expiringSoon.length > 0) {
    msg += `\n🟡 *EXPIRING SOON (${expiringSoon.length})*\n`;
    expiringSoon.forEach(i => {
      msg += `  • *${i.name}*: ${i.qty} units (${i.daysLeft}d left)\n`;
    });
  }

  // Healthy
  msg += `\n✅ *HEALTHY STOCK (${healthy.length})*\n`;
  if (healthy.length > 0) {
    healthy.forEach(i => {
      msg += `  • *${i.name}*: ${i.qty} units\n`;
    });
  }

  // Summary line
  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `✅ ${healthy.length} healthy | 🟠 ${lowStock.length} low | 🟡 ${expiringSoon.length} expiring | 🔴 ${expired.length} expired`;

  return msg;
};

// ─── Send WhatsApp Message ──────────────────────────────────────────────────────
export const sendStockWhatsApp = async () => {
  const phoneNumber = process.env.WHATSAPP_PHONE_NUMBER;
  if (!phoneNumber) {
    throw new Error('WHATSAPP_PHONE_NUMBER must be set in .env (format: 919876543210)');
  }

  const snapshot = await getStockSnapshot();
  if (!snapshot) {
    console.log('📭 No medicines found, skipping WhatsApp');
    return { skipped: true };
  }

  const message = formatWhatsAppMessage(snapshot);
  const result = await sendWhatsAppMessage(phoneNumber, message);
  console.log(`✅ WhatsApp message sent: ${result.id}`);
  return { id: result.id, snapshot, timestamp: result.timestamp };
};

// ─── Get QR Code for WhatsApp Authentication ───────────────────────────────────
export const getWhatsAppQR = async () => {
  if (!whatsappClient) {
    await initializeWhatsAppClient();
  }

  if (isClientReady) {
    return { ready: true, message: 'WhatsApp client is already authenticated' };
  }

  return { ready: false, message: 'Waiting for QR code scan...' };
};

export const sendWhatsAppMessage = async (phoneNumber, message) => {
  if (!isClientReady) {
    throw new Error('WhatsApp client is not connected. Please scan QR code at /api/notifications/qr');
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhone) {
    throw new Error('Valid phone number is required');
  }

  try {
    const result = await whatsappClient.sendMessage(`${normalizedPhone}@c.us`, message);
    return { id: result.id._serialized, timestamp: new Date() };
  } catch (err) {
    throw new Error(`Failed to send WhatsApp message: ${err.message}`);
  }
};

export const sendReminderWhatsApp = async (reminder) => {
  const message = buildReminderMessage(reminder);
  return sendWhatsAppMessage(reminder.userPhone, message);
};
