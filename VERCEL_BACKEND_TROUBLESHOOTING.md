# Backend Not Working on Vercel - Troubleshooting Guide

## 🔍 Quick Diagnostic Steps

### Step 1: Check if API is Responding
Open your browser and visit:
```
https://your-project-name.vercel.app/api/health
```

**Expected:** You should see JSON response like:
```json
{
  "status": "OK",
  "message": "Backend is running on Vercel!",
  "timestamp": "2026-03-26T...",
  "database": "configured"
}
```

**If you see error:** Continue below

---

## Common Issues & Fixes

### ❌ Issue 1: API Returns 404 (Not Found)

**Causes:**
1. API routes not registered
2. `vercel.json` routing is wrong
3. API not deployed correctly

**Fix:**
1. Check Vercel Logs:
   - Go to Dashboard → Select Project → Deploy
   - Look at Function Logs for errors
   
2. Verify `vercel.json` exists in root directory
3. Check that `/api/index.js` exists

**Command to check locally:**
```bash
curl -X GET http://localhost:3001/api/health
```

---

### ❌ Issue 2: CORS Error in Console

**Error in browser console:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Causes:**
1. CORS not configured properly
2. Frontend URL not whitelisted
3. `FRONTEND_URL` environment variable missing

**Fix:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add/Update these variables:
```
FRONTEND_URL = https://your-project-name.vercel.app
NODE_ENV = production
MONGODB_URI = your-connection-string
```

3. Redeploy project (push to GitHub)
```bash
git push origin main
```

---

### ❌ Issue 3: Database Connection Failed

**Error in Vercel Logs:**
```
MongooseError: connect ECONNREFUSED
MongoNetworkError
```

**Causes:**
1. MongoDB connection string wrong
2. MongoDB IP whitelist doesn't include Vercel IPs
3. Database down or locked

**Fix:**
1. Test connection string locally:
```bash
mongosh "mongodb+srv://username:password@cluster.mongodb.net/pharmacy"
```

2. Check MongoDB Atlas → Network Access:
   - Should allow `0.0.0.0/0` or Vercel IP ranges
   
3. Verify in Vercel → Environment Variables:
   - `MONGODB_URI` is set correctly
   - Special characters in password are URL-encoded

**Test locally with correct URI:**
```bash
# In backend folder
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/pharmacy"
npm start
```

---

### ❌ Issue 4: Frontend Calling Wrong API URL

**Browser console shows requests to:**
```
http://localhost:3001/api/...  ❌ WRONG
```

Should be:
```
https://your-project-name.vercel.app/api/...  ✓ CORRECT
```

**Fix:**
1. Check `src/lib/api.ts` - verify `VITE_API_URL` variable
2. Go to Vercel → Environment Variables
3. Add:
```
VITE_API_URL = https://your-project-name.vercel.app/api
```

4. Redeploy:
```bash
git push origin main
```

5. Clear browser cache:
   - Press `Ctrl+Shift+Delete`
   - Clear Cached Images and Files

---

### ❌ Issue 5: API Times Out or Returns 500 Error

**Causes:**
1. Function timeout too short
2. Database queries too slow
3. Missing dependencies

**Fix:**
1. Increase timeout in `vercel.json`:
```json
"maxDuration": 60
```

2. Check Vercel Logs for actual error
3. Make sure all dependencies are installed:
```bash
cd backend && npm install
git add package-lock.json
git commit -m "Update dependencies"
git push origin main
```

---

## ✅ Complete Check List

**Local Testing First:**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend  
cd backend && npm run dev

# Test in browser
http://localhost:8080/
```

If works locally, test on Vercel:

1. **Verify Deployment:**
   - [ ] Go to https://vercel.com
   - [ ] Select your project
   - [ ] Check latest deployment status (should be ✅ Success)

2. **Check Environment Variables:**
   - [ ] `VITE_API_URL` is set
   - [ ] `MONGODB_URI` is set  
   - [ ] `JWT_SECRET` is set
   - [ ] `NODE_ENV = production`
   - [ ] `FRONTEND_URL` is set

3. **Test API Endpoints:**
   - [ ] Visit `https://app.vercel.app/api/health` — should get JSON
   - [ ] Check browser DevTools Network tab
   - [ ] Verify requests are going to `/api/...`

4. **Check Logs:**
   ```bash
   # View Vercel logs in real-time
   vercel logs your-project-name
   ```

---

## 🆘 Still Not Working?

### Debug Step 1: Check Build Logs
```bash
vercel logs --tail
```

### Debug Step 2: Test with Curl
```bash
# Test health endpoint
curl -X GET https://your-project.vercel.app/api/health -v

# Test with auth header
curl -X GET https://your-project.vercel.app/api/medicines \
  -H "Authorization: Bearer your-token" -v
```

### Debug Step 3: Check Environment Variables
```bash
# Verify on Vercel (via UI)
Vercel Dashboard → Settings → Environment Variables
```

Should see:
- ✓ VITE_API_URL
- ✓ MONGODB_URI  
- ✓ JWT_SECRET
- ✓ NODE_ENV
- ✓ FRONTEND_URL

### Debug Step 4: Redeploy from Scratch
```bash
# Make sure everything is committed
git status

# Force redeploy
git commit --allow-empty -m "Force redeploy"
git push origin main

# Or redeploy from Vercel dashboard
Dashboard → Deployments → Click 3 dots → Redeploy
```

---

## 📋 Configuration Quick Reference

### Required Files
- [ ] `vercel.json` - in root
- [ ] `api/index.js` - in root/api/
- [ ] `package.json` - in root
- [ ] `backend/package.json` - in backend/
- [ ] `.env.example` - in root (for reference)

### Required Environment Variables
```
VITE_API_URL=https://your-project.vercel.app/api
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pharmacy
JWT_SECRET=your-secret-min-32-chars
NODE_ENV=production
FRONTEND_URL=https://your-project.vercel.app
```

### Frontend Code Check
File: `src/lib/api.ts`
```typescript
const DEFAULT_API_BASE_URL = 'http://localhost:3004/api';
export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL;
```

Should be using `VITE_API_URL` ✓

---

## 🔗 Useful Links

- Vercel Docs: https://vercel.com/docs
- Check Deployment: https://vercel.com/dashboard
- View Logs: Vercel Dashboard → Project → Deployments → Logs
- MongoDB Status: https://status.mongodb.com/

---

## Last Resort: Complete Redeployment

If nothing works, try complete redeployment:

```bash
# 1. Clear cache locally
rm -rf node_modules backend/node_modules
rm package-lock.json backend/package-lock.json

# 2. Fresh install
npm install
cd backend && npm install && cd ..

# 3. Test locally
npm run dev

# 4. Commit and push
git add .
git commit -m "Fresh dependencies for redeployment"
git push origin main

# 5. On Vercel dashboard:
# - Delete current project (or rename it)
# - Create new project from GitHub
# - Set environment variables again
```

---

## ⏱️ Expected Response Times

| Endpoint | First Call | Subsequent Calls |
|----------|-----------|-----------------|
| /api/health | 3-5 sec | <100ms |
| /api/medicines | 3-5 sec | 200-500ms |
| /api/auth/login | 5-8 sec | 300-600ms |

*First call is slower due to cold start on serverless*

---

## Questions to Debug

1. **Q:** Can you see `https://app.vercel.app/api/health` in browser?
   **A:** If yes → Backend works, check frontend code
   **A:** If no → Backend not deployed, check Vercel logs

2. **Q:** Does it work locally?
   **A:** Yes → Environment variable issue on Vercel
   **A:** No → Code issue, check `api/index.js`

3. **Q:** What error do you see?
   **A:** 404 → Routes not registered
   **A:** 500 → Database/code error, check logs
   **A:** CORS → CORS config issue
   **A:** Timeout → Function too slow/heavy

4. **Q:** Are environment variables set?
   **A:** Check Vercel dashboard → Settings → Environment Variables

---

**Still stuck? Share:**
- Vercel project URL
- Error message from console or logs
- Deployment log output
- Environment variables screenshot (hide secrets)
