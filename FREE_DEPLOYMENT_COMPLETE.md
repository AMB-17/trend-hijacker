# 🚀 Free Deployment Guide - Trend Hijacker v2.0

**COMPLETELY FREE** - No paid APIs, no expensive hosting. Deploy everywhere with zero cost.

---

## 📋 Quick Start: Local Docker Deployment

### Prerequisites
- Docker & Docker Compose installed
- PostgreSQL 16+ (or use Docker image)
- Redis 7+ (or use Docker image)
- Node.js 20+ (development only)

### Step 1: Clone & Setup

```bash
# Clone repository
git clone https://github.com/yourusername/trend-hijacker
cd trend-hijacker

# Create .env file
cat > .env << EOF
# Database
DB_USER=trendhijacker
DB_PASSWORD=trendhijacker123secure
DB_NAME=trend_hijacker
DB_PORT=5432

# Redis
REDIS_PORT=6379

# API
API_PORT=3001
CORS_ORIGIN=http://localhost:3000

# Web
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Security
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters-long1234567890ab
LOG_LEVEL=info

# Service Intervals
SCRAPE_INTERVAL=3600
ANALYSIS_INTERVAL=1800
EOF
```

### Step 2: Start Everything with Docker Compose

```bash
# Start all services (PostgreSQL, Redis, API, Web, Workers)
docker-compose -f docker-compose-prod.yml up -d

# Wait for initialization (30-60 seconds)
sleep 30

# Check services are healthy
docker-compose -f docker-compose-prod.yml ps

# View logs
docker-compose -f docker-compose-prod.yml logs -f
```

### Step 3: Access the Application

```bash
# Open in browser
open http://localhost:3000

# API Health Check
curl http://localhost:3001/health

# Database connection
docker-compose -f docker-compose-prod.yml exec postgres psql -U trendhijacker trend_hijacker
```

### Step 4: Run Database Migrations

```bash
# Apply Prisma migrations
docker-compose -f docker-compose-prod.yml exec api pnpm db:push

# Seed database (optional)
docker-compose -f docker-compose-prod.yml exec api pnpm db:seed
```

**✅ You now have Trend Hijacker running locally!**

---

## ☁️ Free Deployment Options

### Option 1: Railway.app (✅ Recommended - $5 free credit per month)

Railway is FREE for development and provides excellent free tier.

#### Setup:

```bash
# 1. Sign up at https://railway.app (GitHub free)
# 2. Create new project
# 3. Connect GitHub repository
# 4. Add services:

# PostgreSQL Service:
- Provider: PostgreSQL
- Name: postgres
- Generate: Database URL will auto-populate

# Redis Service:
- Provider: Redis
- Name: redis
- Generate: Connection will auto-populate

# API Service:
- GitHub repo push trigger
- Dockerfile: apps/api/Dockerfile
- Environment variables: Copy from .env
- PORT=3001

# Web Service:
- GitHub repo push trigger
- Dockerfile: apps/web/Dockerfile
- NEXT_PUBLIC_API_URL: https://your-api.railway.app (from API service)
- PORT=3000

# Workers:
- Similar setup for scraper and trend-engine
```

**Free Features:**
- ✅ Unlimited deployments
- ✅ Free PostgreSQL instance
- ✅ Free Redis instance
- ✅ Auto SSL certificates
- ✅ GitHub integration

---

### Option 2: Render.com (✅ Free Plan)

Render offers free tier forever with service limits.

#### Setup:

```bash
# 1. Sign up at https://render.com (GitHub free)
# 2. Create Blueprint (IaC):

# render-compose.yaml
services:
  - type: web
    name: api
    runtime: node
    buildCommand: pnpm install && pnpm build
    startCommand: node apps/api/dist/index.js
    envVars:
      - DATABASE_URL
      - REDIS_URL
      - JWT_SECRET
    
  - type: web
    name: web
    runtime: node
    buildCommand: cd apps/web && npm run build
    startCommand: npm start
    envVars:
      - NEXT_PUBLIC_API_URL
```

**Free Features:**
- ✅ Free PostgreSQL (750 hours/month)
- ✅ Free Redis (100MB/month)
- ✅ Free web services (750 hours/month)
- ✅ Auto deploys from GitHub

---

### Option 3: Fly.io (✅ Generous Free Tier)

Fly.io provides truly global free tier.

#### Setup:

```bash
# 1. Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
# 2. Sign up: flyctl auth signup (GitHub)
# 3. Create app:

flyctl launch

# 4. Configure fly.toml:

[app]
primary_region = "sjc"  # San Jose

[[services]]
protocol = "tcp"
internal_port = 3000
ports = [{ port = 80 }, { port = 443 }]

[env]
DATABASE_URL = "postgresql://..."
REDIS_URL = "redis://..."
JWT_SECRET = "your-secret"

# 5. Deploy:
flyctl deploy
```

**Free Features:**
- ✅ 3 shared-cpu-1x 256MB VMs per month
- ✅ 160GB outbound bandwidth/month
- ✅ Free SSL
- ✅ Global network

---

### Option 4: Vercel (✅ Free for Web Frontend)

Vercel is perfect for Next.js frontend - completely FREE.

#### Setup:

```bash
# 1. Push code to GitHub
# 2. Go to https://vercel.com/import
# 3. Select GitHub repository
# 4. Configure:
   - Build: pnpm build (in apps/web)
   - Output: .next
   - Environment: NEXT_PUBLIC_API_URL
# 5. Deploy (automatic on git push)
```

**Free Features:**
- ✅ Unlimited deployments
- ✅ Automatic SSL
- ✅ Edge functions
- ✅ Serverless functions
- ✅ Analytics

**Total Stack on Vercel + Railway:**
- Vercel: Next.js Web Frontend (FREE)
- Railway: PostgreSQL, Redis, API, Workers (FREE $5/month included)

---

## 🔄 CI/CD Pipeline (GitHub Actions - FREE)

### GitHub Actions Workflow for Auto-Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install pnpm
        run: npm i -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Run tests
        run: pnpm test
      
      - name: Deploy to Railway
        uses: railwayapp/deploy-action@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          service: ${{ secrets.RAILWAY_SERVICE }}
          environment: production
```

**Setup:**
```bash
# 1. Get Railway token: railway login -> show token
# 2. Add to GitHub Secrets:
   - RAILWAY_TOKEN (from railway login)
   - RAILWAY_SERVICE (from Railway dashboard)
```

---

## 📊 Monitoring & Logs (FREE Tools)

### Uptime Monitoring
```bash
# Use: https://uptimerobot.com (FREE)
# - 50 monitors
- Interval: 5 minutes
# - Email alerts
```

### Log Management
```bash
# Use: Railway Console (included FREE) or:
# Papertrail: https://www.papertrailapp.com (1GB/month FREE)
```

### Performance Monitoring
```bash
# Use: Next.js Analytics (included in Vercel)
# API Logs: Docker logs or Railway console
```

---

## 🔐 Security Setup (FREE)

### Database Backup
```bash
# Automated backups (Railway includes FREE backups)
# Manual backup:
curl -X POST \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  https://api.railway.app/graphql \
  -d '{"query":"mutation { projectMemberCreate(input: {}) { ok } }"}'
```

### SSL Certificates
- ✅ Free automatic SSL on all platforms
- ✅ Subdomains included

### Secrets Management
```bash
# All platforms support secure environment variables (encrypted)
# GitHub Secrets for CI/CD
# Railway/Render built-in secret management
```

---

## 💰 Cost Breakdown

| Service | Free Tier | Cost/Month |
|---------|-----------|-----------|
| **PostgreSQL** | Railway/Render | $0 (included) |
| **Redis** | Railway/Render | $0 (included) |
| **API Server** | Railway/Render | $0 (included) |
| **Web Frontend** | Vercel | $0 (forever) |
| **CI/CD** | GitHub Actions | $0 (2000 min/month) |
| **Domain** | Porkbun | $0.71/yr (coupon) |
| **Monitoring** | Uptime Robot | $0 (50 monitors) |
| **Logs** | Papertrail | $0 (1GB/month) |
| **Backups** | Railway | $0 (automatic) |
| **SSL/TLS** | Let's Encrypt | $0 (auto) |
| **Total** | | **$0.71/year** |

---

## 🚀 Production Deployment Checklist

- [ ] Database backups configured
- [ ] Environment variables set
- [ ] JWT secret changed
- [ ] CORS origins configured for your domain
- [ ] Database migrations applied
- [ ] Email configured for alerts
- [ ] SSL certificate verified
- [ ] Health checks passing
- [ ] Monitoring/uptime checks enabled
- [ ] Logs being collected
- [ ] CI/CD pipeline tested
- [ ] Disaster recovery plan documented

---

## 📱 Quick Deploy Commands

### Deploy with Docker Compose Locally
```bash
docker-compose -f docker-compose-prod.yml up -d
```

### Deploy to Railway
```bash
npm install -g @railway/cli
railway login
railway up
```

### Deploy to Vercel (Web Only)
```bash
npm install -g vercel
cd apps/web
vercel
```

### Deploy to Fly.io
```bash
brew install flyctl
flyctl auth signup
flyctl launch
flyctl deploy
```

---

## 🐛 Troubleshooting

### Database Connection Failing
```bash
# Check database is running
docker-compose -f docker-compose-prod.yml logs postgres

# Reset database
docker-compose -f docker-compose-prod.yml exec postgres \
  psql -U trendhijacker -d trend_hijacker -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### API Not Responding
```bash
# Check API logs
docker-compose -f docker-compose-prod.yml logs api

# Verify environment variables
docker-compose -f docker-compose-prod.yml exec api env | grep DATABASE_URL
```

### Web Frontend 502 Error
```bash
# Check Next.js build succeeded
docker-compose -f docker-compose-prod.yml logs web

# Verify API connectivity from web
docker-compose -f docker-compose-prod.yml exec web curl http://api:3001/health
```

---

## 📚 Additional Resources

- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **Fly.io Docs**: https://fly.io/docs
- **Vercel Docs**: https://vercel.com/docs
- **Docker Compose**: https://docs.docker.com/compose
- **GitHub Actions**: https://docs.github.com github/actions

---

**🎉 Your Trend Hijacker is now ready for production!**

All FREE, all open-source, zero locked-in features.
