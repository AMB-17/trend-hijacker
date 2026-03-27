import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { auditService } from '../services/audit.service';
import { authService } from '../services/auth.service';
import { errorResponse, successResponse } from '../utils/api-response';
import {
  authMiddleware,
  csrfProtectionMiddleware,
  getClientIpAddress,
  getClientUserAgent,
  AuthenticatedRequest,
  adminMiddleware,
} from '../middleware/auth';
import { logger } from '@packages/utils';

// Request validation schemas
const QueryAuditLogsSchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  status: z.enum(['success', 'failed']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

const ExportAuditLogsSchema = z.object({
  format: z.enum(['json', 'csv', 'jsonl']).optional().default('json'),
  userId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeMetadata: z.boolean().optional(),
});

const ExportUserDataSchema = z.object({});

const DeleteAccountSchema = z.object({
  password: z.string().min(1),
  confirm: z.boolean(),
});

const ComplianceReportSchema = z.object({
  framework: z.enum(['gdpr', 'hipaa', 'soc2', 'pci_dss', 'iso_27001', 'ccpa']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export default async function auditRoutes(app: FastifyInstance) {
  /**
   * Query Audit Logs (Admin only)
   * GET /api/admin/audit-logs
   * Requires: admin authorization
   */
  app.get(
    '/admin/audit-logs',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const parsed = QueryAuditLogsSchema.safeParse(request.query);

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid query parameters',
            'INVALID_PARAMS',
            parsed.error.flatten()
          );
        }

        const filters = {
          userId: parsed.data.userId,
          action: parsed.data.action,
          resourceType: parsed.data.resourceType,
          resourceId: parsed.data.resourceId,
          status: parsed.data.status,
          startDate: parsed.data.startDate
            ? new Date(parsed.data.startDate)
            : undefined,
          endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
          limit: parsed.data.limit,
          offset: parsed.data.offset,
        };

        const { logs, total } = await auditService.queryAuditLogs(filters);

        await auditService.logAction(
          request.userId,
          'audit_logs_queried',
          'audit_log',
          undefined,
          null,
          { filters },
          { ipAddress: getClientIpAddress(request), userAgent: getClientUserAgent(request) },
          'success'
        );

        return successResponse({
          logs,
          total,
          hasMore: parsed.data.offset + parsed.data.limit < total,
          limit: parsed.data.limit,
          offset: parsed.data.offset,
        });
      } catch (error) {
        logger.error('Error querying audit logs', { error });
        reply.code(500);
        return errorResponse(request, 'Failed to query audit logs', 'AUDIT_QUERY_ERROR');
      }
    }
  );

  /**
   * Export Audit Logs (Admin only)
   * POST /api/admin/audit-logs/export
   * Requires: admin authorization
   */
  app.post(
    '/admin/audit-logs/export',
    { preHandler: [authMiddleware, adminMiddleware, csrfProtectionMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const parsed = ExportAuditLogsSchema.safeParse(request.body ?? {});

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid export parameters',
            'INVALID_EXPORT_PARAMS',
            parsed.error.flatten()
          );
        }

        const filters = {
          userId: parsed.data.userId,
          action: parsed.data.action,
          startDate: parsed.data.startDate
            ? new Date(parsed.data.startDate)
            : undefined,
          endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        };

        const exportData = await auditService.exportAuditLogs(filters, parsed.data.format);

        // Set appropriate content type
        let contentType = 'application/json';
        let filename = `audit-logs-${new Date().toISOString()}.json`;

        if (parsed.data.format === 'csv') {
          contentType = 'text/csv';
          filename = `audit-logs-${new Date().toISOString()}.csv`;
        } else if (parsed.data.format === 'jsonl') {
          contentType = 'application/x-jsonlines';
          filename = `audit-logs-${new Date().toISOString()}.jsonl`;
        }

        await auditService.logAction(
          request.userId,
          'audit_logs_exported',
          'audit_log',
          undefined,
          null,
          { format: parsed.data.format, size: exportData.length },
          { ipAddress: getClientIpAddress(request), userAgent: getClientUserAgent(request) },
          'success'
        );

        reply.type(contentType);
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
        return exportData;
      } catch (error) {
        logger.error('Error exporting audit logs', { error });
        reply.code(500);
        return errorResponse(request, 'Failed to export audit logs', 'AUDIT_EXPORT_ERROR');
      }
    }
  );

  /**
   * Get Compliance Report (Admin only)
   * POST /api/admin/compliance/reports
   * Requires: admin authorization
   */
  app.post(
    '/admin/compliance/reports',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const parsed = ComplianceReportSchema.safeParse(request.body ?? {});

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid report parameters',
            'INVALID_REPORT_PARAMS',
            parsed.error.flatten()
          );
        }

        const startDate = new Date(parsed.data.startDate);
        const endDate = new Date(parsed.data.endDate);

        if (startDate >= endDate) {
          reply.code(400);
          return errorResponse(request, 'Start date must be before end date', 'INVALID_DATE_RANGE');
        }

        const report = await auditService.generateComplianceReport(
          parsed.data.framework,
          startDate,
          endDate
        );

        await auditService.logAction(
          request.userId,
          'compliance_report_generated',
          'compliance_report',
          undefined,
          null,
          { framework: parsed.data.framework },
          { ipAddress: getClientIpAddress(request), userAgent: getClientUserAgent(request) },
          'success'
        );

        return successResponse({
          report,
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error generating compliance report', { error });
        reply.code(500);
        return errorResponse(
          request,
          'Failed to generate compliance report',
          'COMPLIANCE_REPORT_ERROR'
        );
      }
    }
  );

  /**
   * Get Audit Statistics (Admin only)
   * GET /api/admin/audit-logs/stats
   */
  app.get(
    '/admin/audit-logs/stats',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const stats = await auditService.getStatistics();

        const actionCounts = await auditService.getActionCounts(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          new Date()
        );

        const failedLogins = await auditService.getFailedLoginsByIP(10);

        return successResponse({
          summary: stats,
          actionCounts,
          failedLoginsByIP: failedLogins,
        });
      } catch (error) {
        logger.error('Error getting audit statistics', { error });
        reply.code(500);
        return errorResponse(request, 'Failed to get statistics', 'STATS_ERROR');
      }
    }
  );

  /**
   * Export User Data (GDPR Data Portability)
   * POST /api/user/export-data
   * Requires: authentication
   */
  app.post(
    '/user/export-data',
    { preHandler: [authMiddleware, csrfProtectionMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const parsed = ExportUserDataSchema.safeParse(request.body ?? {});

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid parameters',
            'INVALID_PARAMS',
            parsed.error.flatten()
          );
        }

        // Get all user data for GDPR export
        const userData = await auditService.getUserDataExport(request.userId);

        // Log the export
        await auditService.logAction(
          request.userId,
          'data_exported',
          'user',
          request.userId,
          null,
          { exportedAt: new Date().toISOString() },
          { ipAddress: getClientIpAddress(request), userAgent: getClientUserAgent(request) },
          'success'
        );

        logger.info('User data exported for GDPR', { userId: request.userId });

        reply.type('application/json');
        reply.header(
          'Content-Disposition',
          `attachment; filename="user-data-${new Date().toISOString()}.json"`
        );

        return {
          exportDate: new Date().toISOString(),
          user: userData.user,
          auditLog: userData.auditLog,
          sessions: userData.sessions,
        };
      } catch (error) {
        logger.error('Error exporting user data', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, 'Failed to export user data', 'DATA_EXPORT_ERROR');
      }
    }
  );

  /**
   * Request Account Deletion (GDPR Right to be Forgotten)
   * POST /api/user/delete-account
   * Requires: authentication, CSRF protection
   */
  app.post(
    '/user/delete-account',
    { preHandler: [authMiddleware, csrfProtectionMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const parsed = DeleteAccountSchema.safeParse(request.body ?? {});

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid parameters',
            'INVALID_PARAMS',
            parsed.error.flatten()
          );
        }

        if (!parsed.data.confirm) {
          reply.code(400);
          return errorResponse(
            request,
            'Account deletion must be confirmed',
            'DELETION_NOT_CONFIRMED'
          );
        }

        // In production, verify password hash
        // For now, just log the deletion request

        await auditService.logDeletionRequest(request.userId, 'User requested account deletion');

        logger.info('Account deletion requested', { userId: request.userId });

        return successResponse({
          message:
            'Account deletion request submitted. Your account will be deleted within 30 days.',
          requestId: `del-${Date.now()}`,
          willDeleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } catch (error) {
        logger.error('Error processing account deletion', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, 'Failed to process deletion request', 'DELETION_ERROR');
      }
    }
  );

  /**
   * Get User Audit History
   * GET /api/user/audit-history
   * Requires: authentication
   */
  app.get(
    '/user/audit-history',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const limit = Math.min(
          parseInt((request.query as any).limit || '50', 10),
          500
        );

        const logs = await auditService.getUserActionHistory(request.userId, limit);

        return successResponse({
          logs,
          total: logs.length,
          limit,
        });
      } catch (error) {
        logger.error('Error getting user audit history', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(
          request,
          'Failed to get audit history',
          'AUDIT_HISTORY_ERROR'
        );
      }
    }
  );

  /**
   * Get Sensitive Actions Audit Trail (Admin only)
   * GET /api/admin/audit-logs/sensitive
   */
  app.get(
    '/admin/audit-logs/sensitive',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const startDate = (request.query as any).startDate
          ? new Date((request.query as any).startDate)
          : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days

        const endDate = (request.query as any).endDate
          ? new Date((request.query as any).endDate)
          : new Date();

        const logs = await auditService.getSensitiveActionsAudit({
          startDate,
          endDate,
          userId: (request.query as any).userId,
          limit: 500,
        });

        return successResponse({
          logs,
          total: logs.length,
          period: { startDate, endDate },
        });
      } catch (error) {
        logger.error('Error getting sensitive actions', { error });
        reply.code(500);
        return errorResponse(
          request,
          'Failed to get sensitive actions',
          'SENSITIVE_ACTIONS_ERROR'
        );
      }
    }
  );

  logger.info('Audit routes registered');
}
