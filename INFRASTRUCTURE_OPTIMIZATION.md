# Infrastructure Optimization - Trend Hijacker v2.0

Complete production-ready infrastructure setup for scaling Trend Hijacker to handle 1000+ concurrent users with <100ms p95 latency.

## Overview

This infrastructure package includes:
- **Database Optimization**: Replication, pooling, and advanced indexing
- **Load Testing Suite**: Comprehensive k6 test scripts for baseline, ramp, spike, and stress testing
- **APM & Monitoring**: Metrics collection, Prometheus scraping, and Grafana dashboards
- **Test Data Generation**: Realistic data sets for load testing (10K+ trends, 100K+ discussions)

## Performance Targets

- **p95 Latency**: <100ms
- **p99 Latency**: <500ms
- **Error Rate**: <0.1% (<1 in 1000 requests)
- **Throughput**: >1000 req/sec
- **CPU Usage**: <70%
- **Memory Usage**: <80%
- **Disk Usage**: <85%

## Architecture

### Database Layer

#### Files
- `infrastructure/database/postgresql-replica-setup.sql` - Replication & pooling configuration
- `infrastructure/database/indexes.sql` - Optimized indexes for all critical queries
- `apps/api/src/services/database.service.ts` - Connection pool management

#### Key Features

**Streaming Replication**
- Primary-to-replica continuous WAL streaming
- Synchronous commit for data consistency
- Read replicas for scaling read workloads

**Connection Pooling (pgBouncer)**
- Default pool size: 25 connections
- Min/max: 10/100 connections
- Transaction-level connection reuse
- Automatic connection retry

**Indexes**
- Composite indexes for high-volume queries
- Full-text search indexes (GIN)
- Partial indexes for common queries
- BRIN indexes for time-series data

**Partitioning Strategy**
- Time-based partitioning for `discussions` table
- Monthly partitions with automatic archival
- Reduces query scans by 90%+ for time-range queries

### Load Testing

#### Files
- `infrastructure/load-tests/baseline.js` - 100 concurrent users for 10 minutes
- `infrastructure/load-tests/ramp.js` - Ramp from 100 to 1000 users over 20 minutes
- `infrastructure/load-tests/spike.js` - Baseline 100 users, spike to 500 for 5 minutes
- `infrastructure/load-tests/stress.js` - Increment by 100 users every 2 minutes until failure

#### Test Scenarios

**Baseline Test**
```bash
k6 run infrastructure/load-tests/baseline.js \
  --vus 100 --duration 10m \
  --env BASE_URL=http://api:3000 \
  --env AUTH_TOKEN=your_token
```

**Ramp Test** - Identifies performance degradation under load
```bash
k6 run infrastructure/load-tests/ramp.js \
  --env BASE_URL=http://api:3000
```

**Spike Test** - Simulates sudden traffic increases
```bash
k6 run infrastructure/load-tests/spike.js \
  --env BASE_URL=http://api:3000
```

**Stress Test** - Finds breaking point
```bash
k6 run infrastructure/load-tests/stress.js \
  --env BASE_URL=http://api:3000
```

#### Test Metrics Collected

- Response time p50/p95/p99
- Error rate by status code
- Throughput (requests/sec)
- Connection pool utilization
- Query latency by endpoint
- Memory and CPU impact

### APM & Monitoring

#### Files
- `apps/api/src/middleware/performance.middleware.ts` - Request timing middleware
- `apps/api/src/services/metrics.service.ts` - Metrics collection and aggregation
- `infrastructure/monitoring/prometheus-config.yml` - Prometheus scrape configuration
- `infrastructure/monitoring/alert-rules.yml` - Alert rules for SLO violations
- `infrastructure/monitoring/grafana-dashboard.json` - Pre-built dashboard

#### Monitoring Architecture

```
API Requests
    ↓
[Performance Middleware] - Records timing & errors
    ↓
[Metrics Service] - Aggregates metrics
    ↓
Prometheus Scraper - Pulls metrics every 15s
    ↓
Prometheus Database - Stores metrics
    ↓
Grafana Dashboards - Visualizes data
Alert Rules - Triggers on SLO violations
```

#### Key Metrics

**API Performance**
- `http_requests_total` - Total requests by endpoint, status, method
- `http_request_duration_seconds` - Request latency histogram
- `http_request_size_bytes` - Request payload size
- `http_response_size_bytes` - Response payload size

**Database Performance**
- `pg_stat_statements_mean_time` - Average query time
- `pg_stat_activity_count` - Active connections
- `pg_replication_lag_seconds` - Replica lag
- `pg_database_size_bytes` - Database size

**System Resources**
- CPU usage percentage
- Memory usage percentage
- Disk usage percentage
- Disk I/O time

**Error Tracking**
- Error count by type
- Error rate by endpoint
- Stack traces for all errors

### Alert Rules

**Critical Alerts** (Immediate action required)
- Error rate > 10% for 2 minutes
- p99 latency > 1 second for 5 minutes
- Database connections > 90% for 5 minutes
- CPU usage > 90% for 2 minutes
- Memory usage > 95% for 2 minutes
- API service down for 1 minute
- Database replication lag > 10 seconds

**Warning Alerts** (Investigate soon)
- Error rate > 5% for 5 minutes
- p95 latency > 100ms for 5 minutes
- Database connections > 80% for 5 minutes
- CPU usage > 70% for 5 minutes
- Memory usage > 80% for 5 minutes
- Disk usage > 80% for 5 minutes

### Grafana Dashboard

Pre-built dashboard includes:

**Real-time Metrics**
- Request rate and error rate
- Response time percentiles (p50, p95, p99)
- SLO compliance status

**Performance Analysis**
- Top 10 slowest endpoints
- HTTP status code distribution
- Requests by endpoint

**Database Health**
- Connection pool utilization
- Query performance (p95)
- Replication lag

**System Health**
- CPU, Memory, Disk usage gauges
- Database size
- Cache hit ratio
- System uptime

## Test Data Generation

#### Files
- `infrastructure/test-data-generator.ts` - Generates realistic test data

#### Generated Data Sets

Default configuration:
- 1,000 users across 500 workspaces
- 10,000 trends with varied scores and categories
- 100,000 discussions from 5 sources
- 300,000 trend-discussion relationships
- 30 days of metrics per trend

#### Usage

```bash
# Generate test data
DATABASE_URL="postgresql://user:pass@localhost/trend_hijacker" \
TRENDS_COUNT=10000 \
DISCUSSIONS_COUNT=100000 \
npx ts-node infrastructure/test-data-generator.ts

# Custom sizes
TRENDS_COUNT=50000 \
DISCUSSIONS_COUNT=500000 \
npx ts-node infrastructure/test-data-generator.ts
```

## Setup Instructions

### 1. Database Setup

```bash
# Apply replica configuration
psql postgresql://user:pass@primary:5432/trend_hijacker \
  < infrastructure/database/postgresql-replica-setup.sql

# Create indexes
psql postgresql://user:pass@primary:5432/trend_hijacker \
  < infrastructure/database/indexes.sql

# Verify replication status
psql -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"
```

### 2. Connection Pool Setup (pgBouncer)

```bash
# Install pgBouncer
apt-get install pgbouncer

# Copy configuration
cp infrastructure/pgbouncer.ini /etc/pgbouncer/

# Start pgBouncer
systemctl start pgbouncer

# Verify connection pool
psql -h pgbouncer-host -p 6432 -d pgbouncer -c "SHOW STATS;"
```

### 3. Generate Test Data

```bash
DATABASE_URL="postgresql://user:pass@localhost/trend_hijacker" \
npx ts-node infrastructure/test-data-generator.ts
```

### 4. Setup APM

```bash
# Install Prometheus
docker run -d \
  -p 9090:9090 \
  -v ./infrastructure/monitoring/prometheus-config.yml:/etc/prometheus/prometheus.yml \
  -v ./infrastructure/monitoring/alert-rules.yml:/etc/prometheus/rules/alerts.yml \
  prom/prometheus

# Install Grafana
docker run -d \
  -p 3001:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana

# Import dashboard
# Open Grafana → Dashboards → Import
# Paste content from infrastructure/monitoring/grafana-dashboard.json
```

### 5. Setup API Middleware

```typescript
import { performanceMetricsMiddleware, errorTrackingMiddleware } from '@services/middleware/performance.middleware';
import { MetricsService } from '@services/metrics.service';

const metricsService = new MetricsService();

// Register middleware
app.use(performanceMetricsMiddleware(metricsService));
app.use(errorTrackingMiddleware(metricsService));

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(metricsService.getPerformanceReport());
});
```

### 6. Run Load Tests

```bash
# Make sure API is running
npm run dev

# Run baseline test
k6 run infrastructure/load-tests/baseline.js \
  --vus 100 --duration 10m \
  --env BASE_URL=http://localhost:3000

# Run ramp test
k6 run infrastructure/load-tests/ramp.js \
  --env BASE_URL=http://localhost:3000

# Run spike test
k6 run infrastructure/load-tests/spike.js \
  --env BASE_URL=http://localhost:3000

# Run stress test
k6 run infrastructure/load-tests/stress.js \
  --env BASE_URL=http://localhost:3000
```

## Performance Tuning

### Database Tuning

```sql
-- Check slow queries
SELECT query, calls, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;

-- Analyze table statistics
ANALYZE trends;
ANALYZE discussions;

-- Vacuum dead tuples
VACUUM ANALYZE trend_metrics;

-- Rebuild fragmented indexes
REINDEX TABLE trends;
```

### Connection Pool Tuning

Monitor pgBouncer stats:
```bash
psql -h pgbouncer -p 6432 pgbouncer -c "SHOW STATS;"
```

Adjust `pgbouncer.ini`:
```ini
default_pool_size = 25    # Increase if connection pool exhausted
max_client_conn = 1000    # Increase for more concurrent connections
server_idle_timeout = 600 # Disconnect idle server connections
```

### Query Optimization

Use EXPLAIN ANALYZE:
```sql
EXPLAIN ANALYZE SELECT * FROM trends 
WHERE opportunity_score > 7 
ORDER BY created_at DESC LIMIT 20;
```

Create indexes for slow queries:
```sql
CREATE INDEX CONCURRENTLY idx_trends_custom 
ON trends(score DESC, created_at DESC) 
WHERE status = 'emerging';
```

## Troubleshooting

### High Latency
1. Check database replication lag: `SELECT pg_last_xact_replay_timestamp();`
2. Monitor slow queries: `SELECT * FROM pg_stat_statements ORDER BY mean_time DESC;`
3. Check index usage: `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;`
4. Monitor CPU: `top -b -n 1 | head -20`

### Connection Pool Exhaustion
1. Check active connections: `SELECT count(*) FROM pg_stat_activity;`
2. Increase pool size in pgbouncer.ini
3. Check for connection leaks in application
4. Monitor query duration: `SELECT * FROM pg_stat_activity WHERE state != 'idle';`

### High Memory Usage
1. Check query plans for missing indexes
2. Reduce `work_mem` if necessary
3. Monitor application heap: `node --inspect app.js`
4. Check for memory leaks in middleware

### Error Rate Spike
1. Check application logs: `docker logs api`
2. Monitor error metrics in Grafana
3. Check database connectivity
4. Look for rate limiting or capacity issues

## Scaling Guidelines

### Horizontal Scaling

**API Layer**
- Add more API replicas (K8s deployment scale)
- Load balance with Nginx/HAProxy
- Use sticky sessions for stateful operations

**Database Layer**
- Add read replicas for read-heavy workloads
- Use sharding for extremely large datasets
- Consider managed database services (RDS, Cloud SQL)

**Cache Layer**
- Add Redis for session caching
- Cache trending queries (24-hour TTL)
- Implement query result caching

### Vertical Scaling

**Database Server**
- Increase shared_buffers to 32GB
- Increase effective_cache_size to 96GB
- Use SSD storage for better I/O

**API Server**
- Increase available memory to 16GB+
- Use multi-core processors
- Enable compression in middleware

## Maintenance Schedule

**Daily**
- Monitor Grafana dashboard for anomalies
- Check alert notifications
- Review error logs

**Weekly**
- Run baseline load test to verify performance
- Analyze slow query log
- Check replication status

**Monthly**
- Full VACUUM ANALYZE on high-volume tables
- Index maintenance (REINDEX if needed)
- Database backup verification
- Review and update alert thresholds

**Quarterly**
- Capacity planning based on growth trends
- Database CLUSTER on large tables
- Update table statistics
- Performance tuning optimization

## References

- [PostgreSQL Replication Documentation](https://www.postgresql.org/docs/current/warm-standby.html)
- [pgBouncer Configuration](https://pgbouncer.github.io/config.html)
- [k6 Load Testing](https://k6.io/docs/)
- [Prometheus Alerting](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)

## Support

For issues or questions about the infrastructure optimization:
1. Check Grafana dashboards for performance anomalies
2. Review alert history for recent incidents
3. Consult troubleshooting section above
4. Check application logs for errors
5. Run diagnostic queries from Database Tuning section
