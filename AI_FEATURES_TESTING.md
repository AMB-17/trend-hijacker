# AI Features Testing Guide

This guide provides comprehensive testing procedures for both AI-powered features.

## Pre-Testing Setup

### 1. Start Services

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start PostgreSQL
pg_ctl -D /usr/local/var/postgres start
# or on Windows: pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start

# Terminal 3: Start API server
cd d:\workspace
pnpm --filter @apps/api dev
# API runs on http://localhost:3001

# Terminal 4: Start Web app (optional)
cd d:\workspace
pnpm --filter @apps/web dev
# Web runs on http://localhost:3000
```

### 2. Verify Environment

```bash
# Check API is running
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"2024-..."}

# Check OpenAI is configured
curl http://localhost:3001/api/trends/test-123/insights 2>&1 | grep -i openai
```

## Feature 1: Idea Generator Testing

### Test 1.1: Basic Idea Generation

**Scenario**: Generate 3 ideas for a new trend

**Steps**:
```bash
# 1. Create test data or find existing trend ID
TREND_ID="your-existing-trend-id"
USER_ID="test-user-123"

# 2. Generate ideas
curl -X POST http://localhost:3001/api/trends/$TREND_ID/generate-ideas \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"numberOfIdeas\": 3
  }"

# Expected response:
# {
#   "data": [
#     {
#       "name": "Idea Name",
#       "description": "...",
#       "targetMarket": "...",
#       "difficultScore": 5.5,
#       "marketSize": "large",
#       "competitionScore": 6.2,
#       "viabilityScore": 0.65,
#       "recommendation": "GO"
#     }
#   ]
# }
```

**Validation**:
- ✓ HTTP status 200
- ✓ All 3 ideas returned
- ✓ viabilityScore between 0-1
- ✓ recommendationis GO/NO-GO/REVIEW
- ✓ difficultScore between 1-10
- ✓ competitionScore between 1-10

### Test 1.2: Caching Validation

**Scenario**: Verify that ideas are cached for 24 hours

**Steps**:
```bash
# 1. Generate ideas (first time)
START_TIME=$(date +%s)
curl -X POST http://localhost:3001/api/trends/$TREND_ID/generate-ideas \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"numberOfIdeas\": 3}" \
  > response1.json

# 2. Generate same ideas again (should be instant)
curl -X POST http://localhost:3001/api/trends/$TREND_ID/generate-ideas \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"numberOfIdeas\": 3}" \
  > response2.json

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

# 3. Verify responses are identical
diff response1.json response2.json
```

**Validation**:
- ✓ Second call completes in <100ms
- ✓ Response data is identical
- ✓ Cache header present in response
- ✓ Redis key exists: `ideas:{trendId}`

### Test 1.3: Idea Feedback Submission

**Scenario**: Submit rating and feedback for an idea

**Steps**:
```bash
# 1. Generate ideas first
curl -X POST http://localhost:3001/api/trends/$TREND_ID/generate-ideas \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"numberOfIdeas\": 3}" \
  | jq '.data[0].id' > idea_id.txt

IDEA_ID=$(cat idea_id.txt | tr -d '"')

# 2. Submit feedback (5-star rating)
curl -X POST http://localhost:3001/api/trends/$TREND_ID/ideas/$IDEA_ID/feedback \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"rating\": 5,
    \"feedback\": \"Great idea! Very actionable and market-ready.\"
  }"

# Expected response:
# {
#   "data": {
#     "ideaId": "...",
#     "userId": "...",
#     "rating": 5,
#     "feedback": "..."
#   }
# }
```

**Validation**:
- ✓ HTTP status 200
- ✓ Feedback stored in database
- ✓ Feedback retrieval shows correct rating
- ✓ Cache invalidated for this trend

### Test 1.4: Edge Cases

**Test 4.1: Invalid number of ideas**
```bash
curl -X POST http://localhost:3001/api/trends/$TREND_ID/generate-ideas \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"numberOfIdeas\": 10}"

# Expected: 400 Bad Request (max 5)
```

**Test 4.2: Non-existent trend**
```bash
curl -X POST http://localhost:3001/api/trends/invalid-id/generate-ideas \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"numberOfIdeas\": 3}"

# Expected: 404 Not Found
```

**Test 4.3: OpenAI API failure (mock)**
```bash
# Unset OPENAI_API_KEY to trigger fallback
export OPENAI_API_KEY=""
curl -X POST http://localhost:3001/api/trends/$TREND_ID/generate-ideas \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"numberOfIdeas\": 3}"

# Expected: 200 with fallback ideas
```

### Test 1.5: Retrieve Generated Ideas

**Scenario**: Get all ideas previously generated for a trend

**Steps**:
```bash
curl http://localhost:3001/api/trends/$TREND_ID/ideas?limit=10

# Expected response:
# {
#   "data": [
#     {
#       "id": "idea-1",
#       "name": "...",
#       "viabilityScore": 0.75,
#       "feedback": [
#         {
#           "rating": 5,
#           "userId": "..."
#         }
#       ]
#     }
#   ]
# }
```

**Validation**:
- ✓ Returns all generated ideas
- ✓ Includes feedback data
- ✓ Sorted by viability score (descending)
- ✓ Pagination works with limit parameter

## Feature 2: Insights Testing

### Test 2.1: Generate Insights

**Scenario**: Generate comprehensive insights for a trend

**Steps**:
```bash
curl http://localhost:3001/api/trends/$TREND_ID/insights

# Expected response:
# {
#   "data": {
#     "summary": "This trend represents...",
#     "drivers": ["Driver 1", "Driver 2", ...],
#     "riskLevel": 6,
#     "industries": ["Industry 1", "Industry 2", ...],
#     "impact": "HIGH"
#   }
# }
```

**Validation**:
- ✓ HTTP status 200
- ✓ Summary is 1-2 paragraphs
- ✓ drivers array has 3-5 items
- ✓ riskLevel between 1-10
- ✓ impact is LOW/MEDIUM/HIGH
- ✓ industries array has 3-5 items

### Test 2.2: Sentiment Analysis

**Scenario**: Get sentiment distribution for a trend

**Steps**:
```bash
curl http://localhost:3001/api/trends/$TREND_ID/sentiment

# Expected response:
# {
#   "data": {
#     "current": {
#       "positiveScore": 0.65,
#       "negativeScore": 0.15,
#       "neutralScore": 0.20,
#       "overallScore": 0.45
#     },
#     "history": [...]
#   }
# }
```

**Validation**:
- ✓ All scores between 0-1 (except overallScore -1 to 1)
- ✓ positiveScore + negativeScore + neutralScore = 1.0 (±0.01)
- ✓ overallScore matches sentiment distribution
- ✓ History includes last 30 days

### Test 2.3: Auto-Generated Tags

**Scenario**: Get AI-generated tags with categories

**Steps**:
```bash
curl http://localhost:3001/api/trends/$TREND_ID/tags

# Expected response:
# {
#   "data": [
#     {
#       "tag": "B2B SaaS",
#       "category": "industry",
#       "confidence": 0.95
#     },
#     ...
#   ]
# }
```

**Validation**:
- ✓ Returns 8-12 tags
- ✓ Categories are: industry, difficulty, market_size, timeframe, risk_level
- ✓ Confidence between 0-1
- ✓ Tags are specific and actionable
- ✓ No duplicate tags

### Test 2.4: Sub-Trends Detection

**Scenario**: Get detected micro-trends

**Steps**:
```bash
curl http://localhost:3001/api/trends/$TREND_ID/sub-trends

# Expected response:
# {
#   "data": [
#     {
#       "id": "subtend-1",
#       "name": "Sub-trend Name",
#       "description": "...",
#       "keywords": ["kw1", "kw2"],
#       "growth": 0.75
#     }
#   ]
# }
```

**Validation**:
- ✓ Returns 2-4 sub-trends
- ✓ Each has unique name and description
- ✓ Keywords array has 2-4 items
- ✓ Growth rate between 0-1
- ✓ Names are distinct from main trend

### Test 2.5: Caching and Expiry

**Scenario**: Verify 7-day caching and auto-expiry

**Steps**:
```bash
# 1. Generate insights (first time)
curl http://localhost:3001/api/trends/$TREND_ID/insights | jq '.data.summary' > insight1.txt

# 2. Verify cache entry in database
psql -U postgres -d trend_hijacker -c \
  "SELECT expiresAt FROM \"TrendInsight\" WHERE trendId = '$TREND_ID'"

# 3. Check Redis cache
redis-cli GET "insights:$TREND_ID"
```

**Validation**:
- ✓ expiresAt is 7 days from now
- ✓ Redis key cached for 7 days
- ✓ Subsequent calls return same data from cache
- ✓ After 7 days, old record can be deleted

### Test 2.6: Edge Cases

**Test 6.1: New trend without posts**
```bash
# Create/find a trend with no associated posts
curl http://localhost:3001/api/trends/$EMPTY_TREND_ID/sentiment

# Expected: Returns default sentiment (fallback)
```

**Test 6.2: High volume trend**
```bash
# Test with trend having 1000+ posts
curl http://localhost:3001/api/trends/$HIGH_VOLUME_TREND_ID/sentiment

# Expected: Samples representative posts, completes in <5s
```

**Test 6.3: Trending trend (rapid updates)**
```bash
# Call insights multiple times while trend is being updated
for i in {1..5}; do
  curl http://localhost:3001/api/trends/$TRENDING_ID/sentiment
  sleep 1
done

# Expected: Returns consistent data, no race conditions
```

## Integration Tests

### Test 3.1: Full Workflow

**Scenario**: Complete user journey - view trend → generate ideas → read insights

**Steps**:
```bash
# 1. Get trend details
curl http://localhost:3001/api/trends/$TREND_ID \
  | jq '.data | {id, title, summary, keywords}' > trend.json

# 2. Generate ideas in parallel
curl -X POST http://localhost:3001/api/trends/$TREND_ID/generate-ideas \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"numberOfIdeas\": 3}" \
  | jq '.data | length' > ideas_count.txt &

# 3. Get insights in parallel
curl http://localhost:3001/api/trends/$TREND_ID/insights \
  | jq '.data.summary' > insights.txt &

# 4. Get tags in parallel
curl http://localhost:3001/api/trends/$TREND_ID/tags \
  | jq '.data | length' > tags_count.txt &

wait

# 5. Verify all data loaded successfully
echo "Trend:" $(cat trend.json)
echo "Ideas generated:" $(cat ideas_count.txt)
echo "Tags generated:" $(cat tags_count.txt)
```

**Validation**:
- ✓ All requests complete successfully
- ✓ Data is consistent across endpoints
- ✓ Response times: <2s per API call
- ✓ No race conditions or data corruption

### Test 3.2: Performance Under Load

**Scenario**: Multiple users accessing AI features simultaneously

**Tools**: Apache Bench or similar

```bash
# Generate ideas for 10 concurrent users
ab -n 100 -c 10 -X POST \
  -H "Content-Type: application/json" \
  -p post_data.json \
  http://localhost:3001/api/trends/$TREND_ID/generate-ideas

# Expected:
# - 95% of requests: <2s
# - Error rate: <1%
# - CPU usage: <80%
```

**Validation**:
- ✓ Handles concurrent requests gracefully
- ✓ Cache prevents redundant API calls
- ✓ Database connection pooling effective
- ✓ No timeout errors

### Test 3.3: Error Recovery

**Scenario**: Graceful handling of failures

**Steps**:
```bash
# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Try to get insights
curl http://localhost:3001/api/trends/$TREND_ID/insights
# Expected: 500 with graceful error

# 3. Restart PostgreSQL
sudo systemctl start postgresql

# 4. Try again
curl http://localhost:3001/api/trends/$TREND_ID/insights
# Expected: 200 with valid data
```

**Validation**:
- ✓ Errors have clear messages
- ✓ System recovers after external failure
- ✓ Cache prevents repeated errors
- ✓ Fallback data used appropriately

## Frontend Component Testing

### Test 4.1: IdeaGeneratorModal Component

**Test 4.1.1: Render with data**
```tsx
// Arrange
const ideas = [
  {
    id: '1',
    name: 'Test Idea',
    description: 'Test description',
    targetMarket: 'Test market',
    difficultScore: 5,
    marketSize: 'medium',
    competitionScore: 5,
    viabilityScore: 0.5,
    recommendation: 'GO'
  }
];

// Act
render(
  <IdeaGeneratorModal
    isOpen={true}
    onClose={jest.fn()}
    ideas={ideas}
    loading={false}
    onFeedback={jest.fn()}
  />
);

// Assert
expect(screen.getByText('Test Idea')).toBeInTheDocument();
expect(screen.getByText('GO')).toHaveClass('bg-green-100');
```

**Test 4.1.2: Copy to clipboard**
```tsx
// Test copy button functionality
const copyButton = screen.getByText('Copy');
fireEvent.click(copyButton);

// Expected: Clipboard contains idea name
expect(navigator.clipboard.writeText).toHaveBeenCalled();
```

### Test 4.2: TrendInsightsCard Component

**Test 4.2.1: Tab switching**
```tsx
// Arrange
render(
  <TrendInsightsCard
    insights={mockInsights}
    sentiment={mockSentiment}
    tags={mockTags}
    subTrends={mockSubTrends}
    loading={false}
  />
);

// Act - Click sentiment tab
fireEvent.click(screen.getByText('Sentiment'));

// Assert - Pie chart visible
expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
```

**Test 4.2.2: Data display**
```tsx
// Verify all data sections render
expect(screen.getByText(mockInsights.summary)).toBeInTheDocument();
mockInsights.drivers.forEach(driver => {
  expect(screen.getByText(driver)).toBeInTheDocument();
});
```

## Database Verification

### Query Examples

```sql
-- Check generated ideas
SELECT COUNT(*) FROM "GeneratedIdea" WHERE "trendId" = 'trend-123';

-- Check idea feedback
SELECT rating, COUNT(*) FROM "IdeaFeedback" GROUP BY rating;

-- Check insights caching
SELECT "trendId", "expiresAt" FROM "TrendInsight" 
  WHERE "expiresAt" > NOW() 
  ORDER BY "generatedAt" DESC 
  LIMIT 10;

-- Check sentiment history
SELECT "trendId", DATE("timestamp"), AVG("overallScore") 
  FROM "TrendSentiment" 
  GROUP BY "trendId", DATE("timestamp")
  ORDER BY DATE("timestamp") DESC;

-- Check tags by category
SELECT category, COUNT(*) FROM "TrendTag" 
  GROUP BY category;

-- Check sub-trends
SELECT * FROM "TrendSubTrend" 
  WHERE "parentTrendId" = 'trend-123' 
  ORDER BY "growth" DESC;
```

## Performance Benchmarks

Expected performance targets:

| Metric | Target | Actual |
|--------|--------|--------|
| Idea generation | <5s | |
| Insights generation | <3s | |
| Sentiment analysis | <2s | |
| Tag generation | <2s | |
| Cache hit (ideas) | <100ms | |
| Cache hit (insights) | <50ms | |
| Concurrent requests (10) | <2s each | |
| Database query | <100ms | |
| Redis operation | <10ms | |

## Troubleshooting

### Issue: OpenAI API timeout

**Solution**:
```bash
# Check API status
curl https://status.openai.com/api/v2/status.json

# Verify network
ping api.openai.com

# Check API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Issue: Cache not invalidating

**Solution**:
```bash
# Manual cache clear
redis-cli DEL "ideas:*"
redis-cli DEL "insights:*"
redis-cli DEL "sentiment:*"
redis-cli DEL "tags:*"

# Verify cleared
redis-cli KEYS "*:trend-123"
```

### Issue: Database connection errors

**Solution**:
```bash
# Check connection
psql -U postgres -d trend_hijacker -c "SELECT NOW();"

# Verify schema
psql -U postgres -d trend_hijacker -c "\dt"

# Check migrations
psql -U postgres -d trend_hijacker -c \
  "SELECT * FROM \"_prisma_migrations\";"
```

## Regression Testing Checklist

Before deploying to production:

- [ ] Unit tests pass (all services)
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Performance benchmarks met
- [ ] Database migrations applied
- [ ] Cache TTL verified
- [ ] Error handling tested
- [ ] Fallback behavior verified
- [ ] Frontend components render correctly
- [ ] API rate limiting working
- [ ] CORS headers correct
- [ ] Security headers present
- [ ] Logging working
- [ ] Monitoring alerts configured
