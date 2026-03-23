/**
 * Redis Queue Management for async job processing
 */

import { createClient, RedisClientType } from 'redis';
import { Queue, Worker, Job } from 'bullmq';

let redisClient: RedisClientType | null = null;

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', err => console.log('Redis Client Error', err));
  }

  return redisClient;
}

/**
 * Queue for scraping jobs
 */
export function getScrapeQueue(): Queue {
  return new Queue('scrape', {
    connection: getRedisClient() as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    },
  });
}

/**
 * Queue for processing (NLP, trend detection, etc.)
 */
export function getProcessingQueue(): Queue {
  return new Queue('processing', {
    connection: getRedisClient() as any,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
    },
  });
}

/**
 * Add scrape job
 */
export async function addScrapeJob(source: 'reddit' | 'hackernews' | 'producthunt' | 'indiehackers' | 'rss') {
  const queue = getScrapeQueue();
  await queue.add('scrape', { source }, { priority: 1, delay: 0 });
}

/**
 * Add processing job
 */
export async function addProcessingJob(discussionIds: string[]) {
  const queue = getProcessingQueue();
  await queue.add('process', { discussionIds }, { priority: 2 });
}

/**
 * Schedule recurring scrape jobs
 */
export function scheduleScrapers() {
  const queue = getScrapeQueue();

  // Run scrapers every hour
  setInterval(async () => {
    console.log('📅 Scheduling scrape jobs...');
    for (const source of ['reddit', 'hackernews', 'producthunt', 'indiehackers', 'rss']) {
      await addScrapeJob(source as any);
    }
  }, 60 * 60 * 1000); // Every hour
}
