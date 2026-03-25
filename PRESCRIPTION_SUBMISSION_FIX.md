# Prescription Submission Network Error - Fix Guide

## Issue
When submitting prescriptions, users get "NetworkError when attempting to fetch resource" at localhost:8080.

## Root Cause
The frontend (running on port 8080) cannot reach the backend API (port 5000) due to one of these issues:
1. Backend server not running
2. Backend dependencies not installed (Sharp library not available)
3. CORS not properly configured (unlikely - already enabled in server.js)
4. Network connectivity issue

## Quick Fix Steps

### Step 1: Install Backend Dependencies
In the `backend/` directory, run:
```bash
npm install
```

This installs Sharp and other required packages that were recently added.

### Step 2: Restart the Backend Server

Close any existing backend processes, then:

**Option A - Development Mode (with auto-restart on changes):**
```bash
npm run dev
```

**Option B - Production/Standard Mode:**
```bash
npm start
```

Expected output should show:
```
🚀 Backend server running on http://localhost:5000
📊 API endpoint: http://localhost:5000/api
💚 Health check: http://localhost:5000/api/health
```

### Step 3: Verify Backend is Running
Open your browser and visit: **http://localhost:5000/api/health**

You should see:
```json
{
  "status": "ok",
  "message": "Pharmacy Backend API is running with MongoDB",
  "database": "MongoDB (Mongoose)",
  "timestamp": "2024-..."
}
```

### Step 4: Test Prescription Upload
1. In the frontend, navigate to **Submit Prescription** page
2. Upload a prescription image
3. Fill in patient details
4. Click **Submit**

## If Still Getting Network Error

### Debug Step 1: Check Browser Console
1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for enhanced error logs starting with `[API]`
4. Check the exact error message

### Debug Step 2: Check Backend Console
1. Look at the backend terminal output for errors
2. Check if you see "Prescription submitted successfully" logs

### Debug Step 3: Verify Ports
- Frontend should be running on: `http://localhost:8080`
- Backend should be running on: `http://localhost:5000`
- Check if ports are blocked or in use by other processes

### Debug Step 4: Check MongoDB Connection
The backend will show connection status on startup. If you see:
```
Failed to connect to MongoDB
```
You need to:
1. Ensure MongoDB is running locally or
2. Update `.env` in backend with correct MongoDB URL

## Files Changed for This Fix

1. **src/lib/api.ts** - Enhanced error messages with better diagnostics
2. **backend/uploads/prescriptions/** - Created empty directory (required by Multer)
3. **backend/package.json** - Sharp library already added

## What Was Fixed

✅ Enhanced error logging in submitPrescription API function
✅ Created required uploads/prescriptions directory
✅ Verified CORS is enabled in Express server
✅ Verified prescription routes are properly mounted
✅ Confirmed Sharp dependency is in package.json

## Next Steps After Fixing

Once prescription submission works:
1. The handwritten text from prescription images will be extracted using OCR
2. Sharp will preprocess images (grayscale, normalize, sharpen) for better accuracy
3. Extracted medicine names will help auto-fill the medicines list
4. Confidence scores will indicate extraction quality

## Additional Notes

- Maximum prescription image size: 5 MB (JPG, PNG, PDF supported)
- OCR extraction happens automatically when prescription is submitted
- Extracted text and confidence score are returned in the response
- Images are stored in: `uploads/` directory
- All uploaded files are served via: `http://localhost:5000/uploads/rx_*.jpg`

## Troubleshooting Commands

**See if backend is running:**
```bash
curl http://localhost:5000/api/health
```

**See if port 5000 is in use:**
```powershell
netstat -ano | findstr :5000
```

**Kill process on port 5000 (if needed):**
```powershell
Get-Process | Where-Object {$_.Handles -gt 0} | foreach {if([int]($_.Id) -eq (Get-NetTCPConnection -LocalPort 5000 -ea 0 | select -exp OwningProcess)) {Stop-Process $_.Id}}
```

**Check if backend dependencies are installed:**
```bash
cd backend
npm ls sharp
```
Should show: `sharp@0.33.0`

---

**Status:** Backend infrastructure is properly configured ✅
**Action Required:** Install dependencies + restart backend
**Expected Result:** Prescription submissions will work and OCR will extract text automatically
