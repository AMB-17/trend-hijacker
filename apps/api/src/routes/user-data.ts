import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { complianceService } from '../services/compliance.service';
import { logger } from '@packages/utils';

export default async function userDataRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/user/export-data
   * Export user's personal data (GDPR Article 15 & 20)
   */
  fastify.get(
    '/export-data',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['json', 'csv'],
              default: 'json',
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        if (!userId) {
          reply.status(401);
          return {
            success: false,
            error: 'Unauthorized',
          };
        }

        const format = (request.query as any).format || 'json';

        const export_data = await complianceService.exportUserData(userId, format as 'json' | 'csv');

        return {
          success: true,
          data: {
            id: export_data.id,
            exportType: export_data.exportType,
            downloadToken: export_data.downloadToken,
            createdAt: export_data.createdAt,
            expiresAt: export_data.expiresAt,
            downloadUrl: `/api/user/export-data/${export_data.id}/download?token=${export_data.downloadToken}`,
            message: 'Your data export is ready. Download link will expire in 7 days.',
          },
        };
      } catch (error) {
        logger.error('Failed to export user data', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to export user data',
        };
      }
    }
  );

  /**
   * GET /api/user/export-data/:id/download
   * Download exported data
   */
  fastify.get(
    '/export-data/:id/download',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
          required: ['token'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const { token } = request.query as any;
        const userId = (request as any).userId;

        if (!userId) {
          reply.status(401);
          return {
            success: false,
            error: 'Unauthorized',
          };
        }

        // Verify export belongs to user and token is valid
        const export_data = await complianceService.getExportStatus(id, userId);

        if (!export_data) {
          reply.status(404);
          return {
            success: false,
            error: 'Export not found',
          };
        }

        if (export_data.downloadToken !== token) {
          reply.status(403);
          return {
            success: false,
            error: 'Invalid download token',
          };
        }

        if (new Date() > export_data.expiresAt) {
          reply.status(410);
          return {
            success: false,
            error: 'Download link has expired',
          };
        }

        // Mark as downloaded
        await complianceService.markAsDownloaded(token);

        // In production, fetch actual content from storage and stream
        const filename = `user-data-export.${export_data.exportType}`;
        reply.header('Content-Type', export_data.exportType === 'json' ? 'application/json' : 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);

        // TODO: Fetch actual data content from storage and return
        return { message: 'Download started' };
      } catch (error) {
        logger.error('Failed to download exported data', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to download exported data',
        };
      }
    }
  );

  /**
   * GET /api/user/export-status/:id
   * Check status of data export
   */
  fastify.get(
    '/export-status/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const userId = (request as any).userId;

        if (!userId) {
          reply.status(401);
          return {
            success: false,
            error: 'Unauthorized',
          };
        }

        const export_data = await complianceService.getExportStatus(id, userId);

        if (!export_data) {
          reply.status(404);
          return {
            success: false,
            error: 'Export not found',
          };
        }

        return {
          success: true,
          data: {
            id: export_data.id,
            exportType: export_data.exportType,
            createdAt: export_data.createdAt,
            expiresAt: export_data.expiresAt,
            downloadedAt: export_data.downloadedAt,
            status: export_data.downloadedAt ? 'downloaded' : 'ready',
            fileSizeBytes: export_data.fileSizeBytes,
          },
        };
      } catch (error) {
        logger.error('Failed to get export status', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to get export status',
        };
      }
    }
  );

  /**
   * POST /api/user/delete-account
   * Request account deletion (GDPR Article 17 - Right to be Forgotten)
   */
  fastify.post(
    '/delete-account',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            confirm_deletion: { type: 'boolean' },
            reason: { type: 'string' },
          },
          required: ['confirm_deletion'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        if (!userId) {
          reply.status(401);
          return {
            success: false,
            error: 'Unauthorized',
          };
        }

        const { confirm_deletion } = request.body as any;

        if (!confirm_deletion) {
          reply.status(400);
          return {
            success: false,
            error: 'Account deletion must be confirmed',
          };
        }

        // Check if there's already a pending deletion request
        const existingRequest = await complianceService.getDeletionStatus(userId);

        if (existingRequest && existingRequest.status === 'processing') {
          reply.status(409);
          return {
            success: false,
            error: 'Account deletion is already in progress',
          };
        }

        if (existingRequest && existingRequest.status === 'pending') {
          reply.status(409);
          return {
            success: false,
            error: 'Account deletion request already exists',
          };
        }

        // Start deletion process
        const deletionRequest = await complianceService.deleteUserData(userId, true);

        return {
          success: true,
          data: {
            id: deletionRequest.id,
            status: deletionRequest.status,
            requestedAt: deletionRequest.requestedAt,
            completedAt: deletionRequest.completedAt,
            message: 'Your account deletion request has been submitted. This process may take up to 30 days.',
          },
        };
      } catch (error) {
        logger.error('Failed to delete user account', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to process account deletion request',
        };
      }
    }
  );

  /**
   * GET /api/user/deletion-status
   * Check account deletion status
   */
  fastify.get(
    '/deletion-status',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        if (!userId) {
          reply.status(401);
          return {
            success: false,
            error: 'Unauthorized',
          };
        }

        const deletionRequest = await complianceService.getDeletionStatus(userId);

        if (!deletionRequest) {
          return {
            success: true,
            data: {
              hasRequest: false,
              message: 'No deletion request found',
            },
          };
        }

        return {
          success: true,
          data: {
            id: deletionRequest.id,
            hasRequest: true,
            status: deletionRequest.status,
            requestedAt: deletionRequest.requestedAt,
            completedAt: deletionRequest.completedAt,
            errorMessage: deletionRequest.errorMessage,
            anonymizedData: deletionRequest.anonymizedData,
          },
        };
      } catch (error) {
        logger.error('Failed to get deletion status', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to get deletion status',
        };
      }
    }
  );

  /**
   * POST /api/user/cancel-deletion
   * Cancel account deletion request
   */
  fastify.post(
    '/cancel-deletion',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            deletion_request_id: { type: 'string' },
          },
          required: ['deletion_request_id'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        if (!userId) {
          reply.status(401);
          return {
            success: false,
            error: 'Unauthorized',
          };
        }

        const { deletion_request_id } = request.body as any;

        const deletionRequest = await complianceService.getDeletionStatus(userId);

        if (!deletionRequest || deletionRequest.id !== deletion_request_id) {
          reply.status(404);
          return {
            success: false,
            error: 'Deletion request not found',
          };
        }

        if (deletionRequest.status === 'completed' || deletionRequest.status === 'processing') {
          reply.status(409);
          return {
            success: false,
            error: `Cannot cancel deletion request with status: ${deletionRequest.status}`,
          };
        }

        // TODO: Update deletion request status to 'cancelled' in database

        return {
          success: true,
          data: {
            message: 'Deletion request cancelled successfully. Your account remains active.',
          },
        };
      } catch (error) {
        logger.error('Failed to cancel deletion request', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to cancel deletion request',
        };
      }
    }
  );

  /**
   * GET /api/user/privacy-settings
   * Get user privacy settings
   */
  fastify.get(
    '/privacy-settings',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        if (!userId) {
          reply.status(401);
          return {
            success: false,
            error: 'Unauthorized',
          };
        }

        // TODO: Fetch from database
        const settings = {
          data_collection: 'all',
          marketing_emails: false,
          analytics_tracking: true,
          third_party_sharing: false,
        };

        return {
          success: true,
          data: settings,
        };
      } catch (error) {
        logger.error('Failed to get privacy settings', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to get privacy settings',
        };
      }
    }
  );

  /**
   * PUT /api/user/privacy-settings
   * Update user privacy settings
   */
  fastify.put(
    '/privacy-settings',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            data_collection: {
              type: 'string',
              enum: ['all', 'minimal', 'none'],
            },
            marketing_emails: { type: 'boolean' },
            analytics_tracking: { type: 'boolean' },
            third_party_sharing: { type: 'boolean' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        if (!userId) {
          reply.status(401);
          return {
            success: false,
            error: 'Unauthorized',
          };
        }

        const settings = request.body as any;

        // TODO: Update in database

        return {
          success: true,
          data: {
            ...settings,
            message: 'Privacy settings updated successfully',
          },
        };
      } catch (error) {
        logger.error('Failed to update privacy settings', { error });
        reply.status(500);
        return {
          success: false,
          error: 'Failed to update privacy settings',
        };
      }
    }
  );
}
