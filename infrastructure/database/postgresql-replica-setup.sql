-- PostgreSQL Replication Setup for Trend Hijacker v2.0
-- Production-grade streaming replication with WAL configuration

-- ============================================================
-- PRIMARY SERVER CONFIGURATION (postgresql.conf)
-- ============================================================

/*
max_wal_senders = 10
wal_keep_size = 1GB
wal_level = replica
wal_compression = on
wal_buffers = 16MB
archive_mode = on
archive_command = 'test ! -f /mnt/server/archive/%f && cp %p /mnt/server/archive/%f'
synchronous_commit = remote_apply
synchronous_standby_names = 'standby1,standby2'
*/

-- ============================================================
-- REPLICATION USER SETUP (on PRIMARY)
-- ============================================================

-- Create replication user with appropriate permissions
CREATE USER replication_user WITH REPLICATION ENCRYPTED PASSWORD 'secure_replication_password_here';

-- Add to pg_hba.conf for replication access:
-- host    replication     replication_user    10.0.0.0/8    md5
-- host    replication     replication_user    ::1/128       md5

-- ============================================================
-- CONNECTION POOLING - PGBOUNCER CONFIGURATION
-- ============================================================

-- File: /etc/pgbouncer/pgbouncer.ini
/*
[databases]
trend_hijacker = host=10.0.1.100 port=5432 dbname=trend_hijacker user=app_user password=secure_password

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 50
server_idle_timeout = 600
server_connection_timeout = 15
server_login_retry = 15
query_wait_timeout = 120
client_idle_timeout = 300
client_login_timeout = 60

listen_port = 6432
listen_addr = 0.0.0.0
unix_socket_dir = /var/run/pgbouncer
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
log_stats = 1
stats_period = 60

application_name_add_host = 1
*/

-- ============================================================
-- PGBOUNCER USER LIST FILE
-- ============================================================

-- File: /etc/pgbouncer/userlist.txt
-- Format: "username" "password_hash"
/*
"app_user" "md58f1b3f6a7c9e4d5b2a6c8e0f3b5d7a9c"
"replication_user" "md5replica_password_hash_here"
"read_replica_user" "md5read_replica_password_hash"
*/

-- ============================================================
-- PHYSICAL STANDBY REPLICATION SETUP
-- ============================================================

-- Execute these commands on PRIMARY to initiate backup:
-- pg_basebackup -h 10.0.1.100 -U replication_user -D /var/lib/postgresql/data -v -P -W

-- Create recovery.conf on STANDBY:
/*
standby_mode = 'on'
primary_conninfo = 'host=10.0.1.100 port=5432 user=replication_user password=secure_password application_name=standby1'
restore_command = 'cp /mnt/server/archive/%f %p'
wal_retrieve_retry_interval = '5s'
recovery_min_apply_delay = '0'
*/

-- ============================================================
-- LOGICAL REPLICATION SETUP (for future use)
-- ============================================================

-- Enable logical replication
-- Set in postgresql.conf: wal_level = logical

-- Create publication for high-volume tables
CREATE PUBLICATION trends_publication FOR TABLE 
  trends, 
  discussions, 
  trend_metrics 
WITH (publish = 'insert,update,delete');

-- Subscriber can use:
-- CREATE SUBSCRIPTION trends_sub CONNECTION 'dbname=trend_hijacker host=primary_host ...' 
-- PUBLICATION trends_publication;

-- ============================================================
-- INDEX OPTIMIZATION - COMPOSITE INDEXES
-- ============================================================

-- HIGH-PRIORITY INDEXES for query optimization

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_score_date 
ON trends(opportunity_score DESC, created_at DESC) 
WHERE status IN ('emerging', 'growing', 'peak');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_velocity_score 
ON trends(velocity_score DESC, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_source_created 
ON discussions(source, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '90 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_sentiment_upvotes 
ON discussions(sentiment_score DESC, upvotes DESC) 
WHERE comments_count > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trend_discussions_relevance 
ON trend_discussions(trend_id, relevance_score DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_workspace 
ON users(workspace_id, email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_user_status 
ON alerts(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action 
ON audit_logs(user_id, action, timestamp DESC);

-- ============================================================
-- PARTITIONING STRATEGY - TIME-BASED PARTITIONING
-- ============================================================

-- Partition discussions by month for high-volume table
-- This allows archiving and faster queries

/*
CREATE TABLE discussions_partitioned (
  id UUID,
  source VARCHAR(50),
  source_id VARCHAR(255),
  url VARCHAR(1000),
  title VARCHAR(500),
  content TEXT,
  author VARCHAR(255),
  upvotes INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  sentiment_score FLOAT,
  extracted_keywords TEXT[],
  pain_points_detected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create partitions for each month
CREATE TABLE discussions_2024_01 PARTITION OF discussions_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE discussions_2024_02 PARTITION OF discussions_partitioned
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Add more partitions as needed...

-- Create indexes on partitions
CREATE INDEX idx_discussions_2024_01_source 
ON discussions_2024_01(source, created_at DESC);

CREATE INDEX idx_discussions_2024_01_sentiment 
ON discussions_2024_01(sentiment_score DESC);
*/

-- ============================================================
-- MAINTENANCE OPERATIONS
-- ============================================================

-- Vacuum strategy configuration (in postgresql.conf)
/*
autovacuum = on
autovacuum_naptime = 10s
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.05
autovacuum_vacuum_cost_delay = 10ms
autovacuum_vacuum_cost_limit = 200
*/

-- Manual maintenance commands (run during low-traffic windows)
-- VACUUM ANALYZE trends;
-- VACUUM ANALYZE discussions;
-- VACUUM ANALYZE trend_metrics;
-- REINDEX TABLE trends;

-- ============================================================
-- MONITORING & HEALTH CHECKS
-- ============================================================

-- Check replication status
-- SELECT client_addr, usename, state, sync_state FROM pg_stat_replication;

-- Check WAL position
-- SELECT pg_current_wal_lsn(), pg_current_wal_flush_lsn(), pg_current_wal_write_lsn();

-- Check replica lag
-- SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) as replication_lag_seconds;

-- ============================================================
-- PERFORMANCE TUNING PARAMETERS
-- ============================================================

-- Memory configuration (in postgresql.conf)
/*
shared_buffers = 32GB              # 25% of system RAM
effective_cache_size = 96GB        # 75% of system RAM
maintenance_work_mem = 8GB
work_mem = 32MB
*/

-- Query performance configuration
/*
random_page_cost = 1.1             # SSD-optimized
effective_io_concurrency = 200
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_worker_processes = 8
*/

-- Connection limits
/*
max_connections = 500
superuser_reserved_connections = 5
*/

-- ============================================================
-- BACKUP STRATEGY
-- ============================================================

-- pg_dump for logical backups
-- pg_dump -U postgres -h localhost trend_hijacker > backup_$(date +%Y%m%d_%H%M%S).sql

-- WAL archiving (already configured above)
-- Retention: keep last 30 days of WAL files

-- Point-in-time recovery window:
-- wal_keep_size = 1GB (approximately 1 hour of transactions at normal load)

-- ============================================================
-- SCRIPT: Enable Streaming Replication
-- ============================================================

-- Execute on PRIMARY to enable streaming replication
-- SELECT pg_create_physical_replication_slot('standby1_slot', 'permanent');
-- SELECT * FROM pg_replication_slots;

-- ============================================================
-- SCRIPT: Monitor Replica Health
-- ============================================================

-- Run regularly to ensure replica is catching up
-- SELECT 
--   client_addr,
--   usename,
--   application_name,
--   state,
--   sync_state,
--   replay_lag,
--   flush_lsn,
--   replay_lsn
-- FROM pg_stat_replication;

-- ============================================================
-- CONNECTION STRING FOR APPLICATIONS
-- ============================================================

-- Primary (write operations):
-- postgresql://app_user:password@pgbouncer-host:6432/trend_hijacker?application_name=app_primary

-- Read replica (read-only operations via connection pooling):
-- postgresql://app_user:password@read-replica-pgbouncer:6432/trend_hijacker?application_name=app_replica

-- ============================================================
-- END OF REPLICATION SETUP
-- ============================================================
