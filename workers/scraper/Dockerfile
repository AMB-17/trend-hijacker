# Dockerfile for Scraper Worker

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Copy source
COPY workers/scraper ./workers/scraper
COPY workers/trend-engine ./workers/trend-engine
COPY packages ./packages

# Build
RUN pnpm --filter @workers/scraper build

# Start
CMD ["pnpm", "--filter", "@workers/scraper", "start"]
