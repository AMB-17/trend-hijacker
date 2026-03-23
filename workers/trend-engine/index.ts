/**
 * Trend Engine Worker Process
 */

import { Worker } from 'bullmq';
import { getProcessingQueue, getRedisClient } from '../scraper/redis-queue';
import { detectTrends } from './detector';
import pg from 'pg';

const { Pool } = pg;

let dbPool: pg.Pool;

function initDB() {
  dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
}

/**
 * Get discussions from database
 */
async function getDiscussions(ids: string[]) {
  const client = await dbPool.connect();

  try {
    const result = await client.query(
      `SELECT * FROM discussions WHERE source_id = ANY($1) ORDER BY created_at DESC LIMIT 500`,
      [ids]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Save trend to database
 */
async function saveTrend(trend: any) {
  const client = await dbPool.connect();

  try {
    const result = await client.query(
      `INSERT INTO trends (title, summary, opportunity_score, velocity_score, problem_intensity, novelty_score, discussion_count, source_count, status, category, suggested_ideas, market_potential_estimate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        trend.title,
        trend.summary,
        trend.opportunityScore,
        trend.velocityScore,
        trend.problemIntensity,
        trend.noveltyScore,
        trend.discussionCount,
        1, // sourceCount
        trend.status,
        trend.category,
        trend.suggestedIdeas,
        trend.marketPotential,
      ]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Link discussions to trend
 */
async function linkDiscussionsToTrend(trendId: string, discussionIds: string[]) {
  if (discussionIds.length === 0) return;

  const client = await dbPool.connect();

  try {
    for (const sourceId of discussionIds) {
      // Get discussion ID from source_id
      const discussion = await client.query(
        `SELECT id FROM discussions WHERE source_id = $1`,
        [sourceId]
      );

      if (discussion.rows.length > 0) {
        await client.query(
          `INSERT INTO trend_discussions (trend_id, discussion_id, relevance_score)
           VALUES ($1, $2, 0.8)
           ON CONFLICT DO NOTHING`,
          [trendId, discussion.rows[0].id]
        );
      }
    }
  } finally {
    client.release();
  }
}

/**
 * Setup trend engine worker
 */
async function setupTrendWorker() {
  const processingQueue = getProcessingQueue();

  const worker = new Worker('processing', async job => {
    const { discussionIds } = job.data;
    console.log(`🔍 Processing ${discussionIds.length} discussions for trend detection...`);

    try {
      // Get discussions from database
      const discussions = await getDiscussions(discussionIds);

      if (discussions.length === 0) {
        console.log('No discussions found to process');
        return { success: true, trendsDetected: 0 };
      }

      // Detect trends
      const trends = detectTrends(discussions);

      // Save to database
      let savedCount = 0;
      for (const trend of trends) {
        try {
          const saved = await saveTrend(trend);

          if (saved) {
            await linkDiscussionsToTrend(saved.id, discussionIds);
            savedCount++;
          }
        } catch (error) {
          console.error('Error saving trend:', error);
        }
      }

      console.log(`✅ Saved ${savedCount} new trends`);
      return { success: true, trendsDetected: savedCount };
    } catch (error) {
      console.error('Trend detection error:', error);
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
 * Maintenance: Update trend statuses based on velocity
 */
async function updateTrendStatuses() {
  const client = await dbPool.connect();

  try {
    // Update declining trends
    await client.query(`
      UPDATE trends
      SET status = 'declining'
      WHERE status != 'declining'
        AND created_at < NOW() - INTERVAL '7 days'
        AND opportunity_score < 30
    `);

    // Update peak trends
    await client.query(`
      UPDATE trends
      SET status = 'peak'
      WHERE status = 'growing'
        AND velocity_score > 0.8
    `);

    console.log('✅ Updated trend statuses');
  } finally {
    client.release();
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('🚀 Starting Trend Engine Worker...');

  initDB();
  await setupTrendWorker();

  // Run status updates every 6 hours
  setInterval(updateTrendStatuses, 6 * 60 * 60 * 1000);

  console.log('✅ Trend engine worker ready');
}

main().catch(err => {
  console.error('Failed to start trend engine worker:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await dbPool.end();
  process.exit(0);
});
