# WhatsApp Notification Setup Guide

## Overview
Your pharmacy management system now uses **WhatsApp.js** for direct WhatsApp notifications instead of Twilio. This eliminates SMS costs and uses WhatsApp which is more accessible in India.

---

## **Step 1: Install Dependencies**

Run this command in your backend directory:

```bash
cd backend
npm install whatsapp-web.js qrcode --save
npm install
```

This will install:
- `whatsapp-web.js` - WhatsApp Web automation
- `qrcode` - QR code generation for authentication

---

## **Step 2: Configure Environment Variables**

Open `.env` file in the backend folder and add/update these variables:

```env
# WhatsApp Stock Notifications
WHATSAPP_NOTIFICATIONS_ENABLED=true
WHATSAPP_PHONE_NUMBER=919876543210           # Your phone (country code + number, NO + sign)
WHATSAPP_NOTIFY_CRON=0 9 * * *               # Daily at 9:00 AM (cron syntax)
TZ=Asia/Kolkata                              # Timezone for scheduler
```

### **Example Indian Phone Numbers:**
- **Mumbai**: `919876543210`
- **Delhi**: `919834567890`
- **Bangalore**: `918765432109`

---

## **Step 3: Authenticate WhatsApp**

1. **Start your backend server:**
   ```bash
   npm run dev
   ```

2. **Open browser and go to:**
   ```
   http://localhost:5000/api/notifications/qr
   ```

3. **Scan the QR Code:**
   - Open WhatsApp on your phone
   - Go to **Settings → Linked Devices → Link a Device**
   - Scan the QR code shown in your browser
   - ✅ Once authenticated, the console will show: `✅ WhatsApp Client is ready!`

4. **The authentication persists** - You only need to do this once. The session is saved locally.

---

## **Step 4: Configure Cron Schedule**

Edit `.env` to set when notifications are sent:

```env
# Daily at 9:00 AM
WHATSAPP_NOTIFY_CRON=0 9 * * *

# Twice daily: 9:00 AM & 6:00 PM
WHATSAPP_NOTIFY_CRON=0 9,18 * * *

# Every 4 hours
WHATSAPP_NOTIFY_CRON=0 */4 * * *

# Every Monday at 8:30 AM
WHATSAPP_NOTIFY_CRON=30 8 * * 1
```

[Cron syntax reference](https://crontab.guru/)

---

## **Step 5: Test Manual Send**

### **Option A: Via API (Postman/cURL)**

**Send WhatsApp Message:**
```bash
curl -X POST http://localhost:5000/api/notifications/send-whatsapp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### **Option B: Via Settings UI**
1. Login to your pharmacy app
2. Go to **Settings → Stock Notifications (WhatsApp)**
3. Click **"Send WhatsApp Now"** button
4. Check your WhatsApp for the stock report

---

## **Message Format**

Stock reports are formatted as:

```
📦 *PHARMACY STOCK REPORT*
📅 25 Mar 2026 | 🕐 09:00 AM
Total Medicines: 150

━━━━━━━━━━━━━━━━━━━━

🔴 *EXPIRED (2)*
  • Paracetamol: 50 units (1 batch)
  • Aspirin: 25 units (2 batches)

🟠 *LOW STOCK (5)*
  • Amoxicillin: 30/100 units
  • Ibuprofen: 20/50 units
  ...and 3 more

🟡 *EXPIRING SOON (3)*
  • Cetirizine: 100 units (12d left)
  ...and 2 more

✅ *HEALTHY STOCK (140)*
  • Metformin: 500 units
  • Lisinopril: 300 units
  ...and 138 more

━━━━━━━━━━━━━━━━━━━━
✅ 140 healthy | 🟠 5 low | 🟡 3 expiring | 🔴 2 expired
```

---

## **API Endpoints**

### **1. Check Connection Status**
```
GET /api/notifications/status
```
Response:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "initialized": true
  }
}
```

### **2. Preview Stock Report**
```
GET /api/notifications/stock-preview
```

### **3. Send WhatsApp Notification**
```
POST /api/notifications/send-whatsapp
```

### **4. Get QR Code (Re-authenticate)**
```
GET /api/notifications/qr
```

---

## **Troubleshooting**

### **❌ "WhatsApp client not connected"**
- The QR code needs to be scanned
- Go to `http://localhost:5000/api/notifications/qr`
- Scan with WhatsApp on your phone

### **❌ "WHATSAPP_PHONE_NUMBER must be set"**
- Add to `.env`: `WHATSAPP_PHONE_NUMBER=919876543210`
- Restart your server

### **❌ Messages not sending at scheduled time**
- Check `.env`: `WHATSAPP_NOTIFICATIONS_ENABLED=true`
- Verify cron syntax at [crontab.guru](https://crontab.guru)
- Check server logs for errors
- Ensure WhatsApp is authenticated (connected)

### **❌ "Too many process instances" error**
- Restart your server: `npm run dev`
- Kill any orphaned `node` processes

### **Session Expired**
- Go to `http://localhost:5000/api/notifications/qr` again
- Scan QR code to re-authenticate

---

## **How It Works**

1. **Initialization**: When server starts, WhatsApp client is initialized using `whatsapp-web.js`
2. **Authentication**: First time requires scanning QR code (browser → phone WhatsApp)
3. **Scheduler**: `node-cron` triggers at specified times daily
4. **Stock Snapshot**: System gathers data on expired, low stock, expiring medicines
5. **Message Send**: Formatted WhatsApp message sent directly to your number
6. **Session Persistence**: Authentication saved locally - no daily re-scanning needed

---

## **Advantages Over Twilio**

✅ **No SMS costs** - WhatsApp is free  
✅ **Direct delivery** - Uses your personal WhatsApp account  
✅ **Rich formatting** - Bold, emojis, better layout  
✅ **Instant notifications** - Real-time delivery  
✅ **No API subscription** - Just WhatsApp installed  
✅ **Works worldwide** - No regional restrictions  

---

## **Disabling Notifications**

To disable automatic notifications, set in `.env`:

```env
WHATSAPP_NOTIFICATIONS_ENABLED=false
```

You can still manually send via API/UI if needed.

---

## **Need Help?**

- Check console logs: `npm run dev | grep WhatsApp`
- Check `.env` configuration
- Ensure WhatsApp is installed on your phone
- Check that your number is in E.164 format (country code + number)

---

**Last Updated**: March 2026  
**Version**: 1.0
