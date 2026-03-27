# 🚀 TREND HIJACKER v2.0 - DEPLOYMENT & LAUNCH GUIDE

**Status**: ✅ **READY FOR PRODUCTION DEPLOYMENT**

---

## 🎯 **QUICK START (5 MINUTES)**

```bash
# 1. Clone and setup
cd d:\workspace
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Database setup
pnpm db:generate
pnpm db:push

# 4. Start development
pnpm dev

# 5. Verify
curl http://localhost:3001/health
```

---

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### **Environment Variables** (Copy from `.env.example`)
```bash
# Core
DATABASE_URL=postgresql://user:password@localhost:5432/trend_hijacker
REDIS_URL=redis://localhost:6379
NODE_ENV=production
PORT=3001
API_PORT=3000

# OpenAI (for Features 1 & 5)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4  # or gpt-3.5-turbo

# Email Service (Feature 2 - Alerts)
RESEND_API_KEY=re_your-key-here
# OR
SENDGRID_API_KEY=sg_your-key-here

# Optional: Slack Integration (Feature 2)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# OAuth Providers (Enterprise Security)
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GITHUB_CLIENT_ID=your-id
GITHUB_CLIENT_SECRET=your-secret
AZURE_CLIENT_ID=your-id
AZURE_CLIENT_SECRET=your-secret
AZURE_TENANT_ID=your-tenant

# SAML (Enterprise Security)
SAML_ISSUER=trend-hijacker
SAML_CALLBACK_URL=https://yourdomain.com/api/auth/saml/acs

# Security
JWT_SECRET=your-secure-random-string-minimum-32-chars
CSRF_SECRET=your-secure-random-string

# Session
SESSION_MAX_AGE=86400000  # 24 hours in ms
SESSION_SECRET=your-secure-random-string

# API Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100  # requests per window
```

---

## 🗄️ **DATABASE SETUP**

### **Step 1: Create Database**
```bash
# Using PostgreSQL CLI
psql -U postgres

# Inside psql:
CREATE DATABASE trend_hijacker;
CREATE USER trend_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE trend_hijacker TO trend_user;
\q
```

### **Step 2: Run Migrations**
```bash
cd d:\workspace

# Generate Prisma client
pnpm db:generate

# Apply all migrations
pnpm db:push

# Seed sample data (optional)
pnpm db:seed
```

### **Step 3: Create Indexes (Performance)**
```bash
# Run index optimization script
psql -U trend_user -d trend_hijacker -f infrastructure/database/indexes.sql

# Verify indexes created
psql -U trend_user -d trend_hijacker -c "\di"
```

### **Step 4: Setup Read Replica (Optional - Production)**
```bash
# For high-traffic deployments
psql -U postgres -f infrastructure/database/postgresql-replica-setup.sql

# Verify replication
psql -U trend_user -d trend_hijacker -c "SELECT pg_last_wal_receive_lsn();"
```

---

## 🔧 **MICROSERVICE STARTUP**

### **Service 1: Backend API (Port 3001)**
```bash
cd d:\workspace/apps/api
pnpm dev
# Expected output: Fastify server listening on 3001
```

### **Service 2: Frontend (Port 3000)**
```bash
cd d:\workspace/apps/web
pnpm dev
# Expected output: Next.js ready on 3000
```

### **Service 3: Scraper Workers (Optional)**
```bash
cd d:\workspace/workers/scraper
pnpm dev
# Starts data collection from 5 sources
```

### **Service 4: Trend Engine Workers (Optional)**
```bash
cd d:\workspace/workers/trend-engine
pnpm dev
# Starts NLP analysis pipeline
```

### **All Services Together** (Production)
```bash
cd d:\workspace
pnpm start  # Starts all services in parallel
```

---

## ✅ **HEALTH CHECKS**

```bash
# API Health
curl http://localhost:3001/health
# Expected: { "status": "ok", "timestamp": "...", "uptime": ... }

# Database Connection
curl http://localhost:3001/api/health/db
# Expected: { "database": "connected", "latency_ms": ... }

# Redis Connection
curl http://localhost:3001/api/health/redis
# Expected: { "redis": "connected" }

# All Services
curl http://localhost:3001/api/health/all
# Expected: All services "ok"
```

---

## 🧪 **FEATURE VERIFICATION**

### **Feature 1: AI Idea Generator**
```bash
# 1. Get a trend
curl http://localhost:3001/api/trends | jq '.[0].id' > trend_id.txt

TREND_ID=$(cat trend_id.txt)

# 2. Generate ideas
curl -X POST http://localhost:3001/api/trends/$TREND_ID/generate-ideas \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 3}'

# Expected: 3 startup ideas with viability scores
```

### **Feature 2: Alert System**
```bash
# 1. Configure alerts
curl -X POST http://localhost:3001/api/alerts/config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["email", "slack"],
    "scoreThreshold": 75,
    "frequency": "daily"
  }'

# 2. Send test alert
curl -X POST http://localhost:3001/api/alerts/send-test \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Email and Slack message received
```

### **Feature 3: Workspaces**
```bash
# 1. Create workspace
curl -X POST http://localhost:3001/api/workspaces \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Team",
    "description": "Our trend research"
  }'

# Expected: Workspace created with ID

# 2. List workspaces
curl http://localhost:3001/api/workspaces \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Feature 4: Trend Reports**
```bash
# 1. Get time-series data
curl "http://localhost:3001/api/trends/$TREND_ID/timeseries?period=6m" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Generate report
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trendIds": ["trend1", "trend2"],
    "format": "pdf"
  }'

# Expected: PDF report generated
```

### **Feature 5: AI Insights**
```bash
# 1. Get trend insights
curl "http://localhost:3001/api/trends/$TREND_ID/insights" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: AI summary, key drivers, sentiment analysis

# 2. Get sentiment analysis
curl "http://localhost:3001/api/trends/$TREND_ID/sentiment" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Sentiment distribution + trend
```

### **Enterprise Security Features**
```bash
# 1. OAuth Login (Google)
curl -X GET http://localhost:3001/api/auth/oauth/google/authorize

# 2. 2FA Setup
curl -X POST http://localhost:3001/api/auth/2fa/setup \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: TOTP secret + QR code

# 3. Audit Logs (Admin)
curl http://localhost:3001/api/admin/audit-logs \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY"

# 4. GDPR Data Export
curl -X POST http://localhost:3001/api/user/export-data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚀 **PRODUCTION DEPLOYMENT**

### **Option 1: Docker Deployment**

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f web
```

### **Option 2: Cloud Deployment (Render)**

```bash
# 1. Create services in Render dashboard:
# - Web service (Next.js app)
# - API service (Fastify)
# - PostgreSQL database
# - Redis
# - Worker services

# 2. Set environment variables in Render dashboard
# Copy all variables from .env.example

# 3. Deploy
git push origin main  # Auto-deploys on Render

# 4. Verify
curl https://your-api-domain.onrender.com/health
curl https://your-web-domain.onrender.com/
```

### **Option 3: AWS Deployment**

```bash
# 1. Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier trend-hijacker-prod \
  --db-instance-class db.t3.small \
  --engine postgres \
  --master-username admin \
  --master-user-password 'secure-password'

# 2. Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id trend-hijacker-redis \
  --cache-node-type cache.t3.micro \
  --engine redis

# 3. Deploy on ECS
aws ecs create-service \
  --cluster trend-hijacker \
  --service-name api \
  --task-definition trend-hijacker-api:1

# 4. Set up Application Load Balancer
# Configure in AWS console
```

### **Option 4: Kubernetes (K8s)**

```bash
# 1. Create namespace
kubectl create namespace trend-hijacker

# 2. Apply manifests
kubectl apply -f infrastructure/k8s/namespace.yaml
kubectl apply -f infrastructure/k8s/postgres.yaml
kubectl apply -f infrastructure/k8s/redis.yaml
kubectl apply -f infrastructure/k8s/api.yaml
kubectl apply -f infrastructure/k8s/web.yaml

# 3. Verify deployment
kubectl get pods -n trend-hijacker
kubectl get services -n trend-hijacker

# 4. Forward ports for testing
kubectl port-forward -n trend-hijacker svc/api 3001:3001
kubectl port-forward -n trend-hijacker svc/web 3000:3000
```

---

## 📊 **PERFORMANCE VALIDATION**

### **Run Load Tests**

```bash
# Install k6 if not installed
brew install k6  # macOS
# or download from https://k6.io/docs/getting-started/installation

# Run baseline test (100 users, 10 min)
k6 run infrastructure/load-tests/baseline.js

# Run ramp test (100→1000 users)
k6 run infrastructure/load-tests/ramp.js

# Run spike test
k6 run infrastructure/load-tests/spike.js

# Run stress test to failure
k6 run infrastructure/load-tests/stress.js
```

### **Expected Results**
```
p95 Latency:   <100ms ✅
p99 Latency:   <500ms ✅
Error Rate:    <0.1% ✅
Throughput:    >1000 req/sec ✅
CPU Usage:     <70% ✅
Memory Usage:  <80% ✅
```

---

## 📡 **MONITORING SETUP**

### **Start Prometheus & Grafana**

```bash
# Using Docker Compose
docker-compose -f infrastructure/docker-compose-monitoring.yml up -d

# Access dashboards
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3000 (admin/admin)"
```

### **Configure Alerts**

```bash
# Edit alert rules
nano infrastructure/monitoring/alert-rules.yml

# Reload Prometheus
curl -X POST http://localhost:9090/-/reload
```

### **Key Metrics to Monitor**
- API p95 latency
- Error rates
- Database connection pool
- Cache hit rates
- CPU and memory usage
- Disk space

---

## 🔐 **SECURITY HARDENING**

### **SSL/HTTPS Setup**

```bash
# Generate self-signed certificate (dev)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Use Let's Encrypt (production)
# Certbot is already configured in Dockerfile

# Verify HTTPS
curl -k https://localhost:3001/health
```

### **Security Headers**

```bash
# Verify Helmet is enabled
curl -i http://localhost:3001/health | grep -i "strict-transport"
# Expected: Strict-Transport-Security: max-age=31536000

curl -i http://localhost:3001/health | grep -i "x-content-type"
# Expected: X-Content-Type-Options: nosniff
```

### **Rate Limiting**

```bash
# Test rate limiting
for i in {1..120}; do
  curl http://localhost:3001/health
done

# After 100 requests: Expected 429 Too Many Requests
```

---

## 🐛 **TROUBLESHOOTING**

### **Database Connection Failed**
```bash
# Check PostgreSQL is running
psql -U trend_user -d trend_hijacker -c "SELECT 1;"

# Verify DATABASE_URL in .env.local
# Format: postgresql://user:password@host:port/database

# Check logs
docker logs trend-hijacker-db
```

### **Redis Connection Failed**
```bash
# Check Redis is running
redis-cli ping
# Expected: PONG

# Verify REDIS_URL in .env.local
# Format: redis://host:port
```

### **High API Latency**
```bash
# Check database query performance
psql -U trend_user -d trend_hijacker -c "EXPLAIN ANALYZE SELECT * FROM \"Trend\" ORDER BY score DESC LIMIT 10;"

# Check cache hit rates
curl http://localhost:3001/api/health/redis-stats

# Consider adding more indexes
psql -U trend_user -d trend_hijacker -f infrastructure/database/indexes.sql
```

### **Out of Memory**
```bash
# Increase heap size
NODE_OPTIONS="--max-old-space-size=4096" pnpm start

# Check memory usage
node --expose-gc -e "require('v8').writeHeapSnapshot()"
```

---

## 📈 **POST-DEPLOYMENT**

### **First 24 Hours**
- [ ] Monitor error rates (should be <0.1%)
- [ ] Check API latency (should be <100ms p95)
- [ ] Verify all features working
- [ ] Review audit logs
- [ ] Check backup status

### **First Week**
- [ ] Run full load tests
- [ ] Fine-tune database indexes
- [ ] Adjust cache TTLs
- [ ] Review performance metrics
- [ ] Gather user feedback

### **Ongoing Maintenance**
- [ ] Weekly performance reviews
- [ ] Monthly security audits
- [ ] Quarterly capacity planning
- [ ] Continuous monitoring

---

## 📞 **SUPPORT & ESCALATION**

### **Critical Issues (Down)**
1. Check service logs: `docker-compose logs api`
2. Restart services: `docker-compose restart`
3. Check database: `psql -U trend_user -d trend_hijacker -c "SELECT 1;"`
4. Escalate to ops team

### **Performance Issues**
1. Check load: `curl http://localhost:3001/api/health`
2. Review metrics in Grafana
3. Check database query performance
4. Consider horizontal scaling

### **Feature Issues**
1. Check API response: `curl http://localhost:3001/api/trends`
2. Review application logs
3. Check OpenAI API status
4. Test with sample data

---

## ✅ **FINAL VERIFICATION CHECKLIST**

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] All services running without errors
- [ ] Health checks passing
- [ ] Features verified working
- [ ] Load tests completed successfully
- [ ] Security configurations verified
- [ ] Monitoring dashboards accessible
- [ ] Backups configured and tested
- [ ] Documentation reviewed

---

**Status**: ✅ **READY FOR PRODUCTION**  
**Version**: 2.0  
**Deployment Time**: 30 minutes  
**Rollback Time**: 5 minutes  

Good luck with your launch! 🚀

