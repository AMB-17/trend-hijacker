import { logger } from "@packages/utils";
import { createScraperWorker, closeWorker } from "./processor";
import { scheduleRecurringScrapeJobs, closeQueues, addScrapeJob } from "./queue";

async function startScraperWorker() {
  logger.info("🔄 Scraper Worker starting...");

  try {
    // Create and start the worker
    const worker = createScraperWorker();

    // Schedule recurring scrape jobs (every 5 minutes)
    await scheduleRecurringScrapeJobs();

    // Optional: Add an immediate scrape job for testing
    if (process.env.IMMEDIATE_SCRAPE === "true") {
      logger.info("🚀 Adding immediate scrape jobs for testing...");
      await addScrapeJob({ scraper: "reddit" });
      await addScrapeJob({ scraper: "hackernews" });
    }

    logger.info("✅ Scraper Worker is running!");
    logger.info("📊 Scraping Reddit and HackerNews every 5 minutes");
    logger.info("💾 Posts are being saved to database");
    logger.info("🔄 Unprocessed posts will be picked up by trend-engine worker");

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`\n🛑 Received ${signal}, shutting down gracefully...`);
      await closeWorker(worker);
      await closeQueues();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error(
      "❌ Failed to start scraper worker:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

startScraperWorker();
