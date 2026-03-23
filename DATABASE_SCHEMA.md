# Database Schema - TREND HIJACKER

## PostgreSQL Tables

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'enterprise')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);
```

### trends
```sql
CREATE TABLE trends (
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
  peak_date TIMESTAMP,
  INDEX idx_score (opportunity_score DESC),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_status (status),
  FULLTEXT INDEX ft_title_summary (title, summary)
);
```

### discussions
```sql
CREATE TABLE discussions (
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
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_source_id (source, source_id),
  INDEX idx_created_at (created_at),
  INDEX idx_fetched_at (fetched_at),
  FULLTEXT INDEX ft_content (title, content)
);
```

### trend_discussions
```sql
CREATE TABLE trend_discussions (
  trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  relevance_score FLOAT NOT NULL,
  PRIMARY KEY (trend_id, discussion_id),
  INDEX idx_trend_id (trend_id)
);
```

### trend_metrics
```sql
CREATE TABLE trend_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  mention_count INT NOT NULL,
  velocity FLOAT NOT NULL,
  acceleration FLOAT NOT NULL,
  sentiment_avg FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trend_id_timestamp (trend_id, timestamp DESC)
);
```

### pain_points
```sql
CREATE TABLE pain_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  pattern_phrase VARCHAR(500) NOT NULL,
  match_count INT NOT NULL,
  intensity FLOAT NOT NULL,
  last_seen TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trend_id (trend_id),
  INDEX idx_last_seen (last_seen DESC)
);
```

### scraper_state
```sql
CREATE TABLE scraper_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL UNIQUE,
  last_cursor VARCHAR(255),
  last_timestamp TIMESTAMP,
  processed_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'error')),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_source (source)
);
```

### feature_flags
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  enabled_for_tiers TEXT[] DEFAULT ARRAY['premium', 'enterprise'],
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Indexes
- Composite indexes on frequently queried combinations
- Partial indexes for status != 'declining'
- Full-text search indexes on title, summary, content

## Redis Keys

```
trend:{trend_id}               → Cached trend data
discussion:{source}:{source_id} → Cached discussion
trends:top:day                 → Top trends (leaderboard)
trends:top:week
cache:user:{user_id}:tier      → User tier cache
queue:scrape:{source}          → Job queue
queue:process                  → Processing queue
velocity:{trend_id}:{date}     → Velocity metrics
```

## Migrations
- Use Drizzle ORM or similar for migrations
- Version control in `/infrastructure/migrations/`
