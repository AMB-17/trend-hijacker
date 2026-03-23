# Dockerfile for API

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Copy source
COPY apps/api ./apps/api
COPY packages ./packages

# Build
RUN pnpm --filter @apps/api build

# Start
EXPOSE 3000
CMD ["pnpm", "--filter", "@apps/api", "start"]
