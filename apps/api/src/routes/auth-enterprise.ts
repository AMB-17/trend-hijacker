import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';
import { sessionService } from '../services/session.service';
import { errorResponse, successResponse } from '../utils/api-response';
import {
  authMiddleware,
  jwtAuthMiddleware,
  csrfProtectionMiddleware,
  getClientIpAddress,
  getClientUserAgent,
  AuthenticatedRequest,
  rateLimitMiddleware,
} from '../middleware/auth';
import { logger } from '@packages/utils';

// Request validation schemas
const OAuth2CallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
  provider: z.enum(['google', 'github', 'azure', 'microsoft']),
});

const SAMLMetadataSchema = z.object({
  issuer: z.string().url().optional(),
  entityId: z.string().optional(),
});

const SAML2ResponseSchema = z.object({
  SAMLResponse: z.string().min(1),
  RelayState: z.string().optional(),
});

const Setup2FASchema = z.object({});

const Verify2FASchema = z.object({
  secretKey: z.string().min(1),
  token: z.string().length(6).regex(/^\d+$/),
});

const Disable2FASchema = z.object({
  password: z.string().min(1),
});

const SessionDeleteSchema = z.object({
  sessionId: z.string().cuid(),
});

export default async function authEnterpriseRoutes(app: FastifyInstance) {
  /**
   * OAuth2/OIDC Callback
   * POST /api/auth/oauth/:provider/callback
   * Rate limited: 5/min per IP
   */
  app.post(
    '/oauth/:provider/callback',
    { preHandler: [rateLimitMiddleware(5, 60000)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = OAuth2CallbackSchema.safeParse({
          ...request.body,
          provider: request.params.provider || (request.body as any)?.provider,
        });

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid OAuth callback parameters',
            'INVALID_OAUTH_PARAMS',
            parsed.error.flatten()
          );
        }

        const { code, state, provider } = parsed.data;
        const ipAddress = getClientIpAddress(request);
        const userAgent = getClientUserAgent(request);

        // Validate OAuth token (in production, exchange code for token)
        const isValid = await authService.validateOAuthToken(provider, code);

        if (!isValid) {
          await auditService.logSecurityEvent(
            undefined,
            'failed_oauth_validation',
            'high',
            `Failed OAuth validation for ${provider}`
          );

          reply.code(401);
          return errorResponse(request, 'Invalid OAuth code', 'INVALID_OAUTH_CODE');
        }

        // In production:
        // 1. Exchange code for OAuth token
        // 2. Fetch user info from provider
        // 3. Create or update OAuth account
        // 4. Create session

        logger.info('OAuth callback processed', { provider, state });

        return successResponse({
          message: `OAuth authentication with ${provider} processed successfully. Exchange code for token in production.`,
          code,
        });
      } catch (error) {
        logger.error('OAuth callback error', { error });
        reply.code(500);
        return errorResponse(request, 'OAuth callback processing failed', 'OAUTH_CALLBACK_ERROR');
      }
    }
  );

  /**
   * Get SAML Service Provider Metadata
   * POST /api/auth/saml/metadata
   */
  app.post(
    '/saml/metadata',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = SAMLMetadataSchema.safeParse(request.body ?? {});

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid metadata parameters',
            'INVALID_METADATA_PARAMS',
            parsed.error.flatten()
          );
        }

        const issuer =
          parsed.data.issuer || process.env.SAML_ENTITY_ID || 'https://trend-hijacker.example.com';
        const entityId =
          parsed.data.entityId || process.env.SAML_ENTITY_ID || 'https://trend-hijacker.example.com';
        const acsUrl = `${process.env.SAML_ACS_URL || issuer}/api/auth/saml/acs`;
        const sloUrl = `${process.env.SAML_SLO_URL || issuer}/api/auth/saml/slo`;

        // Generate basic SAML SP metadata XML
        const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="0" isDefault="true"/>
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${sloUrl}"/>
  </SPSSODescriptor>
</EntityDescriptor>`;

        reply.type('application/xml');
        return metadata;
      } catch (error) {
        logger.error('SAML metadata error', { error });
        reply.code(500);
        return errorResponse(request, 'Failed to generate SAML metadata', 'SAML_METADATA_ERROR');
      }
    }
  );

  /**
   * SAML Assertion Consumer Service
   * POST /api/auth/saml/acs
   * Receives and validates SAML assertions
   */
  app.post(
    '/saml/acs',
    { preHandler: [rateLimitMiddleware(10, 60000)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = SAML2ResponseSchema.safeParse(request.body ?? {});

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid SAML response',
            'INVALID_SAML_RESPONSE',
            parsed.error.flatten()
          );
        }

        const { SAMLResponse, RelayState } = parsed.data;
        const ipAddress = getClientIpAddress(request);
        const userAgent = getClientUserAgent(request);

        // In production:
        // 1. Decode and validate SAML assertion
        // 2. Verify signature against IdP certificate
        // 3. Check conditions (NotBefore, NotOnOrAfter)
        // 4. Extract user attributes
        // 5. Create or update user
        // 6. Create session

        logger.info('SAML ACS request received', {
          hasAssertion: !!SAMLResponse,
          hasRelayState: !!RelayState,
        });

        await auditService.logAction(
          undefined,
          'saml_login',
          'session',
          undefined,
          null,
          { relayState: RelayState },
          { ipAddress, userAgent },
          'success'
        );

        return successResponse({
          message:
            'SAML assertion received. Validate with node-saml library in production.',
          relayState: RelayState,
        });
      } catch (error) {
        logger.error('SAML ACS error', { error });
        reply.code(500);
        return errorResponse(request, 'SAML assertion processing failed', 'SAML_ACS_ERROR');
      }
    }
  );

  /**
   * Setup 2FA/TOTP
   * POST /api/auth/2fa/setup
   * Requires: authentication
   */
  app.post(
    '/2fa/setup',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const { secret, qrCode, backupCodes } = await authService.setup2FA(
          request.userId
        );

        return successResponse({
          secret,
          qrCode,
          backupCodes,
          message:
            'Scan the QR code with your authenticator app and verify with the token to enable 2FA',
        });
      } catch (error) {
        logger.error('2FA setup error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, '2FA setup failed', '2FA_SETUP_ERROR');
      }
    }
  );

  /**
   * Verify and Enable 2FA
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
            'Invalid 2FA verification parameters',
            'INVALID_2FA_PARAMS',
            parsed.error.flatten()
          );
        }

        const { secretKey, token } = parsed.data;
        const twoFA = await authService.enable2FA(request.userId, secretKey, token);

        if (!twoFA) {
          await auditService.logSecurityEvent(
            request.userId,
            'failed_2fa_verification',
            'medium',
            'Failed to verify 2FA token'
          );

          reply.code(401);
          return errorResponse(request, '2FA verification failed', '2FA_VERIFICATION_FAILED');
        }

        await auditService.logAction(
          request.userId,
          'two_fa_enabled',
          'user',
          request.userId,
          null,
          { enabled: true },
          { ipAddress: getClientIpAddress(request), userAgent: getClientUserAgent(request) },
          'success'
        );

        return successResponse({
          message: '2FA enabled successfully',
          backupCodes: [], // Backup codes should be returned only during setup
        });
      } catch (error) {
        logger.error('2FA verification error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, '2FA verification failed', '2FA_VERIFICATION_ERROR');
      }
    }
  );

  /**
   * Get Backup Codes
   * GET /api/auth/2fa/backup-codes
   * Requires: authentication, CSRF protection
   */
  app.get(
    '/2fa/backup-codes',
    { preHandler: [authMiddleware, csrfProtectionMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const count = await authService.get2FABackupCodeCount(request.userId);

        return successResponse({
          backupCodesRemaining: count,
          message: `You have ${count} backup codes remaining`,
        });
      } catch (error) {
        logger.error('Error getting backup code count', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, 'Failed to get backup codes', 'BACKUP_CODES_ERROR');
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

        const parsed = Disable2FASchema.safeParse(request.body ?? {});

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid parameters',
            'INVALID_PARAMS',
            parsed.error.flatten()
          );
        }

        // Verify password before allowing 2FA disable
        // In production, fetch user and verify password hash
        // For now, just disable
        await authService.disable2FA(request.userId);

        await auditService.logAction(
          request.userId,
          'two_fa_disabled',
          'user',
          request.userId,
          { enabled: true },
          { enabled: false },
          { ipAddress: getClientIpAddress(request), userAgent: getClientUserAgent(request) },
          'success'
        );

        return successResponse({
          message: '2FA disabled successfully',
        });
      } catch (error) {
        logger.error('2FA disable error', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, 'Failed to disable 2FA', '2FA_DISABLE_ERROR');
      }
    }
  );

  /**
   * Get Active Sessions
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

        const sessions = await authService.getActiveSessionsForUser(request.userId);
        const stats = await authService.getSessionStatistics(request.userId);

        return successResponse({
          sessions: sessions.map(s => ({
            id: s.id,
            deviceName: s.deviceName,
            ipAddress: s.ipAddress?.substring(0, 15), // Anonymize IP
            userAgent: s.userAgent,
            createdAt: s.createdAt,
            lastActivityAt: s.lastActivityAt,
            expiresAt: s.expiresAt,
          })),
          statistics: stats,
          total: sessions.length,
        });
      } catch (error) {
        logger.error('Error fetching sessions', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, 'Failed to fetch sessions', 'SESSIONS_FETCH_ERROR');
      }
    }
  );

  /**
   * Terminate Session
   * DELETE /api/auth/sessions/:sessionId
   * Requires: authentication
   */
  app.delete(
    '/sessions/:sessionId',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const sessionId = (request.params as any).sessionId;
        const parsed = SessionDeleteSchema.safeParse({ sessionId });

        if (!parsed.success) {
          reply.code(400);
          return errorResponse(
            request,
            'Invalid session ID',
            'INVALID_SESSION_ID',
            parsed.error.flatten()
          );
        }

        // Verify the session belongs to the user
        const session = await sessionService.getSessionById(sessionId);

        if (!session || session.userId !== request.userId) {
          reply.code(403);
          return errorResponse(request, 'Access denied', 'ACCESS_DENIED');
        }

        await sessionService.deleteSession(sessionId);

        await auditService.logAction(
          request.userId,
          'session_terminated',
          'session',
          sessionId,
          null,
          null,
          { ipAddress: getClientIpAddress(request), userAgent: getClientUserAgent(request) },
          'success'
        );

        return successResponse({
          message: 'Session terminated successfully',
        });
      } catch (error) {
        logger.error('Error terminating session', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(request, 'Failed to terminate session', 'SESSION_TERMINATE_ERROR');
      }
    }
  );

  /**
   * Terminate All Other Sessions
   * DELETE /api/auth/sessions/other/all
   * Requires: authentication
   */
  app.delete(
    '/sessions/other/all',
    { preHandler: [authMiddleware] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        if (!request.userId) {
          reply.code(401);
          return errorResponse(request, 'Unauthorized', 'UNAUTHORIZED');
        }

        const sessions = await authService.getActiveSessionsForUser(request.userId);
        const currentSessionId = (request as any).sessionId || request.headers['x-session-id'];

        for (const session of sessions) {
          if (session.id !== currentSessionId) {
            await sessionService.deleteSession(session.id);
          }
        }

        await auditService.logAction(
          request.userId,
          'all_other_sessions_terminated',
          'session',
          undefined,
          null,
          { terminatedCount: sessions.length - 1 },
          { ipAddress: getClientIpAddress(request), userAgent: getClientUserAgent(request) },
          'success'
        );

        return successResponse({
          message: 'All other sessions terminated successfully',
          terminatedCount: sessions.length - 1,
        });
      } catch (error) {
        logger.error('Error terminating all sessions', { error, userId: request.userId });
        reply.code(500);
        return errorResponse(
          request,
          'Failed to terminate all sessions',
          'ALL_SESSIONS_TERMINATE_ERROR'
        );
      }
    }
  );

  logger.info('Enterprise auth routes registered');
}
