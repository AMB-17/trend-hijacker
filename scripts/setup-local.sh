# Create local .env file
cp .env.example .env

# Start services
echo "Starting PostgreSQL and Redis..."
cd docker && docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 5

# Run database migrations
echo "Running database migrations..."
cd .. && pnpm db:generate && pnpm db:migrate

echo "✅ Local development environment ready!"
echo ""
echo "Services:"
echo "  PostgreSQL: localhost:5432"
echo "  Redis: localhost:6379"
echo ""
echo "Next steps:"
echo "  1. Run 'pnpm install' to install dependencies"
echo "  2. Run 'pnpm dev' to start all apps"
