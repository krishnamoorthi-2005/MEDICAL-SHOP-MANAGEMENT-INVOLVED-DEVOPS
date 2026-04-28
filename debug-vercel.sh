#!/bin/bash

# Vercel Backend Debugging Script
# This script helps identify why your backend isn't working on Vercel

echo "🔍 Medical Shop Management - Vercel Backend Debugging"
echo "======================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Local Backend
echo "📡 Test 1: Local Backend Connection"
echo "------------------------------------"
if curl -s -X GET http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✓${NC} Local backend is running on port 3001"
else
    echo -e "${RED}✗${NC} Local backend not responding (is it running?)"
    echo "   Start backend with: cd backend && npm run dev"
fi
echo ""

# Check 2: Vercel Deployment
echo "☁️  Test 2: Vercel Deployment"
echo "-----------------------------"
read -p "Enter your Vercel project name (e.g., medical-shop-management): " PROJECT_NAME

if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}✗${NC} No project name provided"
else
    VERCEL_URL="https://${PROJECT_NAME}.vercel.app"
    echo "Testing: ${VERCEL_URL}/api/health"
    
    RESPONSE=$(curl -s -X GET "${VERCEL_URL}/api/health" -w "\n%{http_code}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓${NC} Backend is responding!"
        echo "Response: $BODY"
    else
        echo -e "${RED}✗${NC} Backend returned HTTP $HTTP_CODE"
        if [ "$HTTP_CODE" = "000" ]; then
            echo "   Can't connect to Vercel. Check URL."
        fi
    fi
fi
echo ""

# Check 3: Environment Variables
echo "🔐 Test 3: Environment Variables"
echo "--------------------------------"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local file exists"
    echo "   - Check frontend API URL: grep VITE_API_URL .env.local"
else
    echo -e "${YELLOW}⚠${NC} .env.local not found (needed for local testing)"
fi

if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✓${NC} backend/.env file exists"
    echo "   - Check MongoDB URL: grep MONGODB_URI backend/.env"
else
    echo -e "${YELLOW}⚠${NC} backend/.env not found (needed for backend)"
fi
echo ""

# Check 4: Git Status
echo "📦 Test 4: Git Status"
echo "--------------------"
if git status > /dev/null 2>&1; then
    UNCOMMITTED=$(git status --short | wc -l)
    if [ "$UNCOMMITTED" -eq 0 ]; then
        echo -e "${GREEN}✓${NC} All changes committed"
    else
        echo -e "${RED}✗${NC} You have $UNCOMMITTED uncommitted changes"
        echo "   Run: git add . && git commit -m 'fix'"
    fi
else
    echo -e "${RED}✗${NC} Not a git repository"
fi
echo ""

# Check 5: API Files
echo "📄 Test 5: Required Files"
echo "------------------------"

if [ -f "vercel.json" ]; then
    echo -e "${GREEN}✓${NC} vercel.json exists"
else
    echo -e "${RED}✗${NC} vercel.json missing"
fi

if [ -f "api/index.js" ]; then
    echo -e "${GREEN}✓${NC} api/index.js exists"
else
    echo -e "${RED}✗${NC} api/index.js missing"
fi

if [ -f "src/lib/api.ts" ]; then
    if grep -q "VITE_API_URL" src/lib/api.ts; then
        echo -e "${GREEN}✓${NC} src/lib/api.ts uses VITE_API_URL"
    else
        echo -e "${YELLOW}⚠${NC} src/lib/api.ts might not use VITE_API_URL"
    fi
else
    echo -e "${RED}✗${NC} src/lib/api.ts missing"
fi
echo ""

# Check 6: Node Version
echo "🟢 Test 6: Node Version"
echo "---------------------"
node_version=$(node -v)
echo "Current Node: $node_version"
if [[ $node_version == v1[4-9]* ]] || [[ $node_version == v[2-9][0-9]* ]]; then
    echo -e "${GREEN}✓${NC} Node version is compatible"
else
    echo -e "${YELLOW}⚠${NC} Node version might be too old (need v14+)"
fi
echo ""

# Check 7: Package.json
echo "📋 Test 7: Dependencies"
echo "----------------------"
if grep -q "express" package.json backend/package.json 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Express is installed"
else
    echo -e "${RED}✗${NC} Express not found in package.json"
fi

if grep -q "mongoose" backend/package.json 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Mongoose is installed"
else
    echo -e "${YELLOW}⚠${NC} Mongoose not found (needed for MongoDB)"
fi
echo ""

# Final Recommendations
echo "💡 Recommendations"
echo "------------------"
echo "1. Check Vercel Dashboard for environment variables:"
echo "   https://vercel.com → Select Project → Settings → Environment Variables"
echo ""
echo "2. View deployment logs:"
echo "   Vercel Dashboard → Deployments → Select Latest → Function Logs"
echo ""
echo "3. Ensure these env vars are set on Vercel:"
echo "   • VITE_API_URL"
echo "   • MONGODB_URI"
echo "   • JWT_SECRET"
echo "   • FRONTEND_URL"
echo ""
echo "4. Test endpoints:"
echo "   https://${PROJECT_NAME}.vercel.app/api/health"
echo "   https://${PROJECT_NAME}.vercel.app/api/test"
echo ""
echo "5. Redeploy if you made changes:"
echo "   git push origin main"
echo ""

echo "======================================================"
echo "✨ Debugging complete!"
