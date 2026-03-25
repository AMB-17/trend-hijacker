import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { auditService } from '../services/audit.service';
import { complianceService } from '../services/compliance.service';
import { logger } from '@packages/utils';

export default async function adminRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/admin/audit-logs
   * Query audit logs with filters
   */
  fastify.get(
    '/audit-logs',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            action: { type: 'string' },
            resource_type: { type: 'string' },
            status: { type: 'string', enum: ['success', 'failed'] },
            start_date: { type: 'string' },
            end_date: { type: 'string' },
            limit: { type: 'integer', default: 100 },
            offset: { type: 'integer', default: 0 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // TODO: Verify admin role
        const {
          user_id,
          action,
          resource_type,
          status,
          start_date,
          end_date,
          limit,
          offset,
        } = request.query as any;

        const filters = {
          userId: user_id,
          action,
          resourceType: resource_type,
          status,
          startDate: start_date ? new Date(start_date) : undefined,
          endDate: end_date ? new Date(end_date) : undefined,
          limit: Math.min(limit || 100, 1000),
          offset: offset || 0,
        };

        const { logs, total } = await auditService.queryLogs(filters);

        return {
          success: true,
          data: {
            logs,
            pagination: {
              limit: filters.limit,
              offset: filters.offset,
              total,
            },
          },
        };
      } catch (error) {
        logger.error('Failed to query audit logs', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to query audit logs',
        };
      }
    }
  );

  /**
   * GET /api/admin/audit-logs/statistics
   * Get audit log statistics
   */
  fastify.get(
    '/audit-logs/statistics',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // TODO: Verify admin role
        const stats = await auditService.getStatistics();

        return {
          success: true,
          data: stats,
        };
      } catch (error) {
        logger.error('Failed to get audit statistics', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to get audit statistics',
        };
      }
    }
  );

  /**
   * POST /api/admin/audit-logs/export
   * Export audit logs
   */
  fastify.post(
    '/audit-logs/export',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['json', 'csv'] },
            user_id: { type: 'string' },
            action: { type: 'string' },
            start_date: { type: 'string' },
            end_date: { type: 'string' },
          },
          required: ['format'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // TODO: Verify admin role
        const { format, ...filters } = request.body as any;

        const exportFilters = {
          userId: filters.user_id,
          action: filters.action,
          startDate: filters.start_date ? new Date(filters.start_date) : undefined,
          endDate: filters.end_date ? new Date(filters.end_date) : undefined,
        };

        const exportData = await auditService.exportLogs({
          format,
          filters: exportFilters,
        });

        const filename = `audit-logs-${new Date().toISOString()}.${format === 'json' ? 'json' : 'csv'}`;

        reply.header('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);

        return exportData;
      } catch (error) {
        logger.error('Failed to export audit logs', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to export audit logs',
        };
      }
    }
  );

  /**
   * DELETE /api/admin/audit-logs/old
   * Delete old audit logs based on retention policy
   */
  fastify.delete(
    '/audit-logs/old',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'integer', default: 90 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // TODO: Verify admin role
        const { days } = request.query as any;

        const deleted = await auditService.deleteOldLogs(days || 90);

        return {
          success: true,
          data: {
            deleted,
            message: `Deleted ${deleted} audit logs older than ${days || 90} days`,
          },
        };
      } catch (error) {
        logger.error('Failed to delete old audit logs', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to delete old audit logs',
        };
      }
    }
  );

  /**
   * GET /api/admin/compliance/reports
   * Generate compliance reports
   */
  fastify.get(
    '/compliance/reports',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['gdpr', 'soc2', 'hipaa'],
            },
            workspace_id: { type: 'string' },
          },
          required: ['type', 'workspace_id'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // TODO: Verify admin role
        const { type, workspace_id } = request.query as any;

        const report = await complianceService.generateComplianceReport(workspace_id, type);

        return {
          success: true,
          data: report,
        };
      } catch (error) {
        logger.error('Failed to generate compliance report', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to generate compliance report',
        };
      }
    }
  );

  /**
   * POST /api/admin/compliance/export
   * Export compliance data
   */
  fastify.post(
    '/compliance/export',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['json', 'csv'] },
            report_type: { type: 'string', enum: ['gdpr', 'soc2', 'hipaa'] },
            workspace_id: { type: 'string' },
          },
          required: ['format', 'report_type', 'workspace_id'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // TODO: Verify admin role
        const { format, report_type, workspace_id } = request.body as any;

        const report = await complianceService.generateComplianceReport(workspace_id, report_type);
        const exportData = format === 'json' ? JSON.stringify(report, null, 2) : JSON.stringify(report);

        const filename = `compliance-report-${report_type}-${new Date().toISOString()}.${format === 'json' ? 'json' : 'csv'}`;

        reply.header('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);

        return exportData;
      } catch (error) {
        logger.error('Failed to export compliance report', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to export compliance report',
        };
      }
    }
  );

  /**
   * GET /api/admin/retention-policies
   * Get retention policies
   */
  fastify.get(
    '/retention-policies',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // TODO: Verify admin role
        // TODO: Fetch from database
        const policies = [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            workspace_id: request.query.workspace_id || 'default',
            data_type: 'audit_logs',
            retention_days: 365,
            enabled: true,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            workspace_id: request.query.workspace_id || 'default',
            data_type: 'auth_logs',
            retention_days: 90,
            enabled: true,
          },
        ];

        return {
          success: true,
          data: policies,
        };
      } catch (error) {
        logger.error('Failed to get retention policies', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to get retention policies',
        };
      }
    }
  );

  /**
   * PUT /api/admin/retention-policies/:id
   * Update retention policy
   */
  fastify.put(
    '/retention-policies/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            retention_days: { type: 'integer' },
            enabled: { type: 'boolean' },
            archive_location: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // TODO: Verify admin role
        // TODO: Update in database
        const { id } = request.params as any;
        const updates = request.body as any;

        return {
          success: true,
          data: {
            id,
            ...updates,
            message: 'Retention policy updated successfully',
          },
        };
      } catch (error) {
        logger.error('Failed to update retention policy', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to update retention policy',
        };
      }
    }
  );

  /**
   * POST /api/admin/compliance/run-retention
   * Manually run retention policy cleanup
   */
  fastify.post(
    '/compliance/run-retention',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // TODO: Verify admin role
        const result = await complianceService.applyRetentionPolicy();

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error('Failed to run retention policies', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to run retention policies',
        };
      }
    }
  );
}
