# 🧪 Complete Testing & Deployment Guide

## ✅ Pre-Deployment Testing Checklist

### 1. Local Build Verification

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build

# Expected output:
# ✓ @packages/types built
# ✓ @apps/web built  
# ✓ All services compiled
```

### 2. Docker Compose Local Test

```bash
# Start all services  
docker-compose -f docker-compose-prod.yml up -d

# Wait for health checks (30-60 seconds)
sleep 60

# Verify all containers running
docker-compose -f docker-compose-prod.yml ps

# Expected output:
# postgres         Up (healthy)
# redis            Up (healthy)
# api              Up (healthy)
# web              Up (healthy)
# scraper          Up (healthy)
# trend-engine     Up (healthy)

# Check each service
curl http://localhost:3001/health       # API health
curl http://localhost:3000/health       # Web health
docker-compose -f docker-compose-prod.yml exec postgres pg_isready
docker-compose -f docker-compose-prod.yml exec redis redis-cli ping
```

### 3. Database Migration Test

```bash
# Apply migrations
docker-compose -f docker-compose-prod.yml exec api pnpm db:push

# Verify schema
docker-compose -f docker-compose-prod.yml exec postgres psql -U trendhijacker -d trend_hijacker -c "\dt"

# Expected: See all tables (users, trends, discussions, alerts, etc.)
```

### 4. API Endpoint Tests

```bash
# Health Check
curl -X GET http://localhost:3001/health
# Expected: {"status": "ok"}

# Get Trends
curl -X GET http://localhost:3001/api/trends?limit=10
# Expected: List of trends

# Get Health with details
curl -X GET http://localhost:3001/health -H "Content-Type: application/json"
# Expected: Database, Cache, Worker status
```

### 5. Web UI Tests

```bash
# Homepage loads
curl -s http://localhost:3000 | grep -q "Trend Hijacker" && echo "✅ UI loads"

# API endpoints accessible from frontend
curl -X GET http://localhost:3000/api/trends
```

### 6. Worker Service Tests

```bash
# Check scraper logs
docker-compose -f docker-compose-prod.yml logs scraper | grep -E "ERROR|Success"

# Check trend-engine logs
docker-compose -f docker-compose-prod.yml logs trend-engine | grep -E "ERROR|Analysis"

# Expected: Logs showing active work
```

### 7. Redis Cache Test

```bash
# Connect to Redis
docker-compose -f docker-compose-prod.yml exec redis redis-cli

# Inside redis-cli:
PING                    # Should return PONG
INFO memory             # Check memory usage
KEYS *                  # List all cache keys
GET trend:*             # Sample cache entries
QUIT
```

### 8. Load Testing

```bash
# Install Apache Bench
brew install httpd  # macOS
apt-get install apache2-utils  # Linux

# Test API endpoints
ab -n 100 -c 10 http://localhost:3001/api/trends

# Test Web
ab -n 100 -c 10 http://localhost:3000

# Expected: <100ms average response time
```

---

## 🚀 Production Deployment Steps

### Railway Deployment

```bash
# 1. Create account and project
# 2. Add environment variables
export RAILWAY_TOKEN="your_token"
export DATABASE_URL="postgresql://..."
export REDIS_URL="redis://..."
export JWT_SECRET="your-secret"

# 3. Deploy
railway login
railway link "your-project-id"
railway up

# 4. Monitor
railway logs
railway status
```

### Render Deployment

```bash
# 1. Create account
# 2. Create PostgreSQL service
# 3. Create Redis service
# 4. Create Web service pointing to GitHub
#    - Build command: pnpm install && pnpm build
#    - Start: node apps/api/dist/index.js
#    - Environment: Copy from .env
# 5. Auto-deploys on git push
```

### Fly.io Deployment

```bash
# Prerequisites
curl -L https://fly.io/install.sh | sh

# Deploy
flyctl auth signup  # or login
cd workspace
flyctl launch

# Configure fly.toml with:
[env]
DATABASE_URL = "connection_string"
REDIS_URL = "connection_string"
JWT_SECRET = "your_secret"

# Deploy
flyctl deploy

# Monitor
flyctl logs
flyctl status
```

### Vercel Deployment (Web Only)

```bash
# Deploy Next.js frontend to Vercel
vercel --prod

# Point to your API service
# Environment: NEXT_PUBLIC_API_URL=https://your-api-url
```

---

## 📊 Post-Deployment Verification

### Health Checks

```bash
# API Health
curl https://your-api-url/health

# Web Health
curl https://your-web-url/health

# Database
curl https://your-api-url/health | jq '.database'

# Cache
curl https://your-api-url/health | jq '.redis'
```

### Performance Metrics

```bash
# Response time
time curl https://your-api-url/api/trends

# Page load time
curl -w "@curl-format.txt" https://your-web-url

# Database query time (check logs)
```

### Monitoring Setup

```bash
# 1. Railway: Built-in monitoring
# 2. Render: Built-in monitoring  
# 3. Fly.io: Built-in monitoring
# 4. Uptime Robot: https://uptimerobot.com
# 5. Better Stack: https://betterstack.com (free tier)
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check connection string
echo $DATABASE_URL

# Verify database is running
psql $DATABASE_URL -c "SELECT 1"

# Reset database
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### API Not Responding

```bash
# Check API logs
railway logs -s api
# or
render logs

# Verify environment variables
env | grep DATABASE_URL
env | grep REDIS_URL

# Rebuild and deploy
git push  # Trigger auto-deploy
```

### Web Frontend Issues

```bash
# Check build logs
# Vercel: https://vercel.com/dashboard
# Ensure NEXT_PUBLIC_API_URL is set correctly
```

### Redis Connection

```bash
# Connect to Redis service
redis-cli -u $REDIS_URL

# Test connectivity
PING

# Check memory
INFO memory
```

---

## 🔒 Security Verification

### Before Going Live

- [ ] JWT_SECRET changed (minimum 32 characters)
- [ ] Database password strong (20+ characters)
- [ ] CORS_ORIGIN configured for your domain only
- [ ] No API keys in code (all in environment variables)
- [ ] SSL/TLS enabled on all endpoints
- [ ] Database backups enabled
- [ ] Monitoring/alerting configured
- [ ] Rate limiting enabled
- [ ] CSRF protection active
- [ ] XSS protection headers set

### Security Tests

```bash
# Check for exposed secrets
git log --all --full-history -- '**/.*' | grep -i secret

# OWASP Dependency Check
docker run --rm -v $(pwd):/src owasp/dependency-check \
  --project "Trend Hijacker" --scan /src

# Security headers
curl -I https://your-app-url | grep -i "security\|x-\|content"
```

---

## 📈 Scaling & Optimization

### Database Optimization

```bash
# Create indexes
psql $DATABASE_URL -c "
CREATE INDEX idx_trends_status ON trends(status);
CREATE INDEX idx_trends_created ON trends(createdAt DESC);
CREATE INDEX idx_discussions_trend ON discussions(trendId);
"

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM trends WHERE status = 'growing';
```

### Caching Improvements

```bash
# Monitor Redis memory
redis-cli INFO memory

# Set eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Monitor cache hits
redis-cli INFO stats | grep hits
```

### Worker Performance

```bash
# Scale workers horizontally
# 1. Increase SCRAPE_INTERVAL if needed
# 2. Run multiple worker instances
# 3. Monitor queue in Redis
```

---

## 🔄 Continuous Deployment Workflow

### GitHub Actions Flow

```
Push to main
    ↓
Run tests & linting
    ↓
Build Docker images
    ↓
Push to registry
    ↓
Deploy to Railway (auto)
    ↓
Deploy to Vercel (auto)
    ↓
Health checks
    ↓
Slack notification
```

### Manual Deployment

```bash
# If needed:
git push main
# Automatic deployment triggers within 2-3 minutes
```

---

## 📞 Monitoring & Support

### Key Metrics to Monitor

- API response time (target: <100ms)
- Error rate (target: <1%)
- Database connection pool utilization
- Redis memory usage
- Worker job queue depth
- Deployment frequency
- Uptime percentage (target: 99.9%)

### Alerting Setup

```bash
# Railway Alerts (in dashboard)
- API goes down
- Database connection pool full
- Disk space low

# Uptime Robot
- API health check every 5 minutes
- Email on down
- SMS on critical
```

---

## ✅ Deployment Checklist

- [ ] All tests passing
- [ ] Docker images built
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] SSL certificates valid
- [ ] Monitoring configured
- [ ] Backups enabled
- [ ] Team notified
- [ ] Rollback plan documented
- [ ] Post-deployment tests passing

---

## 🎉 Success Indicators

✅ Deployment is successful when:

1. **All Services Healthy**
   - API responding to requests
   - Web frontend loading quickly
   - Database connected
   - Redis cache working

2. **No Error Logs**
   - Zero critical errors in logs
   - Database queries executing
   - Workers processing jobs

3. **Performance Acceptable**
   - API <100ms response time
   - Web page load <3s
   - Database queries <500ms

4. **Users Can Access**
   - Web UI loads at your domain
   - Can view trends
   - Can interact with features

---

## 📞 Support Resources

- **Issues**: Check GitHub Issues
- **Documentation**: See FREE_DEPLOYMENT_COMPLETE.md
- **API Docs**: Available at /api/docs
- **Community**: GitHub Discussions

---

**🚀 Your Trend Hijacker is production-ready!**
