#!/usr/bin/env bash
# 🚀 ONE-COMMAND RAILWAY DEPLOYMENT
# Copy & paste this entire script into your terminal

echo "════════════════════════════════════════════════════"
echo "   🚀 TREND HIJACKER - RAILWAY DEPLOYMENT SCRIPT 🚀"
echo "════════════════════════════════════════════════════"
echo ""

# Step 1: Login to Railway
echo "📍 Step 1/5: Logging into Railway..."
echo "   → Your browser will open to authorize with GitHub"
echo ""
railway login

echo ""
echo "✅ Step 1 Complete!"
echo ""

# Step 2: Initialize Project
echo "📍 Step 2/5: Initializing Railway project..."
echo "   → Project name: trend-hijacker"
echo ""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
railway init

echo ""
echo "✅ Step 2 Complete!"
echo ""

# Step 3: Add PostgreSQL
echo "📍 Step 3/5: Adding PostgreSQL database..."
echo "   → ⏱️  This may take a minute..."
echo ""
railway add postgres 2>/dev/null || echo "PostgreSQL might already be added"

echo ""
echo "✅ Step 3 Complete!"
echo ""

# Step 4: Add Redis
echo "📍 Step 4/5: Adding Redis cache..."
echo "   → ⏱️  This may take a minute..."
echo ""
railway add redis 2>/dev/null || echo "Redis might already be added"

echo ""
echo "✅ Step 4 Complete!"
echo ""

# Step 5: Deploy
echo "📍 Step 5/5: Deploying application..."
echo "   → ⏱️  This takes 2-3 minutes..."
echo "   → Watch for deployment progress below"
echo ""
railway up

echo ""
echo "════════════════════════════════════════════════════"
echo "   ✅ DEPLOYMENT COMPLETE!"
echo "════════════════════════════════════════════════════"
echo ""
echo "🎉 Your app is now LIVE!"
echo ""
echo "📍 Next steps:"
echo "   1. Open: https://your-project.railway.app"
echo "   2. You should see the Trend Hijacker dashboard"
echo "   3. Verify API: /api/trends"
echo "   4. Check health: /health"
echo ""
echo "📊 View your deployment:"
echo "   railway status"
echo "   railway logs"
echo "   railway env"
echo ""
echo "🚀 You're live in production!"
echo ""
