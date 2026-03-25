import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { trendAnalysis } from '../services/trend-analysis.service';
import { sentimentAnalysis } from '../services/sentiment-analysis.service';
import { advancedInsights } from '../services/advanced-insights.service';
import { logger } from '@packages/utils';

export async function trendAnalyticsRoutes(app: FastifyInstance) {
  /**
   * FEATURE 4: Trend Comparison & Analysis Reports
   */

  // GET /api/trends/{id}/timeseries?period=6m
  app.get<{ Params: { id: string }; Querystring: { period?: string } }>(
    '/trends/:id/timeseries',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { period = '6m' } = request.query;

        const result = await trendAnalysis.getTimeSeriesData(id, period as any);

        reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('Failed to get time-series data', { error });
        reply.status(400).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get time-series data',
        });
      }
    }
  );

  // GET /api/trends/{id}/seasonality?period=6m
  app.get<{ Params: { id: string }; Querystring: { period?: string } }>(
    '/trends/:id/seasonality',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { period = '6m' } = request.query;

        const result = await trendAnalysis.detectSeasonality(id, period as any);

        reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('Failed to detect seasonality', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to detect seasonality',
        });
      }
    }
  );

  // GET /api/trends/{id}/cohorts
  app.get<{ Params: { id: string } }>(
    '/trends/:id/cohorts',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await trendAnalysis.getCohortAnalysis(id);

        reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('Failed to get cohort analysis', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to get cohort analysis',
        });
      }
    }
  );

  // GET /api/trends/{id}/competitive-landscape
  app.get<{ Params: { id: string } }>(
    '/trends/:id/competitive-landscape',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await trendAnalysis.getCompetitiveLandscape(id);

        reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('Failed to get competitive landscape', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to get competitive landscape',
        });
      }
    }
  );

  // POST /api/trends/compare
  app.post<{ Body: { trendIds: string[] } }>(
    '/trends/compare',
    async (request, reply) => {
      try {
        const { trendIds } = request.body;

        if (!Array.isArray(trendIds) || trendIds.length < 2 || trendIds.length > 3) {
          reply.status(400).send({
            success: false,
            error: 'Please provide 2-3 trend IDs for comparison',
          });
          return;
        }

        const result = await trendAnalysis.compareTrends(trendIds);

        reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('Failed to compare trends', { error });
        reply.status(400).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to compare trends',
        });
      }
    }
  );

  /**
   * FEATURE 5: Advanced Trend Insights & Sentiment Analysis
   */

  // GET /api/trends/{id}/sentiment
  app.get<{ Params: { id: string } }>(
    '/trends/:id/sentiment',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await sentimentAnalysis.getSentimentAnalysis(id);

        reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('Failed to get sentiment analysis', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to get sentiment analysis',
        });
      }
    }
  );

  // GET /api/trends/{id}/sentiment-drivers
  app.get<{ Params: { id: string } }>(
    '/trends/:id/sentiment-drivers',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await sentimentAnalysis.analyzeSentimentDrivers(id);

        reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('Failed to analyze sentiment drivers', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to analyze sentiment drivers',
        });
      }
    }
  );

  // GET /api/trends/{id}/summary
  app.get<{ Params: { id: string } }>(
    '/trends/:id/summary',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await advancedInsights.generateAISummary(id);

        reply.send({
          success: true,
          data: { summary: result },
        });
      } catch (error) {
        logger.error('Failed to generate AI summary', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to generate summary',
        });
      }
    }
  );

  // GET /api/trends/{id}/drivers
  app.get<{ Params: { id: string } }>(
    '/trends/:id/drivers',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await advancedInsights.extractKeyDrivers(id);

        reply.send({
          success: true,
          data: { drivers: result },
        });
      } catch (error) {
        logger.error('Failed to extract key drivers', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to extract drivers',
        });
      }
    }
  );

  // GET /api/trends/{id}/sub-trends
  app.get<{ Params: { id: string } }>(
    '/trends/:id/sub-trends',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { db } = require('../db');

        const subTrends = await db.trendSubTrend.findMany({
          where: { parentTrendId: id },
          orderBy: { growth: 'desc' },
        });

        reply.send({
          success: true,
          data: { subTrends },
        });
      } catch (error) {
        logger.error('Failed to get sub-trends', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to get sub-trends',
        });
      }
    }
  );

  // GET /api/trends/{id}/risk-assessment
  app.get<{ Params: { id: string } }>(
    '/trends/:id/risk-assessment',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await advancedInsights.performRiskAssessment(id);

        reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('Failed to perform risk assessment', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to perform risk assessment',
        });
      }
    }
  );

  // GET /api/trends/{id}/industry-impact
  app.get<{ Params: { id: string } }>(
    '/trends/:id/industry-impact',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await advancedInsights.classifyIndustryImpact(id);

        reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('Failed to classify industry impact', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to classify industry impact',
        });
      }
    }
  );

  // GET /api/trends/{id}/tags
  app.get<{ Params: { id: string } }>(
    '/trends/:id/tags',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { db } = require('../db');

        // Check if tags exist in DB, if not generate them
        let tags = await db.trendTag.findMany({
          where: { trendId: id },
        });

        if (tags.length === 0) {
          // Generate tags asynchronously
          advancedInsights.generateAutoTags(id).catch(err => {
            logger.error('Failed to generate tags in background', { error: err });
          });
        }

        reply.send({
          success: true,
          data: { tags },
        });
      } catch (error) {
        logger.error('Failed to get tags', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to get tags',
        });
      }
    }
  );

  /**
   * FEATURE 4: Reporting Routes
   */

  // POST /api/reports/generate?format=pdf|csv
  app.post<{ Querystring: { format?: string }; Body: { trendIds: string[]; startDate: string; endDate: string } }>(
    '/reports/generate',
    async (request, reply) => {
      try {
        const { reportGeneration } = require('../services/report-generation.service');
        const { format = 'pdf' } = request.query;
        const { trendIds, startDate, endDate } = request.body;
        const userId = (request as any).userId; // Assume auth middleware adds this

        if (!userId) {
          reply.status(401).send({ success: false, error: 'Unauthorized' });
          return;
        }

        const report = await reportGeneration.generateReport(userId, {
          format: format as any,
          trendIds,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        });

        reply.send({
          success: true,
          data: report,
        });
      } catch (error) {
        logger.error('Failed to generate report', { error });
        reply.status(400).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate report',
        });
      }
    }
  );

  // GET /api/reports/history
  app.get(async (request, reply) => {
    try {
      const { reportGeneration } = require('../services/report-generation.service');
      const userId = (request as any).userId;

      if (!userId) {
        reply.status(401).send({ success: false, error: 'Unauthorized' });
        return;
      }

      const reports = await reportGeneration.getReportHistory(userId);

      reply.send({
        success: true,
        data: { reports },
      });
    } catch (error) {
      logger.error('Failed to get report history', { error });
      reply.status(400).send({
        success: false,
        error: 'Failed to get report history',
      });
    }
  });

  app.get('/reports/history', async (request, reply) => {
    try {
      const { reportGeneration } = require('../services/report-generation.service');
      const userId = (request as any).userId;

      if (!userId) {
        reply.status(401).send({ success: false, error: 'Unauthorized' });
        return;
      }

      const reports = await reportGeneration.getReportHistory(userId);

      reply.send({
        success: true,
        data: { reports },
      });
    } catch (error) {
      logger.error('Failed to get report history', { error });
      reply.status(400).send({
        success: false,
        error: 'Failed to get report history',
      });
    }
  });

  // POST /api/reports/scheduled
  app.post<{ Body: any }>(
    '/reports/scheduled',
    async (request, reply) => {
      try {
        const { reportGeneration } = require('../services/report-generation.service');
        const userId = (request as any).userId;

        if (!userId) {
          reply.status(401).send({ success: false, error: 'Unauthorized' });
          return;
        }

        const scheduled = await reportGeneration.createScheduledReport(userId, request.body);

        reply.send({
          success: true,
          data: scheduled,
        });
      } catch (error) {
        logger.error('Failed to create scheduled report', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to create scheduled report',
        });
      }
    }
  );

  // GET /api/reports/scheduled
  app.get('/reports/scheduled', async (request, reply) => {
    try {
      const { reportGeneration } = require('../services/report-generation.service');
      const userId = (request as any).userId;

      if (!userId) {
        reply.status(401).send({ success: false, error: 'Unauthorized' });
        return;
      }

      const scheduled = await reportGeneration.getScheduledReports(userId);

      reply.send({
        success: true,
        data: { scheduled },
      });
    } catch (error) {
      logger.error('Failed to get scheduled reports', { error });
      reply.status(400).send({
        success: false,
        error: 'Failed to get scheduled reports',
      });
    }
  });

  // DELETE /api/reports/scheduled/{id}
  app.delete<{ Params: { id: string } }>(
    '/reports/scheduled/:id',
    async (request, reply) => {
      try {
        const { reportGeneration } = require('../services/report-generation.service');
        const { id } = request.params;

        await reportGeneration.deleteScheduledReport(id);

        reply.send({
          success: true,
          data: { deleted: true },
        });
      } catch (error) {
        logger.error('Failed to delete scheduled report', { error });
        reply.status(400).send({
          success: false,
          error: 'Failed to delete scheduled report',
        });
      }
    }
  );
}
