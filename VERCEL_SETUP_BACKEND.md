# Vercel Deployment - Backend Integration Setup

## Overview

This guide explains how to set up your Pharmacy Management System on Vercel with both frontend and backend working together.

## Architecture

**Frontend:** Deployed on Vercel (static + serverless functions)  
**Backend Proxy:** `/api/index.js` runs on Vercel and proxies requests to your real backend  
**Real Backend:** Runs on your own server or another hosting service

```
┌─────────────────────────────────────────────────────────┐
│  Client Browser                                          │
│  https://yourapp.vercel.app                              │
└─────────────────────────────────────────────────────────┘
         │
         │ HTTP Request to /api/*
         ▼
┌─────────────────────────────────────────────────────────┐
│  Vercel Frontend (Next.js/Vite)                          │
│  Static files + /api routes                              │
└─────────────────────────────────────────────────────────┘
         │
         │ All /api requests proxy to backend
         ▼
┌─────────────────────────────────────────────────────────┐
│  Vercel Serverless Function (/api/index.js)             │
│  Acts as API Proxy                                       │
└─────────────────────────────────────────────────────────┘
         │
         │ Forwards to backend via BACKEND_URL env var
         ▼
┌─────────────────────────────────────────────────────────┐
│  Real Backend Server (Your Choice)                       │
│  - Local VPS (Linux/Windows)                             │
│  - Render.com, Railway.app, Heroku, etc.                 │
│  - Port 3004 (default)                                   │
│  Actual API logic + MongoDB connection                   │
└─────────────────────────────────────────────────────────┘
```

## Setup Options

### Option 1: Backend on Local VPS or Own Server (RECOMMENDED FOR DEVELOPMENT)

**If you want to keep backend on your own machine or a VPS:**

1. **Make backend accessible from internet**
   - Use ngrok for local development (temporary)
   - Or port-forward your router (production)
   - Or deploy to a VPS with public IP

2. **On Vercel Dashboard:**
   - Go to your project settings
   - Environment Variables
   - Add: `BACKEND_URL=https://your-backend-domain.com` or `http://YOUR_IP:3004`

   Examples:
   ```
   BACKEND_URL=https://api.yourdomain.com
   BACKEND_URL=http://192.168.1.100:3004  (private network)
   BACKEND_URL=https://yourserver.ngrok.io (ngrok tunnel)
   ```

### Option 2: Backend on Render.com (RECOMMENDED FOR PRODUCTION)

Render.com offers free tier and is easy to set up.

1. **Push backend to GitHub** (in `/backend` directory)

2. **On Render.com:**
   - Click "New" → "Web Service"
   - Select your GitHub repository
   - Runtime: Node
   - Build command: `cd backend && npm install`
   - Start command: `cd backend && npm start`
   - Environment Variables:
     ```
     MONGODB_URI=your_mongodb_atlas_uri
     JWT_SECRET=your_jwt_secret
     PORT=3004
     NODE_ENV=production
     WHATSAPP_NOTIFICATIONS_ENABLED=false (if not configured)
     ```
   - Click "Deploy"
   - Copy the URL (something like `https://your-backend.onrender.com`)

3. **On Vercel Dashboard:**
   - Add environment variable: `BACKEND_URL=https://your-backend.onrender.com`

### Option 3: Backend on Railway (ALTERNATIVE)

Similar to Render, Railway.app is another easy option.

### Option 4: Backend on Heroku (Legacy)

Heroku free tier is discontinued, but you can use paid dynos.

## Environment Variables on Vercel

### Required:
```
BACKEND_URL=https://your-backend-url.com
```

### Optional:
```
VITE_API_URL=/api  (already set in root .env)
FRONTEND_URL=https://your-frontend.vercel.app
```

## Testing the Setup

### Test 1: Frontend deployment
```bash
npm run build
npm run preview
```

### Test 2: Health endpoint
```bash
# From your terminal
curl https://yourapp.vercel.app/api/health

# Expected response:
# {"status":"ok","message":"Pharmacy Backend API is running with MongoDB",...}
```

### Test 3: API endpoint
```bash
# Test an actual API
curl https://yourapp.vercel.app/api/medicines?limit=5
```

### Test 4: Check Vercel logs
On Vercel dashboard:
- Project → Deployments → Recent → View Logs
- Look for proxy error messages or backend connection issues

## Troubleshooting

### Problem: 502 Bad Gateway on /api/*

**Cause:** Backend URL not reachable

**Solution:**
1. Check `BACKEND_URL` environment variable on Vercel
2. Verify backend server is running
3. Check firewall/networking allows connections
4. Look at Vercel function logs for exact error

### Problem: 504 Gateway Timeout

**Cause:** Backend taking too long to respond

**Solution:**
1. Check backend performance
2. Check MongoDB connection
3. Increase timeout in `api/index.js` (currently 5 seconds)
4. Check backend logs for errors

### Problem: CORS errors in browser console

**Cause:** CORS not properly configured

**Solution:**
- The API proxy at `/api` should handle CORS automatically
- If still getting errors, check backend CORS configuration
- Update `backend/server.js` CORS origins

### Problem: Frontend still calling localhost:3004

**Cause:** Environment variables not loaded

**Solution:**
1. Check `.env` file has: `VITE_API_URL=/api`
2. Rebuild: `npm run build`
3. Redeploy to Vercel

## Local Development

### Running Everything Locally

```bash
# Terminal 1: Start backend
cd backend
npm run dev
# Backend runs on http://localhost:3004

# Terminal 2: Start frontend
npm run dev
# Frontend runs on http://localhost:5173

# Frontend will call /api/* which will proxy to localhost:3004
```

### Environment Files

**Root `.env` (for frontend):**
```
VITE_API_URL=/api
```

**`backend/.env` (for backend):**
```
PORT=3004
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## Production Checklist

- [ ] Backend deployed and running on public URL
- [ ] `BACKEND_URL` environment variable set on Vercel
- [ ] Test `/api/health` endpoint returns 200
- [ ] Test actual API calls work
- [ ] MongoDB Atlas connection working
- [ ] JWT authentication working
- [ ] CORS properly configured
- [ ] Error logs showing no backend connection issues
- [ ] Frontend correctly built and deployed

## Quick Deploy Commands

### Deploy Frontend to Vercel
```bash
git add .
git commit -m "Fix API proxy and configuration"
git push origin main
# Vercel auto-deploys on push

# Or use Vercel CLI:
vercel --prod
```

### Deploy Backend to Render
```bash
git add backend/
git commit -m "Update backend configuration for production"
git push origin main
# Render auto-deploys on push if configured

# Or use Render CLI:
render deploy --service your-service-id
```

## API Endpoints Available

Once deployed, all these endpoints are available:

```
GET    /api/health                      - Health check
GET    /api/medicines                   - List medicines
GET    /api/medicines/search?q=aspirin  - Search medicines
GET    /api/medicines/:id               - Get medicine by ID
GET    /api/prescriptions               - List prescriptions
POST   /api/prescriptions               - Create prescription
POST   /api/auth/register               - User registration
POST   /api/auth/login                  - User login
GET    /api/sales                       - Sales data (protected)
... and more
```

## Next Steps

1. **Choose hosting for backend** (Option 1-4 above)
2. **Get backend URL** from your hosting provider
3. **Add `BACKEND_URL` environment variable** on Vercel
4. **Test the health endpoint**
5. **Monitor logs** for any issues
6. **Report any 502/504 errors** with detailed logs

## Support & Issues

If you encounter issues:

1. Check Vercel deployment logs
2. Check backend server logs
3. Test backend health endpoint directly: `<BACKEND_URL>/api/health`
4. Verify environment variables are set correctly
5. Check firewall/network settings

---

**Last Updated:** 2024  
**Version:** 1.0
