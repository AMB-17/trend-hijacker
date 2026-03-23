# Trend Hijacker - Quick Reference

## 🚀 Common Commands

### Setup & Installation
```bash
# Install all dependencies
pnpm install

# Start PostgreSQL + Redis
cd docker && docker-compose up -d

# Stop services
cd docker && docker-compose down

# Create .env file
cp .env.example .env

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Prisma Studio (database GUI)
pnpm db:studio
```

### Development
```bash
# Start all apps (Next.js, API, workers)
pnpm dev

# Build all apps
pnpm build

# Lint all code
pnpm lint

# Type check all apps
pnpm type-check

# Format code
pnpm format
```

### Individual Apps
```bash
# Run only frontend
pnpm --filter @apps/web dev

# Run only API
pnpm --filter @apps/api dev

# Run only scraper worker
pnpm --filter @apps/scraper-worker dev

# Run only trend engine
pnpm --filter @apps/trend-engine-worker dev
```

### Database
```bash
# Create a new migration
pnpm db:migrate

# Push schema without migration (dev only)
pnpm db:push

# Reset database (WARNING: deletes all data)
pnpm --filter @packages/database prisma migrate reset

# View database in browser
pnpm db:studio
```

---

## 🌐 URLs

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Health**: http://localhost:3001/health
- **Prisma Studio**: http://localhost:5555 (when running `pnpm db:studio`)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## 📊 API Endpoints

### Trends
- `GET /api/trends` - List all trends
  - Query params: `?stage=early_signal&limit=20&sortBy=score`
- `GET /api/trends/:id` - Get trend by ID

### Signals
- `GET /api/signals/early` - Early signals
- `GET /api/signals/exploding` - Exploding trends

### Opportunities
- `GET /api/opportunities` - Opportunity map data

### Search
- `GET /api/search?q=keyword` - Search trends

### Sources
- `GET /api/sources` - List all sources
- `GET /api/sources/:id/stats` - Source statistics

---

## 🗂️ Key Files

### Configuration
- `turbo.json` - Turborepo config
- `pnpm-workspace.yaml` - Workspace definition
- `.env` - Environment variables
- `docker/docker-compose.yml` - Local services

### Database
- `packages/database/prisma/schema.prisma` - Database schema
- `packages/database/src/index.ts` - Prisma client

### API
- `apps/api/src/app.ts` - Fastify app setup
- `apps/api/src/routes/` - API route handlers
- `apps/api/src/services/` - Business logic

### Frontend
- `apps/web/app/page.tsx` - Landing page
- `apps/web/app/dashboard/page.tsx` - Dashboard
- `apps/web/app/globals.css` - Global styles
- `apps/web/tailwind.config.ts` - Tailwind config

### NLP & Scoring
- `packages/nlp/src/pain-patterns.ts` - Pain detection patterns
- `packages/nlp/src/tfidf.ts` - Topic extraction
- `packages/scoring/src/opportunity-score.ts` - Scoring formula

### Workers
- `apps/workers/scraper/src/index.ts` - Scraper worker entry point
- `apps/workers/scraper/src/scrapers/base.scraper.ts` - Abstract scraper class
- `apps/workers/scraper/src/scrapers/reddit.scraper.ts` - Reddit scraper
- `apps/workers/scraper/src/scrapers/hackernews.scraper.ts` - HackerNews scraper
- `apps/workers/scraper/src/queue.ts` - BullMQ queue configuration
- `apps/workers/scraper/src/processor.ts` - Job processor + DB integration
- `apps/workers/trend-engine/src/index.ts` - Trend engine entry point

---

## 🤖 Scrapers (Phase 2 ✅)

### Reddit Scraper
- **Target subreddits:** Entrepreneur, startups, SaaS, SideProject, buildinpublic, indiebiz, smallbusiness, Business_Ideas, growmybusiness, InternetIsBeautiful
- **API:** Public JSON API (`https://reddit.com/r/{subreddit}.json`)
- **Rate limit:** 30 requests/min, 2s delay between requests
- **Sorts:** hot, new, top, rising
- **Features:** Pagination, comment scraping

### HackerNews Scraper
- **API:** Algolia API (`https://hn.algolia.com/api/v1/search_by_date`)
- **Rate limit:** 60 requests/min, 1s delay between requests
- **Trending queries:** "looking for tool", "need help with", "wish there was", "frustrated with", "alternative to"
- **Tags:** story, comment, ask_hn, show_hn
- **Features:** Search by query, numeric filters, comment scraping

### Scraper Commands
```bash
# Start scraper worker
pnpm --filter @apps/scraper-worker dev

# Run immediate scrape (for testing)
IMMEDIATE_SCRAPE=true pnpm --filter @apps/scraper-worker dev

# Check scraper environment
cat apps/workers/scraper/.env.example
```

### Scraped Data Flow
1. Scraper jobs run every 5 minutes (BullMQ cron)
2. Posts saved to database (deduplicated by sourceId + externalId)
3. Sources updated (lastScraped, scrapedCount)
4. Posts marked as `processed: false`
5. Trend-engine worker picks up unprocessed posts

---

## 🐛 Debugging

### Check if services are running
```bash
docker-compose ps
```

### View API logs
```bash
pnpm --filter @apps/api dev
# Logs will appear in console
```

### View database content
```bash
pnpm db:studio
```

### Test API endpoint
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/trends
```

### Check database connection
```bash
psql postgresql://postgres:postgres@localhost:5432/trendhijacker
```

---

## 🔧 Environment Variables

Required in `.env`:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trendhijacker"
REDIS_URL="redis://localhost:6379"
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📦 Package Structure

```
@apps/api          - Fastify backend
@apps/web          - Next.js frontend
@apps/scraper-worker     - Scraping worker
@apps/trend-engine-worker - Detection worker
@packages/database - Prisma client
@packages/nlp      - NLP utilities
@packages/scoring  - Scoring algorithms
@packages/types    - TypeScript types
@packages/utils    - Shared utilities
@packages/config/* - Shared configs
```

---

## 🎯 Next Steps Checklist

**Setup (one-time):**
- [ ] Run `pnpm install`
- [ ] Start Docker services (`docker compose -f docker/docker-compose.yml up -d`)
- [ ] Create `.env` file (copy from `.env.example`)
- [ ] Run `pnpm db:migrate`
- [ ] Start all apps: `pnpm dev`
- [ ] Visit http://localhost:3000
- [ ] Check http://localhost:3001/health

**Phase 2 Status:** ✅ COMPLETED
- [x] BaseScraper abstract class
- [x] RedditScraper implementation (10 subreddits)
- [x] HackerNewsScraper implementation (Algolia API)
- [x] BullMQ queue system
- [x] Database integration
- [x] Recurring jobs (every 5 minutes)

**Phase 3 Status:** ✅ COMPLETED
- [x] Layer 1: Topic Extraction (TF-IDF, keywords, phrases)
- [x] Layer 2: Velocity Tracking (growth rates, acceleration)
- [x] Layer 3: Pain Detection (20+ patterns, sentiment)
- [x] Layer 4: Opportunity Scoring (weighted algorithm)
- [x] Noise Filtering (spam, memes, duplicates)
- [x] Trend Aggregation (summaries, confidence scores)
- [x] Detection pipeline (9-step process)
- [x] BullMQ integration (every 10 minutes)

**Phase 4 Next:** Backend API Enhancement
- [ ] Add Redis caching layer for queries
- [ ] Implement search with PostgreSQL full-text
- [ ] Enhance API endpoints with real data
- [ ] Add pagination/filtering helpers
- [ ] Implement opportunity map endpoint

---

## 💡 Tips

- Use `pnpm db:studio` to visually inspect database
- All packages use TypeScript strict mode
- Frontend uses dark mode by default
- API has rate limiting enabled (100 req/min)
- Logs use Winston (see `packages/utils/src/logger.ts`)

---

## 🆘 Getting Help

1. Check `SETUP_GUIDE.md` for detailed instructions
2. Review implementation plan: `C:\Users\kille\.claude\plans\elegant-swimming-hopcroft.md`
3. Check package READMEs
4. Review code comments in key files

---

Happy coding! 🎉
