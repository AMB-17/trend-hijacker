import { logger } from "@packages/utils";
import {
  createTrendDetectionWorker,
  scheduleTrendDetection,
  closeTrendDetection,
  addTrendDetectionJob,
} from "./processor";

async function startTrendEngine() {
  logger.info("🧠 Trend Engine Worker starting...");

  try {
    // Create and start the worker
    const worker = createTrendDetectionWorker();

    // Schedule recurring trend detection (every 10 minutes)
    await scheduleTrendDetection();

    // Optional: Add an immediate detection job for testing
    if (process.env.IMMEDIATE_DETECTION === "true") {
      logger.info("🚀 Adding immediate trend detection job for testing...");
      await addTrendDetectionJob();
    }

    logger.info("✅ Trend Engine Worker is running!");
    logger.info("🔍 Processing posts through 4-layer detection pipeline:");
    logger.info("   Layer 1: Topic Extraction (TF-IDF, keywords, phrases)");
    logger.info("   Layer 2: Velocity Tracking (growth rate, acceleration)");
    logger.info("   Layer 3: Pain Detection (problem patterns, sentiment)");
    logger.info("   Layer 4: Opportunity Scoring (weighted algorithm)");
    logger.info("📊 Trend detection runs every 10 minutes");
    logger.info("💾 Trends are saved to database with opportunity scores");

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`\n🛑 Received ${signal}, shutting down gracefully...`);
      await closeTrendDetection(worker);
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error(
      "❌ Failed to start trend engine:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

startTrendEngine();
