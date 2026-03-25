# AI-Powered Features Implementation Guide

## Overview

This document describes the implementation of two major AI-powered features for Trend Hijacker v2.0:

1. **AI-Powered Idea Generator & Market Validator** - Generates startup ideas based on trends
2. **AI-Powered Trend Insights & Sentiment Analysis** - Provides AI analysis of trends

## Prerequisites

- OpenAI API key (for `gpt-4-turbo` or compatible model)
- Redis instance for caching
- PostgreSQL database
- Node.js ≥ 20.0.0

## Setup Instructions

### 1. Install Dependencies

```bash
# Install at repository root
pnpm install

# The following package has been added:
# - @openai/sdk: ^4.50.0
```

### 2. Set Environment Variables

Add to `.env.local`:

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-api-key-here

# Redis (already configured)
REDIS_URL=redis://localhost:6379

# Database (already configured)
DATABASE_URL=postgresql://user:password@localhost:5432/trend_hijacker
```

### 3. Run Database Migrations

Since the project uses Prisma with a schema-based approach:

```bash
# Update the Prisma schema (already done)
# File: packages/database/prisma/schema.prisma

# Generate Prisma client
pnpm db:generate

# Apply migrations to database
pnpm db:push

# Or use SQL migration directly (if using raw SQL)
psql -U postgres -d trend_hijacker -f packages/database/prisma/ai-features-migration.sql
```

### 4. Start the Application

```bash
# Development mode
pnpm dev

# API will run on http://localhost:3001
# Web app will run on http://localhost:3000
```

## Feature 1: AI-Powered Idea Generator & Market Validator

### Overview

Generates innovative startup ideas based on detected trends with market validation scoring.

### API Endpoints

#### POST /api/trends/{trendId}/generate-ideas

Generate startup ideas for a trend.

**Request:**
```json
{
  "userId": "user-123",
  "numberOfIdeas": 3
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "idea-1",
      "name": "Trend Intelligence Platform",
      "description": "...",
      "targetMarket": "B2B SaaS companies",
      "difficultScore": 6.5,
      "marketSize": "large",
      "competitionScore": 7.2,
      "viabilityScore": 0.62,
      "recommendation": "GO"
    }
  ]
}
```

#### GET /api/trends/{trendId}/ideas?limit=10

Retrieve generated ideas for a trend.

#### POST /api/trends/{trendId}/ideas/{ideaId}/feedback

Rate and provide feedback on an idea.

**Request:**
```json
{
  "userId": "user-123",
  "rating": 5,
  "feedback": "Great idea, very actionable!"
}
```

### Service Implementation

**File:** `apps/api/src/services/idea-generation.service.ts`

Key features:
- Calls OpenAI API to generate ideas
- Analyzes market opportunity for each idea
- Calculates viability score: `(market_opportunity - competition) / difficulty`
- Provides GO/NO-GO/REVIEW recommendations
- Caches ideas for 24 hours
- Stores to database for audit trail

**Example Usage (TypeScript):**

```typescript
import { ideaGenerationService } from '../services/idea-generation.service';

const ideas = await ideaGenerationService.generateIdeas({
  trendId: 'trend-123',
  userId: 'user-456',
  numberOfIdeas: 3,
  trendTitle: 'AI-Powered Code Generation',
  trendSummary: 'Developers are increasingly using AI tools for code generation...',
});

// ideas = [
//   {
//     name: 'AI Code Reviewer',
//     description: '...',
//     marketSize: 'large',
//     viabilityScore: 0.75,
//     recommendation: 'GO'
//   }
// ]
```

### Frontend Component

**File:** `apps/web/components/IdeaGeneratorModal.tsx`

Features:
- Modal dialog showing generated ideas
- Metrics display (difficulty, market size, competition, viability)
- Color-coded recommendations (GO=green, NO-GO=red, REVIEW=yellow)
- Vote/rate ideas with thumbs up/down
- Copy idea to clipboard
- Real-time feedback submission

**Usage:**

```tsx
import { IdeaGeneratorModal } from '@/components/IdeaGeneratorModal';
import { useAIFeatures } from '@/lib/hooks';

export function TrendDetail() {
  const [showIdeas, setShowIdeas] = useState(false);
  const { ideas, ideasLoading, generateIdeas, addIdeaFeedback } = useAIFeatures();

  const handleGenerateIdeas = async () => {
    await generateIdeas(trendId, userId, 3);
    setShowIdeas(true);
  };

  return (
    <>
      <button onClick={handleGenerateIdeas}>Generate Ideas</button>
      
      <IdeaGeneratorModal
        isOpen={showIdeas}
        onClose={() => setShowIdeas(false)}
        ideas={ideas}
        loading={ideasLoading}
        onFeedback={addIdeaFeedback}
      />
    </>
  );
}
```

### Market Validation Scoring

The viability score is calculated as:

```
marketOpportunity = {
  'large': 1.0,
  'medium': 0.6,
  'small': 0.3
}

competitionNormalized = competitionScore / 10
difficultyNormalized = difficultScore / 10

viabilityScore = (marketOpportunity - competitionNormalized) / (difficultyNormalized || 0.1)
viabilityScore = clamp(viabilityScore, 0, 1)
```

**Recommendations:**
- GO: viabilityScore > 0.7
- NO-GO: viabilityScore < 0.3
- REVIEW: 0.3 ≤ viabilityScore ≤ 0.7

### Fallback Behavior

If OpenAI API is unavailable, the system returns well-crafted fallback ideas:
- Market Intelligence Platform
- Community Engagement Tool
- Educational Content Hub
- Service Marketplace
- Niche Software Solution

## Feature 2: AI-Powered Trend Insights & Sentiment Analysis

### Overview

Provides comprehensive AI analysis of trends including insights, sentiment, auto-tags, and sub-trend detection.

### API Endpoints

#### GET /api/trends/{trendId}/insights

Get AI-generated insights and analysis.

**Response:**
```json
{
  "data": {
    "summary": "This trend represents...",
    "drivers": [
      "Increasing consumer demand...",
      "Technological advancements..."
    ],
    "riskLevel": 6,
    "industries": ["Technology", "Finance", "Healthcare"],
    "impact": "HIGH"
  }
}
```

#### GET /api/trends/{trendId}/sentiment

Get sentiment analysis and distribution.

**Response:**
```json
{
  "data": {
    "current": {
      "positiveScore": 0.65,
      "negativeScore": 0.15,
      "neutralScore": 0.20,
      "overallScore": 0.45
    },
    "history": [...]
  }
}
```

#### GET /api/trends/{trendId}/tags

Get AI-generated tags with categories.

**Response:**
```json
{
  "data": [
    {
      "tag": "B2B SaaS",
      "category": "industry",
      "confidence": 0.95
    },
    {
      "tag": "High Market Potential",
      "category": "market_size",
      "confidence": 0.88
    }
  ]
}
```

#### GET /api/trends/{trendId}/sub-trends

Get detected micro-trends and variations.

**Response:**
```json
{
  "data": [
    {
      "id": "subtrenId-1",
      "name": "AI Safety",
      "description": "...",
      "keywords": ["safety", "alignment", "ethics"],
      "growth": 0.85
    }
  ]
}
```

### Service Implementation

**File:** `apps/api/src/services/trend-insights.service.ts`

Key features:
- Generates 1-paragraph AI summary
- Identifies key growth drivers (2-5 factors)
- Analyzes sentiment distribution (positive/negative/neutral)
- Classifies impact level (LOW/MEDIUM/HIGH)
- Assigns risk level (1-10 scale)
- Generates 8-12 AI-powered tags with categories
- Detects emerging sub-trends
- 7-day caching with auto-expiry

**Example Usage (TypeScript):**

```typescript
import { trendInsightsService } from '../services/trend-insights.service';

// Generate insights
const insights = await trendInsightsService.generateInsights('trend-123', {
  title: 'Quantum Computing',
  summary: 'Growing investment in quantum computing...',
  keywords: ['quantum', 'computing', 'qubits']
});

// Analyze sentiment
const sentiment = await trendInsightsService.analyzeSentiment('trend-123', [
  { title: 'Post 1', content: 'Excited about quantum computing...' },
  { title: 'Post 2', content: 'Concerns about quantum security...' }
]);

// Get sentiment history
const history = await trendInsightsService.getSentimentHistory('trend-123', 30);
```

### Frontend Component

**File:** `apps/web/components/TrendInsightsCard.tsx`

Features:
- 4 tabs: Overview, Sentiment, Tags, Sub-Trends
- Summary section with key points
- Market impact badge
- Key drivers list with numbering
- Affected industries display
- Sentiment pie chart
- Progress bars for sentiment breakdown
- Tag display with color coding by category
- Sub-trend growth chart (bar chart)
- Sub-trend detail cards

**Usage:**

```tsx
import { TrendInsightsCard } from '@/components/TrendInsightsCard';
import { useAIFeatures } from '@/lib/hooks';

export function TrendDetail() {
  const {
    insights,
    sentiment,
    tags,
    subTrends,
    getInsights,
    getSentiment,
    getTags,
    getSubTrends
  } = useAIFeatures();

  useEffect(() => {
    Promise.all([
      getInsights(trendId),
      getSentiment(trendId),
      getTags(trendId),
      getSubTrends(trendId)
    ]);
  }, [trendId]);

  return (
    <TrendInsightsCard
      insights={insights}
      sentiment={sentiment}
      tags={tags}
      subTrends={subTrends}
      loading={loading}
    />
  );
}
```

### Tag Categories

Tags are automatically classified into categories:

- **industry**: Affected industry/vertical (e.g., "B2B SaaS", "Healthcare Tech")
- **difficulty**: Execution difficulty (e.g., "Medium Difficulty", "Hard to Build")
- **market_size**: TAM potential (e.g., "Large Market", "Niche Market")
- **timeframe**: Adoption timeline (e.g., "Short-term", "Long-term")
- **risk_level**: Risk assessment (e.g., "Low Risk", "High Risk")

### Sentiment Analysis

Sentiment scores:
- Range: 0-1 for individual categories (positive, negative, neutral)
- Must sum to 1.0 across all three
- Overall score: -1 to 1 (-1=very negative, 1=very positive)

Calculated as weighted average of individual sentiments.

### Sub-Trend Detection

Automatically identifies emerging micro-trends with:
- Distinct naming and description
- Associated keywords (2-4)
- Growth rate (0-1 scale)
- Detection timestamp

## Hook Integration

**File:** `apps/web/lib/hooks/useAIFeatures.ts`

Complete hook for managing all AI features with:
- Separate loading/error states for each feature
- Callback functions for all operations
- Automatic error handling with fallbacks

```typescript
import { useAIFeatures } from '@/lib/hooks';

function MyComponent() {
  const {
    // Ideas
    ideas,
    ideasLoading,
    ideasError,
    generateIdeas,
    addIdeaFeedback,

    // Insights
    insights,
    insightsLoading,
    insightsError,
    getInsights,

    // Sentiment
    sentiment,
    sentimentLoading,
    sentimentError,
    getSentiment,

    // Tags
    tags,
    tagsLoading,
    tagsError,
    getTags,

    // Sub-trends
    subTrends,
    subTrendsLoading,
    subTrendsError,
    getSubTrends,
  } = useAIFeatures();

  // Use as needed
}
```

## Caching Strategy

### Ideas
- **TTL**: 24 hours
- **Key**: `ideas:{trendId}`
- **Invalidation**: Manual after feedback submission

### Insights
- **TTL**: 7 days
- **Key**: `insights:{trendId}`
- **Expiry**: Auto-expires database records after 7 days
- **Regeneration**: Triggered if trend data updates significantly

### Sentiment
- **TTL**: 24 hours (current only)
- **History**: 30-day retention in database
- **Key**: `sentiment:{trendId}`

### Tags
- **TTL**: 7 days
- **Key**: `tags:{trendId}`
- **Uniqueness**: One tag per trend (UNIQUE constraint)

### Sub-Trends
- **TTL**: 7 days (implicit from insights)
- **Key**: `subtends:{trendId}`
- **Persistence**: Permanent in database

## Error Handling

All AI services implement graceful fallbacks:

1. **API Timeout**: Return cached data if available
2. **Invalid Response**: Use fallback data
3. **OpenAI Not Initialized**: Return sensible defaults
4. **Database Errors**: Log and continue with in-memory results

## Cost Optimization

### API Call Batching
- Group multiple analysis requests
- Reuse sentiment analysis across sub-trend detection
- Cache aggressively (24h-7d TTL)

### Token Optimization
- Temperature: 0.7 (balanced creativity/consistency)
- Max tokens: 1000-2000 (optimized for quality)
- Structured output (JSON) to reduce parsing errors

### Storage Optimization
- 7-day TTL on database records
- Compress metadata as JSON
- Index on frequently queried columns

## Monitoring & Debugging

### Logs
```
[OpenAI] Client initialized
[TrendInsights] Sub-trends detected for {trendId}: 4 sub-trends
[IdeaGeneration] Ideas cached for {trendId}
[Error] OpenAI API error: {error_message}
```

### Metrics to Track
- API calls per hour
- Cache hit rate
- Average generation time
- Error rate by feature
- Fallback rate

## Integration with Existing Features

The AI features integrate seamlessly with existing Trend Hijacker components:

1. **Trend Scoring**: AI insights inform market opportunity scores
2. **Alerts**: Sentiment changes can trigger alerts
3. **Reports**: AI summaries included in generated reports
4. **Search**: Tags improve search indexing and discovery
5. **Personalization**: User feedback on ideas trains preferences

## Testing

### Unit Tests
```bash
pnpm test:api
```

### Manual Testing
```bash
# Generate ideas
curl -X POST http://localhost:3001/api/trends/trend-123/generate-ideas \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-456", "numberOfIdeas": 3}'

# Get insights
curl http://localhost:3001/api/trends/trend-123/insights

# Get sentiment
curl http://localhost:3001/api/trends/trend-123/sentiment

# Get tags
curl http://localhost:3001/api/trends/trend-123/tags

# Get sub-trends
curl http://localhost:3001/api/trends/trend-123/sub-trends
```

## Troubleshooting

### OpenAI API Not Responding
1. Check `OPENAI_API_KEY` is set correctly
2. Verify API key has sufficient credits
3. Check network connectivity
4. Review OpenAI API status page

### Cached Data Stale
- Ideas: Clear cache key `ideas:{trendId}` from Redis
- Insights: Wait for 7-day expiry or delete from database
- Tags/SubTrends: Delete and regenerate

### Database Errors
- Run `pnpm db:generate` to regenerate Prisma client
- Verify all tables exist: `\dt` in psql
- Check migrations have been applied

## Future Enhancements

1. **Vector Embeddings**: Add similarity search for ideas
2. **User Preferences**: Train model on user feedback
3. **Real-time Updates**: WebSocket updates for sentiment changes
4. **A/B Testing**: Test different idea generation prompts
5. **Analytics**: Track idea success rates over time
6. **Multi-model Support**: Support Claude, Llama, etc.
7. **Cost Tracking**: Per-user AI API usage billing
8. **Batch Processing**: Queue ideas for off-peak generation
