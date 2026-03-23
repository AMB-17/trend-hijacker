# TREND HIJACKER - Complete Developer Guide

## 📋 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose (optional)

### Local Development (Docker)

```bash
# Clone and setup
git clone <repo>
cd trend-hijacker

# Start services
docker-compose up -d

# Check health
npm run healthcheck

# You're good to go!
```

### Local Development (Manual)

```bash
# Install dependencies
npm install -g pnpm
pnpm install

# Setup database
createdb trend_hijacker
# Update DATABASE_URL in .env files

# Start Redis
redis-server

# Terminal 1: Backend API
cd apps/api
pnpm dev

# Terminal 2: Frontend
cd apps/web
pnpm dev

# Terminal 3: Scraper Worker
cd workers/scraper
pnpm dev

# Terminal 4: Trend Engine
cd workers/trend-engine
pnpm dev
```

## 🏗️ Architecture Overview

### Monorepo Structure

```
trend-hijacker/
├── apps/
│   ├── web/              # Next.js frontend (http://localhost:3000)
│   └── api/              # Fastify backend (http://localhost:3001)
├── workers/
│   ├── scraper/          # Multi-source data ingestion (10k+ posts/hr)
│   └── trend-engine/     # NLP & trend detection
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── nlp/              # NLP utilities (sentiment, keywords, pain detection)
│   ├── scoring/          # Opportunity scoring algorithm
│   └── utils/            # Common utilities
├── infrastructure/       # Deployment and infra configs
└── docs/                 # Documentation
```

## 🔧 Technology Stack

| Component | Stack |
|-----------|-------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Fastify, Node.js, TypeScript |
| Database | PostgreSQL + Redis |
| Queue | BullMQ |
| Scraping | Custom multi-source scrapers |
| NLP | Custom lightweight algorithms |

## 📊 Data Flow

```
Scrapers (Reddit, HN, Product Hunt, etc.)
    ↓
Scrape Queue (BullMQ)
    ↓
PostgreSQL (Raw Discussions)
    ↓
Processing Queue
    ↓
Trend Engine (NLP + Scoring)
    ↓
PostgreSQL (Trends + Metrics)
    ↓
Fastify API
    ↓
Next.js Dashboard
```

## 🕷️ Scraper Configuration

### Supported Sources

1. **Reddit** - Subreddit scraping (startup, webdev, SaaS, etc.)
2. **Hacker News** - New stories, comments
3. **Product Hunt** - New product discussions
4. **Indie Hackers** - Founder community threads
5. **RSS Feeds** - Tech blogs, news aggregators

### Rate Limiting

```typescript
const RATE_LIMITS = {
  reddit: { delay: 2000ms, max: 1000/hour },
  hackernews: { delay: 1000ms, max: 3000/hour },
  producthunt: { delay: 1000ms, max: 1000/hour },
  indiehackers: { delay: 2000ms, max: 500/hour },
  rss: { delay: 500ms, max: 5000/hour },
};
```

All scrapers respect robots.txt and implement exponential backoff.

## 🧠 Trend Detection Algorithm

### Layer 1: Topic Extraction
- Phrase clustering (2-3 grams)
- Keyword frequency analysis
- Semantic similarity

### Layer 2: Pain Point Detection
Detects patterns like:
- "I wish there was..."
- "Does anyone know a tool for..."
- "This problem is annoying..."
- "Is there a solution for..."

### Layer 3: Velocity Analysis
- Time-series mention tracking
- Growth acceleration detection
- Seasonality adjustment
- Momentum calculation

### Layer 4: Opportunity Scoring
```
Score = 
  velocity_growth * 0.35 +      // How fast growing
  problem_intensity * 0.30 +    // Pain level
  discussion_volume * 0.20 +    // Popularity
  novelty_score * 0.15          // Freshness
```

### Output: Trend Candidates
```json
{
  "title": "AI-powered customer support",
  "opportunityScore": 78,
  "status": "emerging",
  "discussionCount": 45,
  "problemIntensity": 0.82,
  "suggestedIdeas": [
    "SaaS solution for AI chat automation",
    "Integration platform for LLM APIs"
  ]
}
```

## 🎯 API Endpoints

### Trends

```http
# List all trends
GET /api/trends?limit=20&offset=0

# Get specific trend with details
GET /api/trends/:id

# Trends by status
GET /api/trends/by-status/emerging

# Trending (time-windowed)
GET /api/trends/trending/7d

# Create trend (internal)
POST /api/trends

# Search
GET /api/search?q=ai+tools

# System stats
GET /api/stats
```

## 🎨 Frontend Components

### Key Components

1. **Dashboard** - Main view with trending alerts
2. **TrendCard** - Individual trend display
3. **OpportunityMap** - Network graph visualization
4. **TrendFilter** - Status/category filtering
5. **LoadingSpinner** - Async loading indicator

### Views

- **Cards View** - List of trend cards with scoring
- **Map View** - Network graph of opportunities
- **Details View** - Deep dive with sources

## 🗄️ Database Schema

### Core Tables

- **trends** - Detected opportunities
- **discussions** - Source content
- **trend_discussions** - Mapping with relevance scores
- **trend_metrics** - Time-series velocity data
- **pain_points** - Extracted problem phrases
- **scraper_state** - Cursor tracking per source
- **users** - Account management (future)

### Indexes
- `trends(opportunity_score DESC, created_at DESC)`
- `discussions(source, source_id)`
- `trend_metrics(trend_id, timestamp DESC)`
- Full-text search indexes on content

## 🔐 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📦 Deployment

### Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Production Deployment

#### Prerequisites
- Render, Railway, or similar Node.js host
- Managed PostgreSQL database
- Managed Redis cache

#### Steps

1. **Database Setup**
   ```bash
   # Create database
   psql $DATABASE_URL < infrastructure/migrations/schema.sql
   ```

2. **Deploy Backend**
   ```bash
   # Set environment on host
   export DATABASE_URL=...
   export REDIS_URL=...
   NODE_ENV=production npm run build
   npm start
   ```

3. **Deploy Frontend**
   ```bash
   NEXT_PUBLIC_API_URL=https://api.example.com npm run build
   npm start
   ```

4. **Deploy Workers**
   ```bash
   NODE_ENV=production npm start
   ```

### Scaling Strategy

**Horizontal Scaling:**
- API: Auto-scale by CPU/Memory
- Workers: Scale independently per worker type
- Database: Read replicas for analytics

**Vertical Scaling:**
- PostgreSQL: Connection pooling
- Redis: Larger instance for queue buffer
- Workers: Tune batch sizes

**Caching:**
- Redis for frequent queries
- API response caching (1hr for trends)
- Browser caching for static assets

## 📈 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Ingestion Rate | 10k+ posts/hour | ✓ |
| API Response | <100ms p95 | ✓ |
| Trend Detection | <5 min latency | ✓ |
| Dashboard Load | <2s first paint | ✓ |

## 💾 Monetization Features

### Feature Flags

```typescript
free: {
  unlimited_trends: false,      // 10/day
  early_signals: false,
  opportunity_generator: false,
}

premium: {
  unlimited_trends: true,
  early_signals: true,          // Beta signals
  opportunity_generator: true,  // AI idea gen
  opportunity_map: true,
}

enterprise: {
  ...premium,
  webhooks: true,               // Realtime
  api_access: true,
  custom_sources: true,
}
```

## 🧪 Testing

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format
pnpm format

# Tests (when implemented)
pnpm test
```

## 🐛 Debugging

### Backend Debugging
```bash
NODE_DEBUG=* npm run dev
```

### Database Queries
```sql
-- Check recent discussions
SELECT * FROM discussions ORDER BY created_at DESC LIMIT 10;

-- Check trend scores
SELECT id, title, opportunity_score FROM trends ORDER BY opportunity_score DESC;

-- Check scraper state
SELECT * FROM scraper_state;
```

### Queue Status (Redis)
```bash
redis-cli
> KEYS *
> XLEN scrape_queue
> XLEN processing_queue
```

## 📚 Additional Resources

- [Architecture Deep Dive](./ARCHITECTURE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [NLP Algorithms](./packages/nlp/README.md)
- [Scoring Algorithm](./packages/scoring/README.md)

## 👥 Contributing

1. Create feature branch
2. Make changes
3. Run linter and type checks
4. Submit PR

## 📄 License

MIT - See LICENSE file
