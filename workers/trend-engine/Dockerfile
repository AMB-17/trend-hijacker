# Dockerfile for Trend Engine Worker

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Copy source
COPY workers/trend-engine ./workers/trend-engine
COPY workers/scraper ./workers/scraper
COPY packages ./packages

# Build
RUN pnpm --filter @workers/trend-engine build

# Start
CMD ["pnpm", "--filter", "@workers/trend-engine", "start"]
