/**
 * Database Schema Types and Queries
 */

import { Trend, Discussion, PainPoint, User } from '@packages/types';

// SQL Schema (to be executed on database initialization)
export const initSQL = `
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'enterprise')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

  -- Trends table
  CREATE TABLE IF NOT EXISTS trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    opportunity_score FLOAT NOT NULL,
    velocity_score FLOAT NOT NULL,
    problem_intensity FLOAT NOT NULL,
    novelty_score FLOAT NOT NULL,
    discussion_count INT DEFAULT 0,
    source_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'emerging' CHECK (status IN ('emerging', 'growing', 'peak', 'declining', 'stable')),
    category VARCHAR(100),
    suggested_ideas TEXT[],
    market_potential_estimate VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    peak_date TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_trends_score ON trends(opportunity_score DESC);
  CREATE INDEX IF NOT EXISTS idx_trends_created ON trends(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_trends_status ON trends(status);

  -- Discussions table
  CREATE TABLE IF NOT EXISTS discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL CHECK (source IN ('reddit', 'hackernews', 'producthunt', 'indiehackers', 'rss')),
    source_id VARCHAR(255) UNIQUE NOT NULL,
    url VARCHAR(1000) NOT NULL,
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
  );

  CREATE INDEX IF NOT EXISTS idx_discussions_source_id ON discussions(source, source_id);
  CREATE INDEX IF NOT EXISTS idx_discussions_created ON discussions(created_at);
  CREATE INDEX IF NOT EXISTS idx_discussions_fetched ON discussions(fetched_at);

  -- Trend-Discussion mapping
  CREATE TABLE IF NOT EXISTS trend_discussions (
    trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    relevance_score FLOAT NOT NULL,
    PRIMARY KEY (trend_id, discussion_id)
  );

  CREATE INDEX IF NOT EXISTS idx_trend_discussions_trend ON trend_discussions(trend_id);

  -- Trend metrics for velocity tracking
  CREATE TABLE IF NOT EXISTS trend_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    mention_count INT NOT NULL,
    velocity FLOAT NOT NULL,
    acceleration FLOAT NOT NULL,
    sentiment_avg FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_trend_metrics_trend_timestamp ON trend_metrics(trend_id, timestamp DESC);

  -- Pain points
  CREATE TABLE IF NOT EXISTS pain_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
    pattern_phrase VARCHAR(500) NOT NULL,
    match_count INT NOT NULL,
    intensity FLOAT NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_pain_points_trend ON pain_points(trend_id);
  CREATE INDEX IF NOT EXISTS idx_pain_points_last_seen ON pain_points(last_seen DESC);

  -- Scraper state tracking
  CREATE TABLE IF NOT EXISTS scraper_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL UNIQUE,
    last_cursor VARCHAR(255),
    last_timestamp TIMESTAMP,
    processed_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'error')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_scraper_state_source ON scraper_state(source);

  -- Feature flags
  CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    enabled_for_tiers TEXT[] DEFAULT ARRAY['premium', 'enterprise'],
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

// Query Helpers
export const queries = {
  trends: {
    getAll: (limit = 20, offset = 0) =>
      `SELECT * FROM trends ORDER BY opportunity_score DESC, created_at DESC LIMIT $1 OFFSET $2`,
    getById: `SELECT * FROM trends WHERE id = $1`,
    getByStatus: `SELECT * FROM trends WHERE status = $1 ORDER BY opportunity_score DESC LIMIT $2`,
    top: (timeframe: string) =>
      `SELECT * FROM trends WHERE created_at > NOW() - INTERVAL '${timeframe}' ORDER BY opportunity_score DESC LIMIT 10`,
    create: `
      INSERT INTO trends (title, summary, opportunity_score, velocity_score, problem_intensity, novelty_score, discussion_count, source_count, status, category, suggested_ideas)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
    update: `
      UPDATE trends SET title = $2, summary = $3, opportunity_score = $4, status = $5, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    incrementDiscussionCount: `UPDATE trends SET discussion_count = discussion_count + 1 WHERE id = $1`,
  },

  discussions: {
    getById: `SELECT * FROM discussions WHERE id = $1`,
    getBySourceId: `SELECT * FROM discussions WHERE source = $1 AND source_id = $2`,
    import: `
      INSERT INTO discussions (source, source_id, url, title, content, author, upvotes, comments_count, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (source_id) DO UPDATE SET upvotes = EXCLUDED.upvotes, comments_count = EXCLUDED.comments_count
      RETURNING id
    `,
    findRecent: `
      SELECT * FROM discussions WHERE created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC LIMIT $1
    `,
  },

  painPoints: {
    getFForTrend: `SELECT * FROM pain_points WHERE trend_id = $1 ORDER BY intensity DESC`,
    create: `
      INSERT INTO pain_points (trend_id, pattern_phrase, match_count, intensity, last_seen)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
  },

  metrics: {
    recordMetric: `
      INSERT INTO trend_metrics (trend_id, timestamp, mention_count, velocity, acceleration, sentiment_avg)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    getTrendHistory: `
      SELECT * FROM trend_metrics WHERE trend_id = $1 ORDER BY timestamp DESC LIMIT $2
    `,
  },
};
