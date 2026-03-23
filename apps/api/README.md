# Backend API - TREND HIJACKER

## Setup

```bash
cd apps/api
npm install
```

## Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/trend_hijacker
REDIS_URL=redis://localhost:6379
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

## API Endpoints

### Trends

- `GET /api/trends` - List all trends
- `GET /api/trends/:id` - Get trend details with discussions, pain points, metrics
- `GET /api/trends/by-status/:status` - Get trends by status (emerging/growing/peak/declining/stable)
- `GET /api/trends/trending/:timeframe` - Get trending (1d/7d/30d)
- `POST /api/trends` - Create trend
- `GET /api/search?q=query` - Search trends

### Discussions

- `GET /api/discussions/recent` - Get recent discussions from all sources

### Stats

- `GET /api/stats` - Get system statistics

## Database

The API automatically initializes the database schema on startup. Make sure PostgreSQL is running and `DATABASE_URL` is set.

To manually run migrations:

```bash
# Not yet implemented - use manual SQL
```
