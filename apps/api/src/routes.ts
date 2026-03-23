/**
 * API Routes for TREND HIJACKER
 */

import { FastifyInstance } from 'fastify';
import { query } from './db';
import { Trend, CursorPaginationSchema, CreateTrendInputSchema } from '@packages/types';
import { queries } from './schema';

export async function registerRoutes(fastify: FastifyInstance) {
  // ============ TRENDS ============
  
  fastify.get<{ Querystring: { limit?: number; offset?: number } }>(
    '/api/trends',
    async (request, reply) => {
      const limit = Math.min(request.query.limit || 20, 100);
      const offset = request.query.offset || 0;

      try {
        const result = await query(queries.trends.getAll(limit, offset));
        return {
          data: result.rows,
          pagination: { limit, offset, total: result.rowCount },
        };
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch trends' });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/trends/:id',
    async (request, reply) => {
      try {
        const result = await query(queries.trends.getById, [request.params.id]);

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: 'Trend not found' });
        }

        const trend = result.rows[0];

        // Get related discussions
        const discussionsResult = await query(
          `SELECT d.* FROM discussions d
           JOIN trend_discussions td ON d.id = td.discussion_id
           WHERE td.trend_id = $1
           ORDER BY td.relevance_score DESC LIMIT 20`,
          [request.params.id]
        );

        // Get pain points
        const painPointsResult = await query(queries.painPoints.getFForTrend, [request.params.id]);

        // Get metrics
        const metricsResult = await query(queries.metrics.getTrendHistory, [request.params.id, 30]);

        return {
          ...trend,
          discussions: discussionsResult.rows,
          painPoints: painPointsResult.rows,
          metrics: metricsResult.rows,
        };
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch trend' });
      }
    }
  );

  fastify.get<{ Params: { status: string } }>(
    '/api/trends/by-status/:status',
    async (request, reply) => {
      const status = request.params.status;
      const validStatuses = ['emerging', 'growing', 'peak', 'declining', 'stable'];

      if (!validStatuses.includes(status)) {
        return reply.status(400).send({ error: 'Invalid status' });
      }

      try {
        const result = await query(queries.trends.getByStatus, [status, 50]);
        return { data: result.rows };
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch trends' });
      }
    }
  );

  fastify.post<{ Body: any }>(
    '/api/trends',
    async (request, reply) => {
      try {
        const validated = CreateTrendInputSchema.parse(request.body);

        const result = await query(queries.trends.create, [
          validated.title,
          validated.summary,
          validated.opportunityScore,
          validated.velocityScore,
          validated.problemIntensity,
          validated.noveltyScore,
          validated.discussionCount,
          validated.sourceCount,
          validated.status,
          validated.category,
          validated.suggestedIdeas,
        ]);

        reply.status(201).send(result.rows[0]);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({ error: 'Validation failed', details: error.errors });
        }
        reply.status(500).send({ error: 'Failed to create trend' });
      }
    }
  );

  // ============ DISCUSSIONS ============

  fastify.get<{ Querystring: { limit?: number } }>(
    '/api/discussions/recent',
    async (request, reply) => {
      const limit = Math.min(request.query.limit || 100, 500);

      try {
        const result = await query(queries.discussions.findRecent, [limit]);
        return { data: result.rows };
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch discussions' });
      }
    }
  );

  // ============ TRENDS BY TIMEFRAME ============

  fastify.get<{ Params: { timeframe: string } }>(
    '/api/trends/trending/:timeframe',
    async (request, reply) => {
      const validTimeframes = ['1d', '7d', '30d'];
      const timeframe = request.params.timeframe;

      if (!validTimeframes.includes(timeframe)) {
        return reply.status(400).send({ error: 'Invalid timeframe' });
      }

      try {
        const result = await query(queries.trends.top(timeframe));
        return { data: result.rows };
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch trends' });
      }
    }
  );

  // ============ SEARCH ============

  fastify.get<{ Querystring: { q: string; limit?: number } }>(
    '/api/search',
    async (request, reply) => {
      const query_param = request.query.q;
      const limit = Math.min(request.query.limit || 20, 100);

      if (!query_param || query_param.length < 2) {
        return reply.status(400).send({ error: 'Query must be at least 2 characters' });
      }

      try {
        const result = await query(
          `SELECT * FROM trends
           WHERE title ILIKE $1 OR summary ILIKE $1
           ORDER BY opportunity_score DESC
           LIMIT $2`,
          [`%${query_param}%`, limit]
        );

        return { data: result.rows };
      } catch (error) {
        reply.status(500).send({ error: 'Search failed' });
      }
    }
  );

  // ============ STATS ============

  fastify.get('/api/stats', async (request, reply) => {
    try {
      const trendsCount = await query('SELECT COUNT(*) as count FROM trends');
      const discussionsCount = await query('SELECT COUNT(*) as count FROM discussions');
      const topScores = await query('SELECT AVG(opportunity_score) as avg_score FROM trends');

      return {
        trendsCount: trendsCount.rows[0].count,
        discussionsCount: discussionsCount.rows[0].count,
        averageOpportunityScore: topScores.rows[0].avg_score,
      };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to fetch stats' });
    }
  });
}
