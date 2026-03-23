# TREND HIJACKER - README

> **Detect emerging internet demand signals before they become mainstream trends**

[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](DEPLOYMENT_GUIDE.md)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org)

## 🎯 Overview

TREND HIJACKER is a production-ready platform that identifies **early business opportunities** from public internet discussions by analyzing behavioral signals and linguistic patterns across Reddit, Hacker News, Product Hunt, Indie Hackers, and RSS feeds.

Unlike basic trending apps, TREND HIJACKER detects:
- **Pain Point Clusters**: Problems people repeatedly mention
- **Unsolved Requests**: "Does anyone know a tool for..."
- **Market Demand Signals**: Growing discussion velocity
- **Idea Gaps**: Features people want but don't exist
- **Early Signals**: Emerging trends before mainstream

## ⚡ Key Features

✅ **Multi-Source Scraping** (10k+ posts/hour)
- Reddit, Hacker News, Product Hunt, Indie Hackers, RSS feeds
- Respectful rate limiting & robots.txt compliance

✅ **Advanced Trend Detection**
- NLP-based pain point detection
- Velocity tracking & growth acceleration
- Opportunity scoring algorithm
- Early signal detection

✅ **Beautiful Dashboard**
- Dark mode UI inspired by Bloomberg Terminal
- Real-time trend cards with opportunity scores
- Opportunity map network visualization
- Customizable filters & views

✅ **Business Insights**
- Suggested startup/SaaS ideas per trend
- Market potential estimates
- Source discussion links
- Trend momentum graphs

✅ **Scalable Architecture**
- Microservices with independent scaling
- Queue-based async processing
- Database connection pooling
- Redis caching

✅ **Production-Ready**
- Docker Compose setup
- GitHub Actions CI/CD
- Monitoring & alerting configured
- Deployment guides included

## 📊 Use Cases

### For Founders
Find underserved markets and validate problems before building

### For Indie Hackers  
Discover gaps in existing tools and services

### For Creators
Identify content trends and audience pain points

### For Marketers
Find emerging markets for your products

## 🚀 Quick Start

### Via Docker Compose (Easiest)

```bash
git clone https://github.com/yourusername/trend-hijacker
cd trend-hijacker

# Start everything
docker-compose up -d

# Wait for services
sleep 10

# Visit dashboard
open http://localhost:3000

# Check health
curl http://localhost:3001/health
```

### Manual Setup

```bash
# Prerequisites: Node.js 20+, PostgreSQL, Redis

# Install dependencies
npm install -g pnpm
pnpm install

# Setup database
createdb trend_hijacker
DATABASE_URL=postgresql://localhost/trend_hijacker npm run db:migrate

# Start services (4 terminals)
cd apps/api && pnpm dev          # Terminal 1
cd apps/web && pnpm dev          # Terminal 2
cd workers/scraper && pnpm dev   # Terminal 3
cd workers/trend-engine && pnpm dev # Terminal 4

# Visit http://localhost:3000
```

## 📁 Project Structure

```
trend-hijacker/
├── apps/
│   ├── web/              # Next.js dashboard
│   └── api/              # Fastify REST API
├── workers/
│   ├── scraper/          # Multi-source data collection
│   └── trend-engine/     # NLP & trend detection
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── nlp/              # NLP utilities
│   ├── scoring/          # Opportunity scoring
│   └── utils/            # Common utilities
├── infrastructure/       # Deployment configs
├── docs/                 # Documentation
└── docker-compose.yml    # Local dev setup
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│        Next.js Dashboard (Port 3000)    │
│  - Trend Cards, Opportunity Map, Stats  │
└────────────────┬────────────────────────┘
                 │
         ┌───────▼─────────┐
         │  Fastify API    │
         │  (Port 3001)    │
         └───────┬─────────┘
                 │
     ┌───────────┼──────────────┐
     ▼           ▼              ▼
┌─────────┐ ┌──────────┐ ┌────────────┐
│ Scraper │ │ BullMQ   │ │ PostgreSQL │
│ Workers │ │ Queues   │ │  + Redis   │
└─────────┘ └──────────┘ └────────────┘
     ▼
┌─────────────────────────┐
│  Trend Engine Workers   │
│  (NLP + Scoring)        │
└─────────────────────────┘
```

## 📈 Opportunity Scoring Formula

```
Score = 
  velocity_growth * 0.35 +      // How fast is it growing?
  problem_intensity * 0.30 +    // How painful is the problem?
  discussion_volume * 0.20 +    // How much discussion?
  novelty_score * 0.15           // How new is this?
```

Range: **0-100** (higher = more opportunity)

## 💻 Tech Stack

| Component | Tech |
|-----------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Fastify, Node.js 20, PostgreSQL |
| Cache/Queue | Redis, BullMQ |
| NLP | Node.js-based pattern matching |
| Deployment | Docker, GitHub Actions |

## 📚 Documentation

- [**ARCHITECTURE.md**](ARCHITECTURE.md) - System design & components
- [**DATABASE_SCHEMA.md**](DATABASE_SCHEMA.md) - Data model
- [**DEVELOPER_GUIDE.md**](DEVELOPER_GUIDE.md) - Development & debugging
- [**DEPLOYMENT_GUIDE.md**](DEPLOYMENT_GUIDE.md) - Production deployment & scaling

## 🚀 Deployment

### Render (Recommended MVP)
```bash
# One-click deployment
# Cost: ~$20-50/month
```

### Docker
```bash
docker-compose -f docker-compose.yml up -d
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📊 Performance

| Metric | Target |
|--------|--------|
| Ingestion Rate | 10k+ posts/hour |
| API Response | <100ms p95 |
| Trend Detection | <5 min latency |
| Dashboard Load | <2s first paint |

## 💰 Monetization

Built-in feature flags:

- **Free**: 10 trends/day
- **Premium**: Unlimited + early signals + idea generator
- **Enterprise**: API + webhooks + custom sources

## 🔒 Security

✅ HTTPS/TLS ready
✅ SQL injection prevention
✅ Rate limiting
✅ Environment-based secrets
✅ CORS whitelisting

## 🧪 Testing & Linting

```bash
pnpm type-check    # Type checking
pnpm lint          # Linting
pnpm format        # Format code
pnpm build         # Build all
```

## 📄 License

MIT - See [LICENSE](LICENSE) file

## 🤝 Contributing

Contributions welcome! Please fork, create a feature branch, and submit a PR.

## 💬 Support

- 📖 [Documentation](docs/)
- 🚀 [Get Started](DEVELOPER_GUIDE.md)
- 📦 [Deploy](DEPLOYMENT_GUIDE.md)

---

**Start detecting trends before they go viral. 🚀**
