# TREND HIJACKER - System Architecture

## Overview
TREND HIJACKER is a real-time trend detection platform that identifies emerging opportunities from public internet discussions before they become mainstream.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│  - Dashboard, Trend Cards, Opportunity Map, Visualizations  │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│   Fastify API    │      │   Realtime WS    │
│  (REST Routes)   │      │   (Live Updates) │
└────────┬─────────┘      └──────────────────┘
         │
    ┌────┴─────────────────────────────────┐
    ▼                                       ▼
┌──────────────────────┐         ┌──────────────────────┐
│ Trend Engine Worker  │         │ Scraper Workers      │
└────────┬─────────────┘         └──────────┬───────────┘
         │                                  │
         ├─ TF-IDF Analysis                ├─ Reddit Scraper
         ├─ Velocity Tracking               ├─ HN Scraper
         ├─ Pain Detection                  ├─ Product Hunt
         └─ Opportunity Scoring             ├─ Indie Hackers
                                            └─ RSS Feeds
         │                                  │
         └────────────┬──────────────────────┘
                      ▼
         ┌─────────────────────────┐
         │   Queue (BullMQ)        │
         │   - Scrape Jobs         │
         │   - Processing Tasks    │
         └────────────┬────────────┘
                      ▼
         ┌─────────────────────────┐
         │   PostgreSQL + Redis    │
         │   - Trends              │
         │   - Discussions         │
         │   - Cache               │
         └─────────────────────────┘
```

## Core Components

### 1. Data Ingestion Layer (Scrapers)
- **Multi-source Support**: Reddit, HN, Product Hunt, Indie Hackers, RSS
- **Rate Limiting**: Respectful scraping with delays
- **Error Handling**: Retry logic, fallback strategies
- **Modular Design**: Easy to add new sources

### 2. Trend Detection Engine
**Layer 1: Topic Extraction**
- TF-IDF scoring
- N-gram analysis
- Keyword clustering

**Layer 2: Velocity Tracking**
- Time-series analysis
- Growth acceleration detection
- Seasonality filtering

**Layer 3: Pain Point Detection**
- Linguistic pattern matching
- Sentiment analysis
- Problem phrase extraction

**Layer 4: Opportunity Scoring**
```
opportunity_score = 
  velocity_growth * 0.35 +
  problem_intensity * 0.30 +
  discussion_volume * 0.20 +
  novelty_score * 0.15
```

### 3. Backend API (Fastify)
- Type-safe endpoints with Zod validation
- WebSocket support for real-time updates
- Rate limiting per user
- Feature flagging for tier-based access

### 4. Frontend Dashboard (Next.js)
- Real-time trend cards with momentum graphs
- Opportunity Map visualization (network graph)
- Trend detail pages with sources
- Export functionality for premium users

## Data Model

### Core Entities
- **Trend**: Detected opportunity (id, title, score, timestamp)
- **Discussion**: Source discussion (id, source, url, content, timestamp)
- **PainPoint**: Extracted pain point
- **TrendMetric**: Time-series data for velocity tracking
- **User**: Account with tier info

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind, Shadcn UI |
| Backend | Fastify, Node.js, TypeScript |
| Database | PostgreSQL + Redis |
| Queue | BullMQ |
| Search | Postgres Full-Text + Meilisearch (optional) |
| Real-time | WebSocket via Fastify |

## Deployment Strategy

1. **Local Development**: Docker Compose
2. **Staging**: Single-instance with auto-scaling configuration
3. **Production**: 
   - API servers: Auto-scaling group (AWS/Render)
   - Workers: Separate scaling groups per worker type
   - Database: Managed PostgreSQL (AWS RDS/Neon)
   - Cache: Redis (AWS ElastiCache/Upstash)

## Scaling Strategy

- **Horizontal Scaling**: Workers scale independently
- **Queue-Based**: BullMQ backpressure prevents overload
- **Caching**: Redis for frequent queries
- **Database**: Connection pooling, read replicas for analytics

## Performance Targets

- **Ingestion**: 10k+ posts/hour
- **API Response**: <100ms p95
- **Trend Detection**: Real-time (< 5 min latency)
- **Dashboard Load**: <2s first paint

## Monetization

- **Free Tier**: 10 trends/day, basic insights
- **Premium**: Unlimited trends, early signals, opportunity generator
- **Enterprise**: Custom sources, webhooks, API access
