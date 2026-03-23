import { Worker, Job } from "bullmq";
import { PrismaClient } from "@packages/database";
import { logger } from "@packages/utils";
import { ScrapeJobData } from "./queue";
import { scraperRegistry, ScrapedPost } from "./scrapers";

const prisma = new PrismaClient();

/**
 * Process a scrape job
 */
export async function processScrapeJob(job: Job<ScrapeJobData>) {
  const { scraper: scraperName, options } = job.data;

  logger.info(`🔄 Processing scrape job ${job.id} (${scraperName})`);

  try {
    // Get scraper from registry
    const scraper = scraperRegistry.get(scraperName);
    if (!scraper) {
      throw new Error(`Scraper not found: ${scraperName}`);
    }

    // Execute scraping
    const result = await scraper.scrape(options);

    if (result.posts.length === 0) {
      logger.warn(`⚠️  No posts scraped from ${scraperName}`);
      return { success: true, postsCount: 0 };
    }

    // Save posts to database
    const savedCount = await savePosts(result.posts, scraperName);

    logger.info(`✅ Scraped and saved ${savedCount} posts from ${scraperName}`);

    return {
      success: true,
      postsCount: result.posts.length,
      savedCount,
      hasMore: result.hasMore,
    };
  } catch (error) {
    logger.error(
      `❌ Error processing scrape job ${job.id}:`,
      error instanceof Error ? error.message : error
    );
    throw error; // BullMQ will retry the job
  }
}

/**
 * Save scraped posts to database
 */
async function savePosts(posts: ScrapedPost[], sourceName: string): Promise<number> {
  try {
    // Get or create source
    const source = await prisma.source.upsert({
      where: { name: sourceName },
      update: {
        lastScraped: new Date(),
        scrapedCount: { increment: posts.length },
      },
      create: {
        name: sourceName,
        type: sourceName === "reddit" ? "forum" : "community",
        baseUrl:
          sourceName === "reddit"
            ? "https://www.reddit.com"
            : "https://news.ycombinator.com",
        enabled: true,
        lastScraped: new Date(),
        scrapedCount: posts.length,
      },
    });

    // Save posts with upsert to avoid duplicates
    let savedCount = 0;
    for (const post of posts) {
      try {
        await prisma.post.upsert({
          where: {
            sourceId_externalId: {
              sourceId: source.id,
              externalId: post.externalId,
            },
          },
          update: {
            upvotes: post.upvotes,
            comments: post.comments,
            engagement: calculateEngagement(post.upvotes, post.comments),
          },
          create: {
            sourceId: source.id,
            externalId: post.externalId,
            title: post.title,
            content: post.content,
            url: post.url,
            author: post.author,
            publishedAt: post.publishedAt,
            upvotes: post.upvotes,
            comments: post.comments,
            engagement: calculateEngagement(post.upvotes, post.comments),
            processed: false, // Will be processed by trend-engine worker
          },
        });
        savedCount++;
      } catch (error) {
        logger.error(
          `Error saving post ${post.externalId}:`,
          error instanceof Error ? error.message : error
        );
        // Continue with other posts even if one fails
      }
    }

    return savedCount;
  } catch (error) {
    logger.error(
      `Error saving posts to database:`,
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

/**
 * Calculate engagement score
 * Simple formula: (upvotes * 1) + (comments * 2)
 * Comments are weighted higher as they indicate deeper engagement
 */
function calculateEngagement(upvotes: number, comments: number): number {
  return upvotes * 1 + comments * 2;
}

/**
 * Create and start the scraper worker
 */
export function createScraperWorker() {
  const worker = new Worker<ScrapeJobData>("scrape", processScrapeJob, {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      maxRetriesPerRequest: null,
    },
    concurrency: 2, // Process 2 jobs in parallel
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute
    },
  });

  // Event handlers
  worker.on("completed", (job) => {
    logger.info(`✅ Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    logger.error("Worker error:", err);
  });

  worker.on("ready", () => {
    logger.info("🚀 Scraper worker is ready");
  });

  return worker;
}

/**
 * Graceful shutdown
 */
export async function closeWorker(worker: Worker) {
  await worker.close();
  await prisma.$disconnect();
  logger.info("🔌 Worker closed and database disconnected");
}
