# 🏥 Medical Shop Management System - Complete Setup Guide

**Last Updated**: March 25, 2026  
**Version**: 1.0

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Frontend Setup](#frontend-setup)
4. [Backend Setup](#backend-setup)
5. [Database Configuration](#database-configuration)
6. [WhatsApp Notifications Setup](#whatsapp-notifications-setup)
7. [Running the Application](#running-the-application)
8. [Environment Variables](#environment-variables)
9. [Troubleshooting](#troubleshooting)
10. [Useful Commands](#useful-commands)

---

## ✅ Prerequisites

Before starting, ensure you have:

### Required Software
- **Node.js** v16+ ([Download](https://nodejs.org/))
- **npm** v8+ (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

### Accounts Needed
- **MongoDB Atlas** account ([Create Free](https://www.mongodb.com/cloud/atlas))
- **WhatsApp** (for notifications setup)

### Verify Installation
```bash
node --version          # Should be v16 or higher
npm --version          # Should be v8 or higher
git --version          # Any recent version
```

---

## 📁 Project Structure

```
medical-shop-management/
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components (FrontPage, About, Services, Contact, etc.)
│   │   ├── lib/           # API calls and utilities
│   │   ├── hooks/         # Custom React hooks
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── config/
│   │   └── database.js    # MongoDB connection
│   ├── models/            # MongoDB schemas
│   ├── controllers/       # Business logic
│   ├── routes/            # API endpoints
│   ├── middleware/        # Auth, validation, etc.
│   ├── services/          # Stock scheduler, WhatsApp, etc.
│   ├── server.js          # Express server
│   ├── package.json
│   └── .env.example       # Environment variables template
│
├── SETUP_GUIDE.md         # This file
├── WHATSAPP_SETUP_GUIDE.md
└── package.json           # Root package.json
```

---

## 🎨 Frontend Setup

### Step 1: Install Dependencies

```bash
# Navigate to root directory
cd d:\PROJECT_SECTION\medical-shop-management

# Install root dependencies
npm install

# Install frontend dependencies
npm install --prefix ./
```

### Step 2: Verify Frontend Files

Check that these pages exist in `src/pages/`:
- ✅ `FrontPage.tsx` - Landing page with vibrant green (#a7f3d0) background
- ✅ `About.tsx` - About page with dark green (#065f46) background
- ✅ `Contact.tsx` - Contact page with dark green (#065f46) background
- ✅ `Services.tsx` - Services page with vibrant green (#a7f3d0) background

### Step 3: Check API Configuration

Open `src/lib/api.ts` or similar and ensure API base URL is set:
```typescript
const API_BASE_URL = 'http://localhost:5000/api';
```

### Step 4: Run Frontend Dev Server

```bash
npm run dev
```

**Expected Output:**
```
VITE v5.0.0  ready in 123 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

Visit `http://localhost:5173/` in your browser. You should see the landing page with green background.

---

## ⚙️ Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Install Backend Dependencies

```bash
npm install
```

### Step 3: Create Environment File

Copy the example file:
```bash
# Windows PowerShell
Copy-Item .env.example .env

# Or manually create .env with content from Step 4
```

---

## 🗄️ Database Configuration

### Option A: MongoDB Atlas (Recommended - Cloud)

#### Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click **Sign Up** and create account
3. Create a new project (name: `pharmacy_project`)

#### Step 2: Create Free Cluster

1. Click **Create a Database**
2. Choose **M0 Free Tier**
3. Select provider: AWS / Google Cloud / Azure
4. Select region closest to you
5. Click **Create Cluster**
6. Wait 3-5 minutes for cluster to be ready

#### Step 3: Create Database User

1. Go to **Database Access** (left sidebar)
2. Click **Add New Database User**
3. Fill in:
   - **Username**: `pharmaadmin`
   - **Password**: Create strong password (e.g., `Secure@Pass123!`)
   - **Database User Privileges**: Select `Built-in Role` > `Atlas admin`
4. Click **Add User**

#### Step 4: Whitelist IP Address

1. Go to **Network Access** (left sidebar)
2. Click **Add IP Address**
3. Select **Add Current IP Address** (auto-detects)
   - For development: `0.0.0.0/0` (all IPs)
   - For production: Specific IPs only
4. Click **Confirm**

#### Step 5: Get Connection String

1. Go to **Clusters** > Click **Connect** on your cluster
2. Choose **Connect your application**
3. Copy the connection string
4. Format: `mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority`

#### Step 6: Add to .env File

```env
MONGODB_URI=mongodb+srv://pharmaadmin:Secure@Pass123!@pharmacy-cluster.mongodb.net/pharmacy_system?retryWrites=true&w=majority
```

---

### Option B: Local MongoDB (Compass)

#### Step 1: Install MongoDB Community

1. Download from [MongoDB Community](https://www.mongodb.com/try/download/community)
2. Run installer and follow setup
3. MongoDB runs on `mongodb://localhost:27017`

#### Step 2: Install MongoDB Compass (GUI)

1. Download from [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Install and launch
3. Connect to `mongodb://localhost:27017`

#### Step 3: Add to .env File

```env
MONGODB_URI=mongodb://localhost:27017/pharmacy_system
```

---

## 📱 WhatsApp Notifications Setup

### Step 1: Install Dependencies

```bash
cd backend
npm install whatsapp-web.js qrcode --save
npm install
```

### Step 2: Configure Environment Variables

Add to `backend/.env`:

```env
# WhatsApp Stock Notifications
WHATSAPP_NOTIFICATIONS_ENABLED=true
WHATSAPP_PHONE_NUMBER=919876543210        # Your phone number (no + sign)
WHATSAPP_NOTIFY_CRON=0 9 * * *            # Daily at 9 AM
TZ=Asia/Kolkata                            # Timezone
```

**Note**: Replace `919876543210` with your actual phone number in E.164 format.

### Step 3: Authenticate WhatsApp

1. Start backend server:
```bash
npm run dev
```

2. Open in browser:
```
http://localhost:5000/api/notifications/qr
```

3. Scan QR code with WhatsApp:
   - Open WhatsApp on phone
   - Go to **Settings → Linked Devices → Link a Device**
   - Scan QR code shown in browser

4. Verify in console:
```
✅ WhatsApp Client is ready!
✅ Stock notification scheduler started
```

### Step 4: Test Manual Send (Optional)

```bash
# Via API
curl -X POST http://localhost:5000/api/notifications/send-whatsapp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 🚀 Running the Application

### Individual Development Mode

**Terminal 1 - Frontend:**
```bash
# From root directory
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

### Or Use Batch Scripts (Windows)

**Start Everything:**
```bash
# From root directory (Windows PowerShell)
.\START_BACKEND.bat
```

Then in another terminal:
```bash
npm run dev
```

### Expected Startup Messages

**Frontend console:**
```
VITE v5.0.0  ready in 123 ms
➜  Local:   http://localhost:5173/
```

**Backend console:**
```
✅ Connected to MongoDB via Mongoose
📦 Database name: pharmacy_system
Server is running on port 5000
```

---

## 🔑 Environment Variables

### Complete .env Template

Create `backend/.env` with these variables:

```env
# ============ DATABASE ============
# MongoDB Atlas (Cloud - Recommended)
MONGODB_URI=mongodb+srv://username:password@cluster-name.mongodb.net/pharmacy_system?retryWrites=true&w=majority

# MongoDB Local (Compass)
# MONGODB_URI=mongodb://localhost:27017/pharmacy_system

# ============ SERVER ============
PORT=5000
JWT_SECRET=your_super_secret_key_change_this_in_production

# ============ WHATSAPP NOTIFICATIONS ============
WHATSAPP_NOTIFICATIONS_ENABLED=true
WHATSAPP_PHONE_NUMBER=919876543210           # Your phone (country code + number, no + sign)
WHATSAPP_NOTIFY_CRON=0 9 * * *               # Daily at 9:00 AM (cron syntax)
TZ=Asia/Kolkata                              # Timezone for scheduler
```

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | Database connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `PORT` | Server port | `5000` |
| `JWT_SECRET` | JWT signing secret | `your_secret_key` |
| `WHATSAPP_NOTIFICATIONS_ENABLED` | Enable WhatsApp notifications | `true` or `false` |
| `WHATSAPP_PHONE_NUMBER` | Your phone for notifications | `919876543210` |
| `WHATSAPP_NOTIFY_CRON` | Schedule for notifications | `0 9 * * *` |
| `TZ` | Timezone | `Asia/Kolkata` |

---

## 🧪 Verify Setup

### Check Frontend

✅ Visit `http://localhost:5173/`

Should see:
- Green landing page with "Your Pharmacy, Simplified" heading
- Navigation: Home, About, Services, Contact
- Professional pharmacy branding

### Check Backend

✅ Visit `http://localhost:5000/api/health`

Should return:
```json
{
  "success": true,
  "message": "API is healthy and running",
  "database": "connected"
}
```

### Check Database

✅ MongoDB Atlas:
- Go to cluster → Collections
- Should see `pharmacy_system` database

✅ MongoDB Compass (Local):
- Should show `pharmacy_system` database

### Check WhatsApp

✅ Backend console should show:
```
✅ WhatsApp Client is ready!
✅ Stock notification scheduler started
```

---

## 🐛 Troubleshooting

### Frontend Won't Start

**Error**: `VITE fails to start`

**Solution:**
```bash
# Clear node_modules and reinstall
rm -r node_modules
npm install
npm run dev
```

### MongoDB Connection Failed

**Error**: `MONGO_URI environment variable is required`

**Solution:**
1. Verify `.env` file exists in `backend/` directory
2. Check `MONGODB_URI` is set correctly
3. For Atlas: Verify IP is whitelisted in Network Access
4. For Local: Ensure MongoDB service is running

```bash
# Test connection
node -e "console.log(process.env.MONGODB_URI)"
```

### Backend Port Already in Use

**Error**: `Error: listen EADDRINUSE :::5000`

**Solution:**
```bash
# Kill process on port 5000 (Windows PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force

# Or change port in .env
PORT=5001
```

### WhatsApp QR Code Not Appearing

**Error**: `Cannot GET /api/notifications/qr`

**Solution:**
1. Ensure backend is running: `npm run dev`
2. Check console for errors
3. Verify WhatsApp routes are loaded
4. Check `WHATSAPP_NOTIFICATIONS_ENABLED=true` in .env

### JWT Authentication Errors

**Error**: `jwt malformed` or `jwt expired`

**Solution:**
1. Check `JWT_SECRET` is set in `.env`
2. Clear browser localStorage: `localStorage.clear()`
3. Re-login to get new token

### API CORS Errors

**Error**: `Access to XMLHttpRequest blocked by CORS`

**Solution:**
1. Verify backend is running on `http://localhost:5000`
2. Frontend API URL in `src/lib/api.ts` matches backend URL
3. Check CORS is enabled in `backend/server.js`:
   ```javascript
   app.use(cors());
   ```

---

## 📚 Useful Commands

### Frontend Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code (if ESLint configured)
npm run lint
```

### Backend Commands

```bash
# Development server with auto-reload
npm run dev

# Start server (production)
node server.js

# Run tests
npm test
```

### Database Commands

```bash
# MongoDB Atlas - View data
# Go to: https://cloud.mongodb.com/v2/.../#/clusters

# MongoDB Local - View data
# Open MongoDB Compass and connect to mongodb://localhost:27017
```

### Git Commands

```bash
# Clone repository
git clone <repository-url>
cd medical-shop-management

# Create new branch
git checkout -b feature/your-feature

# Commit changes
git add .
git commit -m "Your message"

# Push to GitHub
git push origin feature/your-feature
```

---

## 🎯 Common Tasks

### Add New Medicine to Database

1. Visit `http://localhost:5173/admin/medicines` (if logged in)
2. Click "Add Medicine"
3. Fill form:
   - Name: `Paracetamol`
   - Generic: `Acetaminophen`
   - Manufacturer: `ABC Pharma`
   - Price: `50`
4. Click "Save"
5. Medicine appears in database and search

### Create New User

**Via API:**
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user@email.com","password":"pass123","role":"pharmacist"}'
```

### Backup Database

**MongoDB Atlas:**
1. Go to cluster → Backup
2. Click "Backup Now"

**MongoDB Local:**
```bash
mongodump --db pharmacy_system --out ./backup
```

---

## 📞 Support

### Quick Links

- **MongoDB Docs**: https://docs.mongodb.com/
- **Express Docs**: https://expressjs.com/
- **React Docs**: https://react.dev/
- **Vite Docs**: https://vitejs.dev/
- **WhatsApp API**: https://www.whatsapp.com/business/

### Getting Help

1. Check the [Troubleshooting](#troubleshooting) section
2. Review error messages in console
3. Check `.env` configuration
4. Verify all prerequisites are installed
5. Restart services (frontend and backend)

---

## ✨ Next Steps After Setup

1. ✅ Create your first admin user
2. ✅ Add medicines to inventory
3. ✅ Configure WhatsApp notifications
4. ✅ Test all API endpoints
5. ✅ Set up automated backups
6. ✅ Deploy to production (optional)

---

## 🔐 Security Checklist

Before going to production:

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Set strong MongoDB password (20+ characters)
- [ ] Whitelist specific IPs in MongoDB Atlas (not 0.0.0.0/0)
- [ ] Use HTTPS in production
- [ ] Enable rate limiting
- [ ] Rotate database credentials periodically
- [ ] Enable database backups
- [ ] Use environment variables for all secrets
- [ ] Don't commit `.env` to Git
- [ ] Review user permissions and roles

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Mar 25, 2026 | Initial setup guide with Atlas, WhatsApp, and full configuration |

---

**Setup Complete! 🎉**

Your medical shop management system is ready to use!
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Database: MongoDB Atlas or Local Compass
- Notifications: WhatsApp ready
