# TREND HIJACKER - Deployment & Scaling Guide

## Deployment Environments

### Development
- Local Docker Compose
- Hot reload enabled
- Debug logging

### Staging
- Single instance
- Production-like config
- Manual testing before prod

### Production
- Multi-region deployment
- Auto-scaling enabled
- CDN for static assets
- Monitoring & alerting

## Deployment Platforms

### Option 1: Render (Recommended for MVP)

**Cost:** ~$20-50/month startup

```bash
# 1. Create PostgreSQL database
# Cost: $7/month starter

# 2. Create Redis
# Cost: $6/month starter

# 3. Deploy Backend
# Cost: $7/month
render deploy --service trend-hijacker-api

# 4. Deploy Workers
# Create two separate background jobs
render deploy --service trend-hijacker-scraper
render deploy --service trend-hijacker-trend-engine

# 5. Deploy Frontend
# Cost: $7/month
render deploy --service trend-hijacker-web
```

### Option 2: Railway

**Cost:** ~$5/month (on-demand)

```bash
railway link  # Connect to project
railway up    # Deploy all services
```

### Option 3: AWS (Production Scale)

**Architecture:**
```
Load Balancer
    ↓
API ASG (t3.micro, 2-10 instances)
    ↓
RDS PostgreSQL (db.t3.micro)
ElastiCache Redis (cache.t3.micro)
    ↓
Worker ECS (separate cluster)
```

**Cost Estimate:** $50-200/month depending on scale

### Option 4: DigitalOcean App Platform

**Cost:** ~$12/month

Simple deployment with built-in PostgreSQL and Redis.

## Environment Setup

### Production Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/trend_hijacker
PGPOOL_MODE=transaction

# Redis
REDIS_URL=redis://host:6379
REDIS_PASSWORD=<strong-password>
REDIS_TLS=true

# API
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=https://example.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_ENV=production

# Security
JWT_SECRET=<strong-secret>
API_KEY_SECRET=<strong-secret>
```

## Database Setup

### PostgreSQL Configuration

```sql
-- Create database
CREATE DATABASE trend_hijacker;

-- Run schema
psql trend_hijacker < infrastructure/schema.sql

-- Create indexes
CREATE INDEX idx_trends_score ON trends(opportunity_score DESC);
CREATE INDEX idx_discussions_fetched ON discussions(fetched_at DESC);

-- Enable extensions
CREATE EXTENSION pg_trgm;  -- For fuzzy search
CREATE EXTENSION citext;   -- Case-insensitive text
```

### Connection Pooling

```
-- Use PgBouncer for production
# /etc/pgbouncer/pgbouncer.ini

[databases]
trend_hijacker = host=rds.aws.com port=5432 user=postgres password=pass

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
max_db_connections = 100
```

## Monitoring & Alerting

### Key Metrics

```
API Metrics:
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Throughput (req/sec)
- Active connections

Worker Metrics:
- Job processing rate
- Job failure rate
- Queue depth
- Processing latency

Database Metrics:
- Query latency
- Connection count
- Disk usage
- Cache hit ratio

Redis Metrics:
- Memory usage
- Eviction rate
- Hit rate
- Queue sizes
```

### Recommended Tools

- **Datadog** - Full observability
- **New Relic** - APM focus
- **Prometheus** - Open source metrics
- **PagerDuty** - Incident management

### Critical Alerts

```
1. API Error Rate > 5%
2. Database Connection Pool Exhausted
3. Redis Memory > 90%
4. Scraper Worker Failed for > 1 hour
5. Trend Engine Lag > 30 min
6. Disk Usage > 80%
```

## Auto-Scaling Configuration

### API Scaling Policy
```
- Target CPU: 70%
- Min instances: 2
- Max instances: 10
- Scale-up response: 2 min
- Scale-down response: 10 min
```

### Worker Scaling Policy
```
- Scraper: Min 1, Max 5 (based on queue depth)
- Trend Engine: Min 1, Max 3 (based on processing queue)
```

## Backup & Disaster Recovery

### Database Backups

```bash
# Daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Retention: 30 days
find /backups -name "db_*.sql.gz" -mtime +30 -delete

# Test restore monthly
pg_restore < /backups/db_latest.sql.gz
```

### Secrets Management

```bash
# Use environment-specific vaults
- Development: Local .env (git-ignored)
- Staging: Service provider vault
- Production: AWS Secrets Manager / HashiCorp Vault

# Rotation: Every 90 days
```

## Performance Optimization

### Frontend Optimization
```
- Image optimization: Next.js built-in
- Code splitting: Automatic
- Caching: API responses 1hr
- CDN: Cloudflare / Fastly
```

### Backend Optimization
```
- Query optimization: Indexes on hot paths
- Connection pooling: 20 connections
- Response compression: gzip enabled
- Rate limiting: 100 req/15min per IP
```

### Database Optimization
```
-- Add missing indexes
ANALYZE trends;
ANALYZE discussions;

-- Vacuum regularly
VACUUM ANALYZE;

-- Monitor query performance
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
- Test: Type-check, lint, build
- Stage: Deploy to staging
- Manual: Production approval
- Deploy: Blue-green deployment
- Monitor: Check health for 5 min
```

### Rollback Strategy

```bash
# Automatic rollback if health checks fail
# Manual rollback available for 30 days

# Deployment history
docker images | grep trend-hijacker

# Rollback command
docker-compose down
docker pull trend-hijacker:previous-tag
docker-compose up -d
```

## Security Hardening

### API Security
- Enable HTTPS/TLS
- CORS whitelist production domain
- Rate limiting per IP
- Input validation (Zod)
- SQL injection prevention (parameterized queries)

### Database Security
- Enforce strong passwords
- Enable SSL connections
- Restrict IP whitelist
- Enable query logging
- Regular backups

### Environment Security
- Use managed secrets (not .env in production)
- Rotate API keys quarterly
- Audit access logs
- Enable VPC security groups
- Use private subnets for database

## Cost Optimization

### Development
- Use smallest instance types (t3.micro)
- Turn off non-production environments
- Use spot instances for workers

### Production
- Reserved instances: 30% discount
- Compute optimization: Right-size instances
- Storage: Archive old metrics after 90 days
- Data transfer: Optimize inter-region traffic

### Estimated Monthly Costs

```
Render (MVP):        $20-30
AWS (Production):    $100-300
DigitalOcean (Mid):  $20-50
Self-hosted:         $50+ (compute)
```

## Maintenance Schedule

### Weekly
- Monitor error rates and performance
- Check database size growth
- Review scraper success rates

### Monthly
- Database maintenance (ANALYZE, VACUUM)
- Backup restoration test
- Security audit logs review
- Performance optimization

### Quarterly
- Security patch updates
- Dependency updates
- Capacity planning review
- Cost optimization audit

## Support & Debugging

### Common Issues

**Issue: High Database Latency**
```sql
-- Check long-running queries
SELECT * FROM pg_stat_activity 
WHERE query_start < NOW() - INTERVAL '5 minutes';

-- Add index
CREATE INDEX on discussions(source);
```

**Issue: Memory Leaks in Workers**
```bash
# Monitor memory usage
docker stats trend-hijacker-scraper

# Restart if > 500MB
docker restart trend-hijacker-scraper
```

**Issue: Queue Backlog**
```bash
# Check queue depth
redis-cli XLEN scrape_queue

# Increase worker concurrency
WORKER_CONCURRENCY=5 npm start
```

## Next Steps

1. ✅ Complete development locally
2. ✅ Deploy to staging environment
3. ✅ Load testing (10k req/sec)
4. ✅ Security audit
5. ✅ Production deployment
6. ✅ Monitor and optimize
