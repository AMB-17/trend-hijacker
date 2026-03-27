# 🚀 Railway Deployment - Quick Start

> **One-Click Deployment in 5 Minutes**

---

## ⚠️ Prerequisites

- [x] GitHub account logged in
- [x] Repository pushed to GitHub: `amb-17/trend-hijacker`
- [x] Build passing: ✓ `pnpm build` successful
- [x] Railway CLI installed: ✓ Already done

---

## 🎯 5-Step Deployment

### **Step 1: Login to Railway**

```bash
railway login
```

**What to do:**
- Opens browser → Log in with GitHub
- Authorizes Railway to access your account
- Returns to terminal when done

⏱️ **Time: 30 seconds**

---

### **Step 2: Initialize Railway Project**

```bash
cd d:\workspace
railway init
```

**What to do:**
- Choose: Create a new project → Name: `trend-hijacker`
- Railway creates `.railway/config.json`
- Git adds this to your repo

⏱️ **Time: 1 minute**

---

### **Step 3: Add PostgreSQL Database**

```bash
railway add
```

**What to do:**
- Select: `PostgreSQL`
- Railway provisions database automatically
- Stores `DATABASE_URL` in env

**Result:**
```
✓ PostgreSQL added
✓ DATABASE_URL set to: postgresql://user:pass@...
```

⏱️ **Time: 1 minute**

---

### **Step 4: Add Redis Cache**

```bash
railway add
```

**What to do:**
- Select: `Redis`
- Railway provisions Redis instance
- Stores `REDIS_URL` in env

**Result:**
```
✓ Redis added  
✓ REDIS_URL set to: redis://...
```

⏱️ **Time: 1 minute**

---

### **Step 5: Deploy Application**

```bash
railway up
```

**What to do:**
- Railway reads `Dockerfile` from `apps/api` and `apps/web`
- Builds containers
- Deploys services
- Runs migrations

**What happens:**
```
✓ Building web container...
✓ Building api container...  
✓ Running database migrations...
✓ Starting API service...
✓ Starting web service...
✓ Deployed! 🎉
```

**Your app is now live at:**
```
https://your-project.railway.app
```

⏱️ **Time: 2-3 minutes**

---

## 🔧 Set Environment Variables

Railway auto-sets some, but add these for production:

```bash
# Generate secrets (run these commands)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# This gives you a CRON_SECRET - copy it

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# This gives you a JWT_SECRET - copy it
```

**Add to Railway environment:**

```bash
railway env
# This shows all env vars

# To add new ones:
railway env CRON_SECRET=<paste-generated-value>
railway env JWT_SECRET=<paste-generated-value>
railway env LOG_LEVEL=info
railway env CORS_ORIGIN=https://your-domain.railway.app
```

---

## ✅ Verify Deployment

Once deployed, test these URLs:

### **Web Frontend**
```
https://your-project.railway.app
```
Expected: Trend Hijacker dashboard loads ✓

### **Health Check**
```
curl https://your-project.railway.app/health
```
Expected: JSON response with status ✓

### **API Trends**
```
curl https://your-project.railway.app/api/trends
```
Expected: JSON array of trend objects ✓

### **Dashboard**
```
https://your-project.railway.app/dashboard
```
Expected: Dashboard with cards and metrics ✓

---

## 📊 Monitor Your Deployment

### **View Logs**
```bash
railway logs
```
Shows real-time application logs

### **View Status**
```bash
railway status
```
Shows all services and their status

### **View Environment**
```bash
railway env
```
Shows all environment variables

---

## 🎯 What's Running

After deployment:

| Service | Status | URL |
|---------|--------|-----|
| Web Frontend | ✅ Running | https://your-project.railway.app |
| API Server | ✅ Running | https://your-project.railway.app (same domain) |
| PostgreSQL | ✅ Running | Internal only |
| Redis | ✅ Running | Internal only |
| Scrapers | ✅ Running | Background jobs |
| Trend Engine | ✅ Running | Background jobs |

---

## 🚨 Troubleshooting

### **"Deployment failed"**
```bash
railway logs
# Check logs for error details. Usually:
# - Missing DATABASE_URL → Run migrations
# - Build error → Check Dockerfile
```

### **"API returns 502"**
```bash
railway restart
# Restarts all services
```

### **"Can't connect to database"**
```bash
# Railway sets DATABASE_URL automatically
# If missing:
railway env
# Look for DATABASE_URL entry
# If not there, re-run: railway add postgres
```

### **"Workers not running"**
```bash
# Check env:
railway env | grep SCRAPER_ENABLED
# Should be: SCRAPER_ENABLED=true

# If not, set it:
railway env SCRAPER_ENABLED=true
railway restart
```

---

## 📈 Next Steps (Post-Deployment)

### 1. **Set Custom Domain** (Optional)

In Railway dashboard:
- Go to your project
- Settings → Domains
- Add your domain (e.g., `trends.yoursite.com`)
- Railway generates SSL certificate automatically

### 2. **Enable Auto-Scaling** (Optional)

In Railway dashboard:
- Services → API → Settings
- Enable auto-scale for high traffic

### 3. **Set Up Monitoring** (Optional)

```bash
# Add error tracking
railway env SENTRY_DSN=<your-sentry-url>

# Add performance monitoring
railway env DATADOG_API_KEY=<your-datadog-key>
```

### 4. **Create GitHub CI/CD** (Recommended)

Add to `.github/workflows/deploy.yml`:
```yaml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: railway up
```

---

## 💼 Production Checklist

After deployment, verify:

- [x] Web loads at root URL  ✓
- [x] Dashboard page responsive ✓
- [x] API health check passes ✓
- [x] Database migrations ran ✓
- [x] Redis cache working ✓
- [x] Scrapers collecting data ✓
- [x] No errors in logs ✓
- [x] Response times < 500ms ✓

---

## 📞 Questions?

**Railway Support**: https://railway.app/support  
**Our Docs**: https://github.com/amb-17/trend-hijacker  
**Issues**: GitHub Issues tab

---

## 🎉 Success!

Your Trend Hijacker is now **LIVE IN PRODUCTION** 🚀

**Share your deployment:**
```
✨ Just deployed Trend Hijacker!
🔗 https://your-project.railway.app
Made with passion and open source ❤️
```

---

**Ready to deploy? Run this command:**

```bash
railway login
```

**Then follow the 5 steps above!** ⬆️
