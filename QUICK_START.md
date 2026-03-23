# QUICK START GUIDE - TREND HIJACKER

Get TREND HIJACKER running locally in 5 minutes or learn how to deploy to production.

## 🎯 Prerequisites

### For Local Development
- Docker & Docker Compose (recommended)
- OR Node.js 20+, PostgreSQL 13+, Redis 6+

### For Production
- Render, Railway, or similar Node.js hosting
- Managed PostgreSQL database
- Managed Redis cache

---

## ⚡ 5-Minute Setup (Docker)

```bash
# 1. Clone
git clone https://github.com/yourusername/trend-hijacker
cd trend-hijacker

# 2. Start services
docker-compose up -d

# 3. Wait for startup
sleep 10

# 4. Open browser
open http://localhost:3000

# 5. Done! 🎉
```

**That's it!** The system is running:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Database: PostgreSQL
- Cache: Redis
- Scrapers: Collecting data
- Trend Engine: Analyzing trends

---

## 🛠️ Manual Setup (No Docker)

### On macOS
```bash
# Install dependencies
brew install node@20 postgresql redis

# Start services
brew services start postgresql
brew services start redis

# Install packages
npm install -g pnpm
pnpm install

# Setup database
createdb trend_hijacker
psql trend_hijacker < infrastructure/schema.sql

# Start services (open 4 terminals)
cd apps/api && pnpm dev
cd apps/web && pnpm dev
cd workers/scraper && pnpm dev
cd workers/trend-engine && pnpm dev
```

### On Linux (Ubuntu/Debian)
```bash
# Install dependencies
sudo apt-get install node@20 postgresql redis-server

# Start services
sudo systemctl start postgresql
sudo systemctl start redis-server

# Rest is same as macOS
```

### On Windows
```bash
# Use Windows Subsystem for Linux (WSL2) OR Docker
# Recommended: Use Docker - just run docker-compose up -d
```

---

## 📊 Using the Dashboard

1. **Visit**: http://localhost:3000
2. **View**: Emerging trends on the dashboard
3. **Filter**: By status (Emerging, Growing, Peak)
4. **Click**: On any trend to see details
5. **Explore**: Sources and opportunity ideas

### Main Features
- **Trend Cards**: See score and key metrics
- **Opportunity Map**: Visual network of trends
- **Filters**: By status and category
- **Details**: Click trend for full analysis

---

## 🔧 API Quick Reference

```bash
# Get all trends
curl http://localhost:3001/api/trends

# Search
curl "http://localhost:3001/api/search?q=ai"

# Get trend details
curl http://localhost:3001/api/trends/{id}

# System stats
curl http://localhost:3001/api/stats
```

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for full reference.

---

## 📁 Project Structure Overview

```
trend-hijacker/
├── apps/web           # Frontend (Next.js)
├── apps/api           # Backend (Fastify)
├── workers/scraper    # Data collection
├── workers/trend-engine # NLP & trend detection
├── packages/          # Shared code
├── docker-compose.yml # Local dev
└── docs/              # Documentation
```

---

## 🔍 Checking Status

```bash
# Check if services are running
curl http://localhost:3001/health

# View Docker containers
docker-compose ps

# View logs
docker-compose logs -f api     # API logs
docker-compose logs -f scraper # Scraper logs
```

---

## 🧹 Cleanup

### Stop Services
```bash
# Docker
docker-compose down

# Manual
# Kill the 4 terminal processes (Ctrl+C)
```

### Full Reset
```bash
# Remove data
docker-compose down -v

# Remove all data
rm -rf /var/lib/postgresql/data  # If running locally
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Database Connection Error
```bash
# Check PostgreSQL
psql postgresql://localhost/trend_hijacker

# Or recreate database
dropdb trend_hijacker
createdb trend_hijacker
```

### Redis Connection Error
```bash
# Check Redis
redis-cli ping

# Should return: PONG
```

### No Trends Showing
- Wait 2-3 minutes for initial scrape
- Check worker logs: `docker-compose logs scraper`
- Check trend engine: `docker-compose logs trend-engine`

---

## 📈 Common Workflows

### Add a New Scraper
1. Create scraper class in `workers/scraper/scrapers.ts`
2. Add to MasterScraper
3. Restart worker

### Modify Trend Scoring
1. Edit `packages/scoring/index.ts`
2. Update weights or formulas
3. Rebuild and restart trend engine

### Change Database Schema
1. Edit `apps/api/src/schema.ts`
2. Update schema
3. Restart API

---

## 🚀 Deploy to Production

### Option 1: Render (Easiest)
```bash
# 1. Create Render account
# 2. Connect GitHub repo
# 3. Create 3 services:
#    - Web (Next.js)
#    - API (Node.js)
#    - Workers (Background job)
# 4. Add environment variables
# 5. Deploy!

# Cost: ~$20-50/month
```

### Option 2: Docker (Any Cloud)
```bash
# Build images
docker-compose build

# Push to registry
docker tag trend-hijacker-web myregistry/web
docker push myregistry/web

# Deploy on cloud
kubectl apply -f infrastructure/k8s/
# Or use docker-compose on VPS
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed steps.

---

## 📚 Learn More

- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Database**: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- **Development**: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
- **Deployment**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **API Docs**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## 💬 Need Help?

- Check [Troubleshooting](#-troubleshooting)
- Review logs: `docker-compose logs`
- Read documentation files
- Create GitHub issue with error details

---

## 🎯 Next Steps

1. ✅ Get running locally
2. ✅ Explore dashboard
3. ✅ Read ARCHITECTURE.md
4. ✅ Make changes (add scraper, modify scoring)
5. ✅ Deploy to production
6. ✅ Monitor and scale

---

**Happy trend hunting! 🚀**
