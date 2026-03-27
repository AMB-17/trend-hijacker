-- Database Indexes for Trend Hijacker v2.0
-- Optimized for high-traffic queries and analytical workloads

-- ============================================================
-- CRITICAL INDEXES FOR TRENDS TABLE
-- ============================================================

-- Index for opportunity score and created date (most common sort)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_opportunity_score_created
ON trends(opportunity_score DESC, created_at DESC)
WHERE status IN ('emerging', 'growing', 'peak');

-- Index for velocity-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_velocity_created
ON trends(velocity_score DESC, created_at DESC);

-- Index for status filtering with date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_status_created
ON trends(status, created_at DESC);

-- Index for category filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_category_score
ON trends(category, opportunity_score DESC)
WHERE category IS NOT NULL;

-- Index for problem intensity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_problem_intensity
ON trends(problem_intensity DESC);

-- Index for novelty score
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_novelty_score
ON trends(novelty_score DESC);

-- Partial index for active trends (common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_active
ON trends(created_at DESC)
WHERE status IN ('emerging', 'growing', 'peak')
  AND created_at > NOW() - INTERVAL '30 days';

-- ============================================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================================

-- Full-text search on trends (title and summary)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_fts
ON trends USING GIN(to_tsvector('english', title || ' ' || COALESCE(summary, '')));

-- Full-text search on discussions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_fts
ON discussions USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Keyword array search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_keywords
ON discussions USING GIN(extracted_keywords);

-- ============================================================
-- CRITICAL INDEXES FOR DISCUSSIONS TABLE
-- ============================================================

-- Index for source and created date (high-volume queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_source_created
ON discussions(source, created_at DESC)
WHERE created_at > NOW() - INTERVAL '90 days';

-- Index for recent discussions (last 7 days - common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_recent
ON discussions(created_at DESC)
WHERE created_at > NOW() - INTERVAL '7 days';

-- Index for sentiment analysis queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_sentiment_upvotes
ON discussions(sentiment_score DESC, upvotes DESC)
WHERE comments_count > 0;

-- Index for source_id lookups (deduplication)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_source_id
ON discussions(source, source_id)
WHERE fetched_at > NOW() - INTERVAL '30 days';

-- Index for engagement queries (upvotes + comments)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_engagement
ON discussions(upvotes DESC, comments_count DESC)
WHERE created_at > NOW() - INTERVAL '14 days';

-- Index for pain point detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_pain_points
ON discussions(pain_points_detected, created_at DESC)
WHERE pain_points_detected = true;

-- ============================================================
-- TREND DISCUSSIONS JUNCTION TABLE INDEXES
-- ============================================================

-- Primary lookup: trend -> discussions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trend_discussions_trend_relevance
ON trend_discussions(trend_id, relevance_score DESC);

-- Reverse lookup: discussion -> trends
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trend_discussions_discussion
ON trend_discussions(discussion_id, relevance_score DESC);

-- High-relevance discussions for a trend
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trend_discussions_high_relevance
ON trend_discussions(trend_id, relevance_score DESC)
WHERE relevance_score > 0.7;

-- ============================================================
-- TREND METRICS INDEXES (TIME-SERIES DATA)
-- ============================================================

-- Index for time-series queries on trends
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trend_metrics_trend_timestamp
ON trend_metrics(trend_id, timestamp DESC)
WHERE timestamp > NOW() - INTERVAL '90 days';

-- Index for velocity calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trend_metrics_velocity
ON trend_metrics(trend_id, velocity DESC, timestamp DESC);

-- Index for recent metrics (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trend_metrics_recent
ON trend_metrics(timestamp DESC)
WHERE timestamp > NOW() - INTERVAL '7 days';

-- Index for aggregate queries by day
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trend_metrics_daily
ON trend_metrics(trend_id, DATE(timestamp) DESC);

-- ============================================================
-- USER-RELATED INDEXES
-- ============================================================

-- Email lookups (authentication)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
ON users(email);

-- Workspace and email composite (common filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_workspace_email
ON users(workspace_id, email)
WHERE deleted_at IS NULL;

-- Tier filtering (feature access control)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tier_created
ON users(tier, created_at DESC)
WHERE deleted_at IS NULL;

-- ============================================================
-- ALERTS & NOTIFICATIONS INDEXES
-- ============================================================

-- User alerts status (high-priority query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_user_status_created
ON alerts(user_id, status, created_at DESC);

-- Pending alerts for processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_pending
ON alerts(created_at ASC)
WHERE status = 'pending';

-- Unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_unread
ON alerts(user_id, created_at DESC)
WHERE status = 'unread';

-- ============================================================
-- AUDIT LOGS INDEXES
-- ============================================================

-- User action history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action
ON audit_logs(user_id, action, timestamp DESC);

-- Recent audit logs for compliance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_recent
ON audit_logs(timestamp DESC)
WHERE timestamp > NOW() - INTERVAL '30 days';

-- Sensitive action tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_sensitive
ON audit_logs(action, timestamp DESC)
WHERE action IN ('delete', 'update_permission', 'export');

-- ============================================================
-- WORKSPACE & COLLECTIONS INDEXES
-- ============================================================

-- Workspace membership queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_workspace
ON workspace_members(workspace_id, user_id);

-- Collection queries by workspace
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collections_workspace_owner
ON collections(workspace_id, created_by, created_at DESC);

-- Shared collection access
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_shares_user
ON collection_shares(shared_with_user_id, created_at DESC)
WHERE permission IN ('view', 'edit');

-- ============================================================
-- SAVED ITEMS INDEXES
-- ============================================================

-- User's saved trends
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_trends_user_created
ON saved_trends(user_id, created_at DESC);

-- Check if trend is saved
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_trends_user_trend
ON saved_trends(user_id, trend_id);

-- ============================================================
-- PERFORMANCE & CACHING INDEXES
-- ============================================================

-- Cache key lookups (TTL queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_key_expires
ON cache_entries(key, expires_at DESC)
WHERE expires_at > NOW();

-- ============================================================
-- SESSION & AUTHENTICATION INDEXES
-- ============================================================

-- Session lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_token
ON sessions(user_id, token)
WHERE expires_at > NOW();

-- SAML session resolution
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saml_sessions_identifier
ON saml_sessions(name_id, created_at DESC)
WHERE expires_at > NOW();

-- ============================================================
-- GENERAL PURPOSE INDEXES
-- ============================================================

-- Default ID ordering (used in pagination)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_id_created
ON trends(id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_id_created
ON discussions(id, created_at DESC);

-- ============================================================
-- INDEX MAINTENANCE RECOMMENDATIONS
-- ============================================================

/*
MAINTENANCE WINDOW: Daily at 02:00 UTC (low traffic)

1. ANALYZE - Update table statistics
   ANALYZE trends;
   ANALYZE discussions;
   ANALYZE trend_metrics;

2. REINDEX - Rebuild fragmented indexes
   Run monthly or when index bloat > 30%
   SELECT schemaname, tablename, indexname, idx_blks_read, idx_blks_hit
   FROM pg_statio_user_indexes
   ORDER BY idx_blks_read DESC;

3. VACUUM - Clean up dead tuples
   VACUUM ANALYZE trends;
   VACUUM ANALYZE discussions;
   Set autovacuum thresholds appropriately

4. CLUSTER - Reorganize tables by index
   Run quarterly during maintenance window
   CLUSTER trends USING idx_trends_opportunity_score_created;
   CLUSTER discussions USING idx_discussions_source_created;

5. BLOAT MONITORING
   Check index bloat:
   SELECT schemaname, tablename, ROUND(100 * (CASE WHEN otta > 0 THEN sml_heap_size::numeric / otta ELSE 0 END)) AS table_waste_ratio
   FROM pg_stats
   WHERE attrelname IN ('trends', 'discussions', 'trend_metrics');
*/

-- ============================================================
-- MONITORING QUERIES
-- ============================================================

/*
-- Check unused indexes
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check index size
SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check table size
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- Check query plans
EXPLAIN ANALYZE SELECT * FROM trends WHERE opportunity_score > 7.5 ORDER BY created_at DESC LIMIT 20;
*/

-- ============================================================
-- END OF INDEX DEFINITIONS
-- ============================================================
