# Quick Start: AI Features for Trend Hijacker v2.0

## 30-Second Setup

```bash
# 1. Install dependencies
cd d:\workspace
pnpm install

# 2. Set OpenAI API key
export OPENAI_API_KEY="sk-your-api-key-here"

# 3. Apply database migrations
pnpm db:push

# 4. Start development server
pnpm dev
```

API will run on: http://localhost:3001  
Web will run on: http://localhost:3000

## Verify Installation

```bash
# Check API is running
curl http://localhost:3001/health

# Test idea generation
curl -X POST http://localhost:3001/api/trends/test-123/generate-ideas \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "numberOfIdeas": 3}'
```

## Use in Your App

### Generate Ideas (Backend)

```typescript
import { ideaGenerationService } from '@/services/idea-generation.service';

const ideas = await ideaGenerationService.generateIdeas({
  trendId: 'trend-123',
  userId: 'user-456',
  numberOfIdeas: 3,
  trendTitle: 'AI Code Generation',
  trendSummary: 'Developers using AI...',
});
```

### Get Insights (Backend)

```typescript
import { trendInsightsService } from '@/services/trend-insights.service';

const insights = await trendInsightsService.generateInsights('trend-123', {
  title: 'AI Code Generation',
  summary: 'Developers using AI...',
  keywords: ['ai', 'code', 'generation'],
});
```

### Use in React (Frontend)

```tsx
import { useAIFeatures } from '@/lib/hooks';
import { IdeaGeneratorModal } from '@/components/IdeaGeneratorModal';
import { TrendInsightsCard } from '@/components/TrendInsightsCard';

export function TrendPage() {
  const {
    ideas,
    ideasLoading,
    generateIdeas,
    addIdeaFeedback,
    insights,
    sentiment,
    tags,
    subTrends,
  } = useAIFeatures();

  return (
    <>
      <button onClick={() => generateIdeas(trendId, userId, 3)}>
        Generate Ideas
      </button>

      <IdeaGeneratorModal
        isOpen={true}
        onClose={() => {}}
        ideas={ideas}
        loading={ideasLoading}
        onFeedback={addIdeaFeedback}
      />

      <TrendInsightsCard
        insights={insights}
        sentiment={sentiment}
        tags={tags}
        subTrends={subTrends}
        loading={false}
      />
    </>
  );
}
```

## API Endpoints

### Idea Generator

```bash
# Generate ideas
POST /api/trends/{trendId}/generate-ideas
{
  "userId": "user-123",
  "numberOfIdeas": 3
}

# Get ideas
GET /api/trends/{trendId}/ideas?limit=10

# Rate an idea
POST /api/trends/{trendId}/ideas/{ideaId}/feedback
{
  "userId": "user-123",
  "rating": 5,
  "feedback": "Great idea!"
}
```

### Insights

```bash
# Get insights
GET /api/trends/{trendId}/insights

# Get sentiment
GET /api/trends/{trendId}/sentiment

# Get tags
GET /api/trends/{trendId}/tags

# Get sub-trends
GET /api/trends/{trendId}/sub-trends
```

## Configuration

### Environment Variables

```env
# Required for AI features
OPENAI_API_KEY=sk-your-key-here

# Already configured
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
```

### Caching

- **Ideas**: 24 hours in Redis
- **Insights**: 7 days in Redis + Database
- **Sentiment**: 24 hours in Redis
- **Tags**: 7 days in Redis

### Viability Scoring

```
viabilityScore = (market_opportunity - competition) / difficulty
Recommendation:
  - GO: > 0.7
  - NO-GO: < 0.3
  - REVIEW: 0.3 - 0.7
```

## Troubleshooting

### OpenAI API not working?

```bash
# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check if service initialized
# Should see: "OpenAI client initialized" in logs
```

### Cache issues?

```bash
# Clear all cache
redis-cli FLUSHDB

# Or specific keys
redis-cli DEL "ideas:*"
redis-cli DEL "insights:*"
```

### Database not migrated?

```bash
# Regenerate Prisma client
pnpm db:generate

# Apply migrations
pnpm db:push

# Check tables exist
psql -U postgres -d trend_hijacker -c "\dt" | grep -E "Generated|Trend(Insight|Sentiment|Tag|SubTrend)"
```

## What's New

### Feature 1: Idea Generator
- ✅ AI-powered startup ideas (3-5 per trend)
- ✅ Market validation scoring
- ✅ Difficulty assessment
- ✅ Competition analysis
- ✅ GO/NO-GO recommendations
- ✅ User feedback collection

### Feature 2: Insights
- ✅ AI summaries (1-paragraph)
- ✅ Growth drivers (3-5 factors)
- ✅ Sentiment analysis
- ✅ Risk assessment
- ✅ Auto-tags (8-12)
- ✅ Sub-trends (2-4)

## Components

### IdeaGeneratorModal
Modal showing generated ideas with metrics, voting, and copy-to-clipboard.

```tsx
<IdeaGeneratorModal
  isOpen={boolean}
  onClose={() => {}}
  ideas={Idea[]}
  loading={boolean}
  onFeedback={(id, rating, feedback) => {}}
/>
```

### TrendInsightsCard
Tabbed card with insights, sentiment, tags, and sub-trends.

```tsx
<TrendInsightsCard
  insights={TrendInsight | null}
  sentiment={SentimentData | null}
  tags={TagData[]}
  subTrends={SubTrendData[]}
  loading={boolean}
/>
```

## Hooks

### useAIFeatures
Main hook for all AI features.

```tsx
const {
  // Ideas
  ideas, ideasLoading, ideasError,
  generateIdeas, addIdeaFeedback,

  // Insights
  insights, insightsLoading, insightsError,
  getInsights,

  // Sentiment
  sentiment, sentimentLoading, sentimentError,
  getSentiment,

  // Tags
  tags, tagsLoading, tagsError,
  getTags,

  // Sub-trends
  subTrends, subTrendsLoading, subTrendsError,
  getSubTrends,
} = useAIFeatures();
```

## Database

### New Tables
- `GeneratedIdea` - Startup ideas
- `IdeaFeedback` - Idea ratings
- `TrendInsight` - AI analysis (7-day TTL)
- `TrendSentiment` - Sentiment history
- `TrendTag` - AI tags
- `TrendSubTrend` - Micro-trends

### Migration
```bash
pnpm db:push
```

## Performance

| Operation | Time |
|-----------|------|
| Generate ideas (first) | <5s |
| Generate ideas (cached) | <100ms |
| Get insights (first) | <3s |
| Get insights (cached) | <50ms |
| Get sentiment | <2s |
| Get tags | <2s |

## Testing

See `AI_FEATURES_TESTING.md` for comprehensive test procedures.

Quick test:
```bash
# Generate ideas
curl -X POST http://localhost:3001/api/trends/trend-1/generate-ideas \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "numberOfIdeas": 3}'

# Get insights
curl http://localhost:3001/api/trends/trend-1/insights
```

## Documentation

- `AI_FEATURES_IMPLEMENTATION.md` - Full setup and usage
- `EXAMPLE_TREND_DETAIL_PAGE.tsx` - React integration example
- `AI_FEATURES_TESTING.md` - Testing procedures
- `IMPLEMENTATION_COMPLETE.md` - Project summary

## Support

For issues or questions:

1. Check error logs: `docker logs trend-hijacker-api`
2. Verify environment: `.env.local` has `OPENAI_API_KEY`
3. Check database: `psql -U postgres -d trend_hijacker -c "SELECT COUNT(*) FROM \"GeneratedIdea\";"`
4. Check Redis: `redis-cli KEYS "*"`
5. Review docs in repository root

## Next Steps

1. ✅ Install and setup (done!)
2. Test API endpoints
3. Integrate components into your pages
4. Set up monitoring
5. Configure rate limiting
6. Deploy to production

Enjoy the AI-powered features! 🚀
