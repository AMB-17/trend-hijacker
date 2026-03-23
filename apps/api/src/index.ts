import { logger } from "@packages/utils";
import { buildApp } from "./app";

const start = async () => {
  try {
    const app = await buildApp();

    // Prefer platform-standard PORT/HOST with compatibility fallbacks.
    const port = parseInt(process.env.PORT || process.env.API_PORT || "3001", 10);
    const host = process.env.HOST || process.env.API_HOST || "0.0.0.0";

    await app.listen({ port, host });

    logger.info(`🚀 API server running on http://${host}:${port}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  } catch (err) {
    logger.error("Failed to start server", err);
    process.exit(1);
  }
};

start();
