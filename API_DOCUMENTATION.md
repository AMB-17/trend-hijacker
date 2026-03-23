# API Documentation - TREND HIJACKER

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://api.example.com`

## Authentication

Currently, API is public. Premium features will require JWT tokens in the future.

```header
Authorization: Bearer <token>
```

## Response Format

All responses are JSON:

```json
{
  "data": {},
  "meta": {
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 100
    }
  }
}
```

## Error Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

---

## Endpoints

### 📊 Trends

#### List Trends
```http
GET /api/trends?limit=20&offset=0
```

**Query Parameters:**
- `limit` (number, max 100): Results per page
- `offset` (number): Pagination offset

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "AI Customer Support",
      "summary": "...",
      "opportunityScore": 78,
      "status": "emerging",
      "discussionCount": 45,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 250
  }
}
```

#### Get Trend Details
```http
GET /api/trends/{id}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "AI Customer Support",
  "summary": "...",
  "opportunityScore": 78,
  "velocityScore": 0.65,
  "problemIntensity": 0.82,
  "noveltyScore": 0.75,
  "discussionCount": 45,
  "status": "emerging",
  "suggestedIdeas": [
    "SaaS for AI chat automation",
    "Integration platform for LLM APIs"
  ],
  "discussions": [
    {
      "id": "uuid",
      "source": "reddit",
      "title": "...",
      "url": "...",
      "upvotes": 120,
      "createdAt": "2024-01-15T08:30:00Z"
    }
  ],
  "painPoints": [
    {
      "patternPhrase": "I wish there was...",
      "matchCount": 12,
      "intensity": 0.85
    }
  ],
  "metrics": [
    {
      "timestamp": "2024-01-15T00:00:00Z",
      "mentionCount": 23,
      "velocity": 0.45,
      "acceleration": 0.12
    }
  ]
}
```

#### Get Trends by Status
```http
GET /api/trends/by-status/{status}
```

**Status Values:**
- `emerging` - Newly detected
- `growing` - Accelerating growth
- `peak` - Maximum popularity
- `declining` - Losing momentum
- `stable` - Plateau

**Response:** Same as List Trends

#### Get Top Trends (Time-Windowed)
```http
GET /api/trends/trending/{timeframe}
```

**Timeframe Values:**
- `1d` - Last 24 hours
- `7d` - Last 7 days
- `30d` - Last 30 days

**Response:**
```json
{
  "data": [
    // Top 10 trends for timeframe
  ]
}
```

#### Create Trend (Internal)
```http
POST /api/trends
Content-Type: application/json

{
  "title": "New Trend",
  "summary": "Description...",
  "opportunityScore": 65,
  "velocityScore": 0.5,
  "problemIntensity": 0.7,
  "noveltyScore": 0.8,
  "discussionCount": 25,
  "sourceCount": 3,
  "status": "emerging",
  "category": "SaaS",
  "suggestedIdeas": ["Idea 1", "Idea 2"]
}
```

**Response:** `201 Created`

### 💬 Discussions

#### List Recent Discussions
```http
GET /api/discussions/recent?limit=100
```

**Query Parameters:**
- `limit` (number, max 500): Number of discussions

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "source": "reddit",
      "sourceId": "reddit_12345",
      "url": "https://reddit.com/...",
      "title": "Discussion Title",
      "content": "Full discussion text...",
      "author": "username",
      "upvotes": 120,
      "commentsCount": 45,
      "sentimentScore": 0.35,
      "painPointsDetected": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "fetchedAt": "2024-01-15T10:35:00Z"
    }
  ]
}
```

### 🔍 Search

#### Search Trends
```http
GET /api/search?q=ai&limit=20
```

**Query Parameters:**
- `q` (string, min 2 chars): Search query
- `limit` (number, max 100): Results per page

**Response:** Same as List Trends

### 📈 Stats

#### System Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "trendsCount": 1250,
  "discussionsCount": 45000,
  "averageOpportunityScore": 52.3
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Server Error |

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: 
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 95`
  - `X-RateLimit-Reset: 1642252800`

## Pagination

Use cursor-based pagination for large datasets:

```http
GET /api/trends?limit=20&cursor=xyz123
```

## Webhooks (Premium)

Subscribe to real-time trend updates:

```http
POST /api/webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-domain.com/webhook",
  "events": ["trend.created", "trend.updated"]
}
```

**Events:**
- `trend.created` - New trend detected
- `trend.updated` - Trend score updated
- `trend.peaked` - Trend reached peak
- `trend.declining` - Trend losing momentum

---

## Examples

### cURL

```bash
# List trends
curl http://localhost:3001/api/trends

# Get specific trend
curl http://localhost:3001/api/trends/{id}

# Search
curl "http://localhost:3001/api/search?q=ai"
```

### JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:3001/api/trends');
const data = await response.json();
console.log(data);
```

### Python

```python
import requests

response = requests.get('http://localhost:3001/api/trends')
data = response.json()
print(data)
```

---

## Changelog

### v1.0.0 (Current)
- Initial API release
- Trends, Discussions, Search endpoints
- Rate limiting

### v2.0 (Planned)
- Authentication & users
- Webhooks
- Custom alerts
- Export to CSV/JSON
