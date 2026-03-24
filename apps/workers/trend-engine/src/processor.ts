import { Worker, Job, Queue, QueueOptions } from "bullmq";
import { PrismaClient } from "@packages/database";
import { logger } from "@packages/utils";
import IORedis from "ioredis";
import { TopicExtractionLayer } from "./layers/topic-extraction";
import { VelocityTrackingLayer } from "./layers/velocity-tracking";
import { PainDetectionLayer } from "./layers/pain-detection";
import { OpportunityScoringLayer } from "./layers/opportunity-scoring";
import { NoiseFilter } from "./filters/noise-filter";
import { TrendAggregator } from "./aggregators/trend-aggregator";

const prisma = new PrismaClient();

// Redis connection
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

// Queue options
const queueOptions: QueueOptions = {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 500,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
};

// Create queue
export const trendDetectionQueue = new Queue("trend-detection", queueOptions);

logger.info("✅ Trend detection queue initialized");

// Initialize layers
const topicExtraction = new TopicExtractionLayer();
const velocityTracking = new VelocityTrackingLayer(prisma);
const painDetection = new PainDetectionLayer(prisma);
const opportunityScoring = new OpportunityScoringLayer();
const noiseFilter = new NoiseFilter();
const trendAggregator = new TrendAggregator(prisma);

/**
 * Process unprocessed posts through the detection pipeline
 */
export async function processTrendDetection(job: Job) {
  const batchSize = 100;

  logger.info(`🧠 Starting trend detection job ${job.id}`);

  try {
    // Step 1: Get unprocessed posts
    const posts = await prisma.post.findMany({
      where: { processed: false },
      take: batchSize,
      orderBy: { publishedAt: "desc" },
    });

    if (posts.length === 0) {
      logger.info("✅ No unprocessed posts found");
      return { processed: 0, trendsCreated: 0 };
    }

    logger.info(`📝 Processing ${posts.length} posts`);

    // Step 2: Filter noise
    const cleanPosts = noiseFilter.filterPosts(posts);
    const dedupedPosts = noiseFilter.deduplicatePosts(cleanPosts);

    logger.info(
      `🔍 After filtering: ${dedupedPosts.length}/${posts.length} posts`
    );

    if (dedupedPosts.length === 0) {
      // Mark all as processed even if filtered
      await markPostsAsProcessed(posts.map((p: any) => p.id));
      return { processed: posts.length, trendsCreated: 0 };
    }

    // Step 3: Layer 1 - Topic Extraction
    const topicResults = await topicExtraction.extractFromPosts(dedupedPosts);

    // Step 4: Aggregate topics to find trending keywords
    const topicCounts = topicExtraction.aggregateTopics(topicResults);

    // Get top keywords (at least 3 mentions)
    const trendingKeywords = Array.from(topicCounts.entries())
      .filter(([_, count]) => count >= 3)
      .slice(0, 50) // Top 50 keywords
      .map(([keyword, _]) => keyword);

    logger.info(
      `🔑 Found ${trendingKeywords.length} trending keywords`
    );

    if (trendingKeywords.length === 0) {
      await markPostsAsProcessed(posts.map((p: any) => p.id));
      return { processed: posts.length, trendsCreated: 0 };
    }

    // Step 5: Layer 2 - Velocity Tracking
    const velocityResults = await velocityTracking.trackKeywords(
      trendingKeywords
    );

    // Filter to only accelerating keywords
    const acceleratingKeywords = velocityResults.filter(
      (v) => v.isAccelerating && v.currentCount >= 3
    );

    logger.info(
      `📈 ${acceleratingKeywords.length} keywords are accelerating`
    );

    if (acceleratingKeywords.length === 0) {
      await markPostsAsProcessed(posts.map((p: any) => p.id));
      return { processed: posts.length, trendsCreated: 0 };
    }

    // Step 6: Layer 3 - Pain Detection
    const painResults = await painDetection.detectInPosts(dedupedPosts);

    // Step 7: Layer 4 - Opportunity Scoring
    // For each accelerating keyword, calculate opportunity score
    const opportunityData = acceleratingKeywords.map((velocity) => {
      // Find posts related to this keyword
      const relatedPosts = dedupedPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(velocity.keyword.toLowerCase()) ||
          post.content.toLowerCase().includes(velocity.keyword.toLowerCase())
      );

      const relatedPostIds = relatedPosts.map((p) => p.id);

      // Get pain results for related posts
      const relatedPainResults = painResults.filter((pr) =>
        relatedPostIds.includes(pr.postId)
      );

      // Get topic results for related posts
      const relatedTopicResults = topicResults.filter((tr) =>
        relatedPostIds.includes(tr.postId)
      );

      return {
        keyword: velocity.keyword,
        velocity,
        painResults: relatedPainResults,
        topicResults: relatedTopicResults,
        relatedPostIds,
      };
    });

    const opportunities = opportunityScoring.calculateOpportunities(
      opportunityData
    );

    logger.info(
      `🎯 Identified ${opportunities.length} opportunities`
    );

    // Step 8: Trend Aggregation
    const trends = await trendAggregator.aggregateTrends(opportunities);

    logger.info(
      `✅ Created/updated ${trends.length} trends`
    );

    // Step 9: Mark posts as processed
    await markPostsAsProcessed(posts.map((p: any) => p.id));

    return {
      processed: posts.length,
      trendsCreated: trends.length,
      topKeywords: trendingKeywords.slice(0, 10),
      topOpportunities: opportunities.slice(0, 5).map((o) => ({
        keyword: o.keyword,
        score: o.opportunityScore,
      })),
    };
  } catch (error) {
    logger.error(
      `❌ Error in trend detection job:`,
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

/**
 * Mark posts as processed
 */
async function markPostsAsProcessed(postIds: string[]): Promise<void> {
  await prisma.post.updateMany({
    where: { id: { in: postIds } },
    data: { processed: true },
  });
}

/**
 * Schedule recurring trend detection job
 */
export async function scheduleTrendDetection() {
  await trendDetectionQueue.add(
    "trend-detection",
    {},
    {
      repeat: {
        pattern: "*/10 * * * *", // Every 10 minutes
      },
      jobId: "recurring-trend-detection",
    }
  );

  logger.info("⏰ Scheduled recurring trend detection (every 10 minutes)");
}

/**
 * Add immediate trend detection job
 */
export async function addTrendDetectionJob() {
  const job = await trendDetectionQueue.add("trend-detection", {});
  logger.info(`📝 Added trend detection job: ${job.id}`);
  return job;
}

/**
 * Create and start the trend detection worker
 */
export function createTrendDetectionWorker() {
  const worker = new Worker("trend-detection", processTrendDetection, {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      maxRetriesPerRequest: null,
    },
    concurrency: 1, // Process one batch at a time to avoid race conditions
    limiter: {
      max: 6, // Max 6 jobs
      duration: 60000, // Per minute
    },
  });

  // Event handlers
  worker.on("completed", (job, result) => {
    logger.info(
      `✅ Trend detection job ${job.id} completed: ${result.processed} posts processed, ${result.trendsCreated} trends created`
    );
  });

  worker.on("failed", (job, err) => {
    logger.error(`❌ Trend detection job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    logger.error("Worker error:", err);
  });

  worker.on("ready", () => {
    logger.info("🚀 Trend detection worker is ready");
  });

  return worker;
}

/**
 * Graceful shutdown
 */
export async function closeTrendDetection(worker: Worker) {
  await worker.close();
  await trendDetectionQueue.close();
  await redisConnection.quit();
  await prisma.$disconnect();
  logger.info("🔌 Trend detection closed");
}
