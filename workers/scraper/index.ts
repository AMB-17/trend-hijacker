/**
 * Scraper Worker Process
 * Main entry point for scraper workers
 */

import { Worker } from 'bullmq';
import { getScrapeQueue, getProcessingQueue, getRedisClient, scheduleScrapers } from './redis-queue';
import { MasterScraper } from './scrapers';
const { Pool } = require('pg') as {
  Pool: new (config: Record<string, unknown>) => any;
};

type DiscussionSource = 'reddit' | 'hackernews' | 'producthunt' | 'indiehackers' | 'rss';

interface ScrapedDiscussion {
  source: DiscussionSource;
  sourceId: string;
  url: string;
  title: string;
  content: string;
  author?: string;
  upvotes: number;
  commentsCount: number;
  createdAt: string | Date;
}

const dbPool: any = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

/**
 * Save scraped discussions to database
 */
async function saveDiscussions(discussions: ScrapedDiscussion[]) {
  for (const discussion of discussions) {
    const { source, sourceId, url, title, content, author, upvotes, commentsCount, createdAt } = discussion;

    await dbPool.query(
      `INSERT INTO discussions (source, source_id, url, title, content, author, upvotes, comments_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (source_id) DO UPDATE SET 
         upvotes = EXCLUDED.upvotes,
         comments_count = EXCLUDED.comments_count`,
      [source, sourceId, url, title, content, author, upvotes, commentsCount, createdAt]
    );
  }

  console.log(`✅ Saved ${discussions.length} discussions to database`);
}

/**
 * Setup scraper worker
 */
async function setupScraperWorker() {
  const scrapeQueue = getScrapeQueue();
  const processingQueue = getProcessingQueue();
  const scraper = new MasterScraper();

  const worker = new Worker('scrape', async job => {
    const { source } = job.data;
    console.log(`🕷️  Processing scrape job for source: ${source}`);

    try {
      let discussions: ScrapedDiscussion[] = [];

      // Call appropriate scraper based on source
      switch (source) {
        case 'reddit':
          // Reddit scraper returns multiple discussions
          discussions = await (scraper as any).reddit.scrape();
          break;
        case 'hackernews':
          discussions = await (scraper as any).hackernews.scrape();
          break;
        case 'producthunt':
          discussions = await (scraper as any).producthunt.scrape();
          break;
        case 'indiehackers':
          discussions = await (scraper as any).indiehackers.scrape();
          break;
        case 'rss':
          discussions = await (scraper as any).rss.scrape();
          break;
      }

      if (discussions.length > 0) {
        await saveDiscussions(discussions);

        // Add to processing queue
        await processingQueue.add(
          'process',
          { discussionIds: discussions.map(d => d.sourceId) },
          { priority: 1 }
        );
      }

      return { success: true, count: discussions.length };
    } catch (error) {
      console.error(`Scraper error for ${source}:`, error);
      throw error;
    }
  }, {
    connection: getRedisClient() as any,
    concurrency: 2,
  });

  worker.on('completed', job => {
    console.log(`✅ Job ${job.id} completed:`, job.returnvalue);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed:`, error);
  });

  return worker;
}

/**
 * Main entry point
 */
async function main() {
  console.log('🚀 Starting Scraper Worker...');

  await setupScraperWorker();
  scheduleScrapers();

  console.log('✅ Scraper worker ready');
  console.log('📅 Scrapers will run every hour');

  // Run initial scrape
  const scrapeQueue = getScrapeQueue();
  for (const source of ['reddit', 'hackernews', 'producthunt', 'indiehackers', 'rss'] as const) {
    await scrapeQueue.add('scrape', { source });
  }
}

main().catch(err => {
  console.error('Failed to start scraper worker:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
