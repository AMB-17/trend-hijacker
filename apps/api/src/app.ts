import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { logger } from "@packages/utils";

// Routes
import trendsRoutes from "./routes/trends";
import signalsRoutes from "./routes/signals";
import opportunitiesRoutes from "./routes/opportunities";
import searchRoutes from "./routes/search";
import sourcesRoutes from "./routes/sources";
import internalRoutes from "./routes/internal";

// Middleware
import { errorHandler } from "./middleware/error-handler";

export async function buildApp() {
  const app = Fastify({
    logger: false, // Using Winston instead
  });

  // Register plugins
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(websocket);

  // Health check
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // API routes
  await app.register(trendsRoutes, { prefix: "/api/trends" });
  await app.register(signalsRoutes, { prefix: "/api/signals" });
  await app.register(opportunitiesRoutes, { prefix: "/api/opportunities" });
  await app.register(searchRoutes, { prefix: "/api/search" });
  await app.register(sourcesRoutes, { prefix: "/api/sources" });
  await app.register(internalRoutes, { prefix: "/api/internal" });

  // Error handler
  app.setErrorHandler(errorHandler);

  return app;
}
