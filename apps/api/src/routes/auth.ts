import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { sessionService } from '../services/session.service';
import { samlService } from '../services/saml.service';
import { errorResponse, successResponse } from '../utils/api-response';
import {
  authMiddleware,
  jwtAuthMiddleware,
  csrfProtectionMiddleware,
  getClientIpAddress,
  getClientUserAgent,
  generateCSRFToken,
  AuthenticatedRequest,
} from '../middleware/auth';
import { logger } from '@packages/utils';
import { query } from '../db';

// Request schemas
const OAuth2CallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

const SAML2ACSSchema = z.object({
  SAMLResponse: z.string(),
  RelayState: z.string().optional(),
});

const Verify2FASchema = z.object({
  token: z.string().length(6),
});

const Enable2FASchema = z.object({
  secretKey: z.string(),
  token: z.string().length(6),
});

const Disable2FASchema = z.object({
  password: z.string(),
});

const UpdateDeviceNameSchema = z.object({
  deviceName: z.string().max(255),
});

export default async function authRoutes(app: FastifyInstance) {
  /**
   * OAuth callback endpoint
   * POST /api/auth/oauth/callback/:provider
   */
  app.post('/oauth/callback/:provider', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { provider } = request.params as { provider: string };
      const parsed = OAuth2CallbackSchema.safeParse(request.body ?? {});

      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          'Invalid request parameters',
          'INVALID_OAUTH_PARAMS',
          parsed.error.flatten()
        );
      }

      // Validate provider
      const validProviders = ['google', 'github', 'azure'];
      if (!validProviders.includes(provider.toLowerCase())) {
        reply.code(400);
        return errorResponse(request, 'Invalid OAuth provider', 'INVALID_OAUTH_PROVIDER');
      }

      const ipAddress = getClientIpAddress(request);
      const userAgent = getClientUserAgent(request);

      // In production, exchange code for tokens and get user info
      // This is a simplified implementation
      logger.info('OAuth callback received', { provider });

      await authService.logAuthEvent('oauth_login', 'pending', undefined, ipAddress, userAgent);

      return successResponse(
        {
          message: 'OAuth callback received. In production, exchange code for tokens here.',
          provider,
        },
        { csrfToken: generateCSRFToken() }
      );
    } catch (error) {
      logger.error('OAuth callback error', { error });
      reply.code(500);
      return errorResponse(request, 'OAuth callback failed', 'OAUTH_ERROR');
    }
  });

  /**
   * SAML metadata endpoint
   * GET /api/auth/saml/metadata
   */
  app.get('/saml/metadata', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const entityId = process.env.SAML_ENTITY_ID || 'https://trend-hijacker.example.com';
      const acsUrl = `${process.env.SAML_ACS_URL || 'https://trend-hijacker.example.com'}/api/auth/saml/acs`;
      const sloUrl = `${process.env.SAML_SLO_URL || 'https://trend-hijacker.example.com'}/api/auth/saml/slo`;

      const metadata = samlService.generateSPMetadata(entityId, acsUrl, sloUrl);

      reply.type('application/xml');
      return metadata;
    } catch (error) {
      logger.error('SAML metadata error', { error });
      reply.code(500);
      return errorResponse(request, 'Failed to generate SAML metadata', 'SAML_METADATA_ERROR');
    }
  });

  /**
   * SAML ACS endpoint
   * POST /api/auth/saml/acs
   */
  app.post('/saml/acs', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = SAML2ACSSchema.safeParse(request.body ?? {});

      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          'Invalid SAML response',
          'INVALID_SAML_RESPONSE',
          parsed.error.flatten()
        );
      }

      const { SAMLResponse } = parsed.data;
      const ipAddress = getClientIpAddress(request);
      const userAgent = getClientUserAgent(request);

      // In production, validate SAML assertion using node-saml library
      logger.info('SAML ACS endpoint called', { hasAssertion: !!SAMLResponse });

      await authService.logAuthEvent('saml_login', 'pending', undefined, ipAddress, userAgent);

      return successResponse({
        message: 'SAML assertion received. Validate with node-saml library in production.',
      });
    } catch (error) {
      logger.error('SAML ACS error', { error });
      reply.code(500);
      return errorResponse(request, 'SAML assertion processing failed', 'SAML_ACS_ERROR');
    }
  });

  /**
   * Enable 2FA
   * POST /api/auth/2fa/enable
   * Requires: authentication
   */
  app.post(
    '/2fa/enable',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        // Generate 2FA secret
        const { secret, qrCode, backupCodes } = await authService.setup2FA(request.userId);

        return successResponse({
          secret,
          qrCode,
          backupCodes,
          message: 'Scan the QR code with your authenticator app and verify with the token to enable 2FA',
        });
      } catch (error) {
        logger.error('2FA setup error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, '2FA setup failed', '2FA_SETUP_ERROR');
      }
    }
  );

  /**
   * Verify 2FA setup
   * POST /api/auth/2fa/verify
   * Requires: authentication, CSRF protection
   */
  app.post(
    '/2fa/verify',
    { preHandler: [authMiddleware, csrfProtectionMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const parsed = Verify2FASchema.safeParse(request.body ?? {});

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid 2FA token',
            'INVALID_2FA_TOKEN',
            parsed.error.flatten()
          );
        }

        // For this endpoint, we need the secret from the setup request
        // In a real implementation, store the setup attempt temporarily
        // For now, this is a placeholder
        logger.info('2FA verification attempt', { userId: request.userId });

        return successResponse({
          message: 'For production, implement 2FA verification with stored secret',
        });
      } catch (error) {
        logger.error('2FA verification error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, '2FA verification failed', '2FA_VERIFY_ERROR');
      }
    }
  );

  /**
   * Verify 2FA token (TOTP)
   * POST /api/auth/2fa/verify-token
   * Requires: authentication
   */
  app.post(
    '/2fa/verify-token',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const parsed = Verify2FASchema.safeParse(request.body ?? {});

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid 2FA token',
            'INVALID_2FA_TOKEN',
            parsed.error.flatten()
          );
        }

        const isValid = await authService.verify2FAToken(request.userId, parsed.data.token);

        if (!isValid) {
          reply.code(401);
          await authService.logAuthEvent(
            '2fa_verify',
            'failed',
            request.userId,
            request.ipAddress,
            getClientUserAgent(request),
            'Invalid 2FA token'
          );
          return errorResponse(request, 'Invalid 2FA token', 'INVALID_2FA_TOKEN');
        }

        await authService.logAuthEvent('2fa_verify', 'success', request.userId, request.ipAddress);

        return successResponse({ verified: true });
      } catch (error) {
        logger.error('2FA verification error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, '2FA verification failed', '2FA_VERIFY_ERROR');
      }
    }
  );

  /**
   * Verify 2FA backup code
   * POST /api/auth/2fa/verify-backup-code
   * Requires: authentication
   */
  app.post(
    '/2fa/verify-backup-code',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const parsed = z.object({ code: z.string() }).safeParse(request.body ?? {});

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid backup code',
            'INVALID_BACKUP_CODE',
            parsed.error.flatten()
          );
        }

        const isValid = await authService.verify2FABackupCode(request.userId, parsed.data.code);

        if (!isValid) {
          reply.code(401);
          await authService.logAuthEvent(
            '2fa_backup_code',
            'failed',
            request.userId,
            request.ipAddress,
            getClientUserAgent(request),
            'Invalid backup code'
          );
          return errorResponse(request, 'Invalid backup code', 'INVALID_BACKUP_CODE');
        }

        const remaining = await authService.get2FABackupCodeCount(request.userId);

        await authService.logAuthEvent(
          '2fa_backup_code',
          'success',
          request.userId,
          request.ipAddress
        );

        return successResponse({
          verified: true,
          remainingCodes: remaining,
          message: `${remaining} backup codes remaining`,
        });
      } catch (error) {
        logger.error('2FA backup code verification error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, '2FA backup code verification failed', '2FA_BACKUP_ERROR');
      }
    }
  );

  /**
   * Disable 2FA
   * POST /api/auth/2fa/disable
   * Requires: authentication, CSRF protection
   */
  app.post(
    '/2fa/disable',
    { preHandler: [authMiddleware, csrfProtectionMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        await authService.disable2FA(request.userId);

        await authService.logAuthEvent('2fa_disable', 'success', request.userId, request.ipAddress);

        return successResponse({ message: '2FA has been disabled' });
      } catch (error) {
        logger.error('2FA disable error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, '2FA disable failed', '2FA_DISABLE_ERROR');
      }
    }
  );

  /**
   * Get 2FA backup codes count
   * GET /api/auth/2fa/backup-codes
   * Requires: authentication
   */
  app.get(
    '/2fa/backup-codes',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const count = await authService.get2FABackupCodeCount(request.userId);

        return successResponse({ remainingCodes: count });
      } catch (error) {
        logger.error('Get 2FA backup codes error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, 'Failed to get backup codes', 'BACKUP_CODES_ERROR');
      }
    }
  );

  /**
   * Get user sessions
   * GET /api/auth/sessions
   * Requires: authentication
   */
  app.get(
    '/sessions',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const sessions = await sessionService.getActiveSessionsForUser(request.userId);

        return successResponse({
          sessions: sessions.map(s => ({
            id: s.id,
            deviceName: s.deviceName,
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            createdAt: s.createdAt,
            lastActivityAt: s.lastActivityAt,
            expiresAt: s.expiresAt,
            isCurrent: s.id === request.sessionId,
          })),
        });
      } catch (error) {
        logger.error('Get sessions error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, 'Failed to get sessions', 'SESSIONS_ERROR');
      }
    }
  );

  /**
   * Delete session
   * DELETE /api/auth/sessions/:sessionId
   * Requires: authentication, CSRF protection
   */
  app.delete(
    '/sessions/:sessionId',
    { preHandler: [authMiddleware, csrfProtectionMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const { sessionId } = request.params as { sessionId: string };

        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        // Verify session belongs to user
        const session = await sessionService.getSessionById(sessionId);

        if (!session || session.userId !== request.userId) {
          reply.code(403);
          return errorResponse(request, 'Forbidden', 'FORBIDDEN');
        }

        await sessionService.invalidateSession(sessionId);

        return successResponse({ message: 'Session deleted' });
      } catch (error) {
        logger.error('Delete session error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, 'Failed to delete session', 'DELETE_SESSION_ERROR');
      }
    }
  );

  /**
   * Logout (delete all sessions)
   * POST /api/auth/logout
   * Requires: authentication, CSRF protection
   */
  app.post(
    '/logout',
    { preHandler: [authMiddleware, csrfProtectionMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        await sessionService.invalidateAllUserSessions(request.userId);

        await authService.logAuthEvent('logout', 'success', request.userId, request.ipAddress);

        return successResponse({ message: 'Logged out successfully' });
      } catch (error) {
        logger.error('Logout error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, 'Logout failed', 'LOGOUT_ERROR');
      }
    }
  );

  /**
   * Get auth logs
   * GET /api/auth/logs
   * Requires: authentication
   */
  app.get(
    '/logs',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const logs = await authService.getUserAuthLogs(request.userId);

        return successResponse({ logs });
      } catch (error) {
        logger.error('Get auth logs error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, 'Failed to get auth logs', 'LOGS_ERROR');
      }
    }
  );

  /**
   * Get CSRF token
   * GET /api/auth/csrf-token
   */
  app.get('/csrf-token', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return successResponse({ csrfToken: generateCSRFToken() });
    } catch (error) {
      logger.error('CSRF token generation error', { error });
      reply.code(500);
      return errorResponse(request, 'Failed to generate CSRF token', 'CSRF_ERROR');
    }
  });
}
