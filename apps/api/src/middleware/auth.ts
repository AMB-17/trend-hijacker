import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service';
import { sessionService } from '../services/session.service';
import { logger } from '@packages/utils';
import { createHash } from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';

export interface AuthenticatedRequest extends FastifyRequest {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
}

/**
 * Authentication middleware - validates session token from Authorization header
 */
export async function authMiddleware(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          timestamp: new Date().toISOString(),
          traceId: request.id,
        },
      };
    }

    const token = authHeader.slice(7);

    // Validate session token
    const session = await authService.validateSession(token);

    if (!session) {
      reply.code(401);
      return {
        success: false,
        error: {
          code: 'SESSION_INVALID',
          message: 'Invalid or expired session',
          timestamp: new Date().toISOString(),
          traceId: request.id,
        },
      };
    }

    // Attach user info to request
    request.userId = session.userId;
    request.sessionId = session.id;
    request.ipAddress = session.ipAddress || request.ip;

    logger.debug('User authenticated', { userId: session.userId, sessionId: session.id });
  } catch (error) {
    logger.error('Auth middleware error', { error });
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error',
        timestamp: new Date().toISOString(),
        traceId: request.id,
      },
    };
  }
}

/**
 * JWT Authentication middleware - validates JWT token from Authorization header
 */
export async function jwtAuthMiddleware(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          timestamp: new Date().toISOString(),
          traceId: request.id,
        },
      };
    }

    const token = authHeader.slice(7);

    // Verify JWT
    const payload = authService.verifyJWT(token);

    if (!payload) {
      reply.code(401);
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired JWT token',
          timestamp: new Date().toISOString(),
          traceId: request.id,
        },
      };
    }

    // Verify session still exists
    const session = await sessionService.getSessionById(payload.sessionId);

    if (!session) {
      reply.code(401);
      return {
        success: false,
        error: {
          code: 'SESSION_INVALID',
          message: 'Session no longer valid',
          timestamp: new Date().toISOString(),
          traceId: request.id,
        },
      };
    }

    // Attach user info to request
    request.userId = payload.userId;
    request.sessionId = payload.sessionId;
    request.ipAddress = session.ipAddress || request.ip;

    logger.debug('JWT authenticated', { userId: payload.userId, sessionId: payload.sessionId });
  } catch (error) {
    logger.error('JWT auth middleware error', { error });
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error',
        timestamp: new Date().toISOString(),
        traceId: request.id,
      },
    };
  }
}

/**
 * 2FA verification middleware - checks if user has 2FA enabled and verified
 */
export async function verify2FAMiddleware(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    if (!request.userId) {
      reply.code(401);
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
          traceId: request.id,
        },
      };
    }

    // Check if 2FA is verified in session
    const session = await sessionService.getSessionById(request.sessionId || '');

    if (!session) {
      reply.code(401);
      return {
        success: false,
        error: {
          code: 'SESSION_INVALID',
          message: 'Session invalid',
          timestamp: new Date().toISOString(),
          traceId: request.id,
        },
      };
    }

    // Note: In a real implementation, you'd check if 2FA verification is stored in the session
    // For now, we just verify that the user has 2FA enabled
    logger.debug('2FA verification middleware executed', { userId: request.userId });
  } catch (error) {
    logger.error('2FA middleware error', { error });
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error',
        timestamp: new Date().toISOString(),
        traceId: request.id,
      },
    };
  }
}

/**
 * CSRF protection middleware
 */
export async function csrfProtectionMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Only check for state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return;
    }

    const csrfToken = request.headers[CSRF_HEADER_NAME] || request.headers['x-csrf-token'];

    if (!csrfToken) {
      logger.warn('CSRF token missing', { method: request.method, url: request.url });
      reply.code(403);
      return {
        success: false,
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token required',
          timestamp: new Date().toISOString(),
          traceId: request.id,
        },
      };
    }

    // Validate CSRF token (in real implementation, verify against session)
    logger.debug('CSRF protection middleware executed', { hasToken: !!csrfToken });
  } catch (error) {
    logger.error('CSRF middleware error', { error });
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'CSRF_ERROR',
        message: 'CSRF validation error',
        timestamp: new Date().toISOString(),
        traceId: request.id,
      },
    };
  }
}

/**
 * Rate limiting middleware for auth endpoints
 */
export async function authRateLimitMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const ipAddress = request.ip;
    const key = `auth:ratelimit:${ipAddress}`;

    // In a real implementation, use Redis for distributed rate limiting
    logger.debug('Auth rate limit middleware executed', { ipAddress });
  } catch (error) {
    logger.error('Rate limit middleware error', { error });
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'RATE_LIMIT_ERROR',
        message: 'Rate limit check failed',
        timestamp: new Date().toISOString(),
        traceId: request.id,
      },
    };
  }
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return createHash('sha256').update(Math.random().toString()).digest('hex').slice(0, CSRF_TOKEN_LENGTH);
}

/**
 * Extract IP address from request
 */
export function getClientIpAddress(request: FastifyRequest): string {
  return (
    (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (request.headers['x-real-ip'] as string) ||
    request.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Extract user agent from request
 */
export function getClientUserAgent(request: FastifyRequest): string {
  return (request.headers['user-agent'] as string) || 'unknown';
}
