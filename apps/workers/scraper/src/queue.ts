import { Queue, QueueOptions, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { logger } from "@packages/utils";

// Job type definitions
export interface ScrapeJobData {
  scraper: "reddit" | "hackernews";
  options?: Record<string, any>;
}

export interface SavePostsJobData {
  posts: any[];
  sourceName: string;
}

// Redis connection configuration
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null, // Required for BullMQ
});

// Queue options
const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: "exponential",
      delay: 5000, // Start with 5 second delay
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

// Create queues
export const scrapeQueue = new Queue<ScrapeJobData>("scrape", queueOptions);

logger.info("✅ BullMQ queues initialized");

// Helper to add scraping job
export async function addScrapeJob(data: ScrapeJobData, jobId?: string) {
  const job = await scrapeQueue.add("scrape", data, {
    jobId, // Optional job ID for idempotency
    priority: 1, // Higher priority = processed first
  });

  logger.info(`📝 Added scrape job: ${job.id} (${data.scraper})`);
  return job;
}

// Helper to schedule recurring scrape jobs
export async function scheduleRecurringScrapeJobs() {
  // Schedule Reddit scraping every 5 minutes
  await scrapeQueue.add(
    "scrape-reddit",
    { scraper: "reddit" },
    {
      repeat: {
        pattern: "*/5 * * * *", // Every 5 minutes (cron syntax)
      },
      jobId: "recurring-reddit-scrape", // Prevents duplicate schedules
    }
  );

  // Schedule HackerNews scraping every 5 minutes
  await scrapeQueue.add(
    "scrape-hackernews",
    { scraper: "hackernews" },
    {
      repeat: {
        pattern: "*/5 * * * *", // Every 5 minutes
      },
      jobId: "recurring-hackernews-scrape",
    }
  );

  logger.info("⏰ Scheduled recurring scrape jobs (every 5 minutes)");
}

// Graceful shutdown
export async function closeQueues() {
  await scrapeQueue.close();
  await redisConnection.quit();
  logger.info("🔌 BullMQ queues closed");
}
