import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { logger } from "@packages/utils";
import { nlpService } from "./services/nlp.service";

// Routes
import trendsRoutes from "./routes/trends";
import signalsRoutes from "./routes/signals";
import opportunitiesRoutes from "./routes/opportunities";
import searchRoutes from "./routes/search";
import sourcesRoutes from "./routes/sources";
import internalRoutes from "./routes/internal";
import usersRoutes from "./routes/users";
import alertsRoutes from "./routes/alerts";
import alertConfigRoutes from "./routes/alert-config";
import workspacesRoutes from "./routes/workspaces";
import collectionsRoutes from "./routes/collections";
import { trendAnalyticsRoutes } from "./routes/analytics";
import authRoutes from "./routes/auth";
import authEnterpriseRoutes from "./routes/auth-enterprise";
import auditRoutes from "./routes/audit";
import adminRoutes from "./routes/admin";
import userDataRoutes from "./routes/user-data";

// Middleware
import { errorHandler } from "./middleware/error-handler";
import { auditMiddleware } from "./middleware/audit";

export async function buildApp() {
  const app = Fastify({
    logger: false, // Using Winston instead
    bodyLimit: 1048576, // 1MB request body limit
  });

  // Initialize NLP service (free, local-only)
  nlpService;

  // Register plugins

  // Security headers with Helmet
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  });

  // CORS configuration with strict origin checking
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:3000'];

  await app.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(websocket);

  // Register audit middleware for all routes
  app.addHook('preHandler', auditMiddleware);

  // Health check
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Auth routes (register first for security middleware)
  await app.register(authRoutes, { prefix: "/api/auth" });
  
  // Enterprise auth routes (OAuth, SAML, 2FA)
  await app.register(authEnterpriseRoutes, { prefix: "/api/auth" });

  // API routes
  await app.register(trendsRoutes, { prefix: "/api/trends" });
  await app.register(signalsRoutes, { prefix: "/api/signals" });
  await app.register(opportunitiesRoutes, { prefix: "/api/opportunities" });
  await app.register(searchRoutes, { prefix: "/api/search" });
  await app.register(sourcesRoutes, { prefix: "/api/sources" });
  await app.register(internalRoutes, { prefix: "/api/internal" });
  await app.register(usersRoutes, { prefix: "/api/users" });
  await app.register(alertsRoutes, { prefix: "/api/alerts" });
  await app.register(alertConfigRoutes, { prefix: "/api/alerts-config" });
  await app.register(workspacesRoutes, { prefix: "/api/workspaces" });
  await app.register(collectionsRoutes, { prefix: "/api/collections" });
  await app.register(trendAnalyticsRoutes, { prefix: "/api" });

  // Admin routes
  await app.register(adminRoutes, { prefix: "/api/admin" });
  
  // Audit/compliance routes
  await app.register(auditRoutes, { prefix: "/api" });

  // User data routes (GDPR compliance)
  await app.register(userDataRoutes, { prefix: "/api/user" });

  // Error handler
  app.setErrorHandler(errorHandler);

  return app;
}
