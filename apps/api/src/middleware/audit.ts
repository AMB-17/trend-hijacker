import { FastifyRequest, FastifyReply } from 'fastify';
import { auditService } from '../services/audit.service';
import { logger } from '@packages/utils';

interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
}

/**
 * Extract audit context from request
 */
function extractAuditContext(request: FastifyRequest): AuditContext {
  const ipAddress =
    (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (request.headers['x-real-ip'] as string) ||
    request.ip ||
    'unknown';

  const userAgent = (request.headers['user-agent'] as string) || 'unknown';

  return {
    ipAddress,
    userAgent,
    userId: (request as any).userId,
  };
}

/**
 * Extract resource information from request
 */
function extractResourceInfo(
  request: FastifyRequest
): { resourceType: string | null; resourceId: string | null } {
  const path = request.url.split('?')[0];
  const parts = path.split('/').filter(p => p);

  // Map routes to resource types
  const resourceTypeMap: Record<string, string> = {
    trends: 'trend',
    alerts: 'alert',
    users: 'user',
    workspaces: 'workspace',
    collections: 'collection',
  };

  let resourceType: string | null = null;
  let resourceId: string | null = null;

  for (const [key, value] of Object.entries(resourceTypeMap)) {
    if (parts.includes(key)) {
      resourceType = value;
      // Try to extract ID from URL
      const keyIndex = parts.indexOf(key);
      if (keyIndex < parts.length - 1) {
        const nextPart = parts[keyIndex + 1];
        // Check if next part looks like an ID (UUID or numeric)
        if (/^[0-9a-f\-]{36}$|^\d+$/.test(nextPart)) {
          resourceId = nextPart;
        }
      }
      break;
    }
  }

  return { resourceType, resourceId };
}

/**
 * Capture request/response for auditing
 */
async function captureRequestBody(request: FastifyRequest): Promise<Record<string, any> | null> {
  try {
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      return request.body as Record<string, any>;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Main audit middleware
 */
export async function auditMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const startTime = Date.now();
  const context = extractAuditContext(request);
  const { resourceType, resourceId } = extractResourceInfo(request);

  // Only audit mutation operations
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return;
  }

  // Skip internal health checks and non-API routes
  if (request.url.includes('/health') || !request.url.includes('/api/')) {
    return;
  }

  try {
    const beforeValue = await captureRequestBody(request);

    // Hook into response to capture status and result
    const originalSend = reply.send;

    reply.send = function(payload: any) {
      const duration = Date.now() - startTime;
      const statusCode = reply.statusCode || 200;
      const isSuccess = statusCode >= 200 && statusCode < 300;

      // Log the action asynchronously (don't block response)
      setImmediate(async () => {
        try {
          const actionMap: Record<string, string> = {
            POST: 'create',
            PUT: 'update',
            PATCH: 'update',
            DELETE: 'delete',
          };

          const action = `${actionMap[request.method] || 'unknown'}_${resourceType || 'resource'}`;

          await auditService.logAction(
            context.userId || null,
            action,
            resourceType,
            resourceId,
            beforeValue,
            isSuccess && typeof payload === 'object' ? payload : null,
            {
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
            },
            isSuccess ? 'success' : 'failed',
            !isSuccess ? (payload?.error || 'Request failed') : undefined
          );

          logger.debug('Audit log created', {
            action,
            userId: context.userId,
            resourceType,
            statusCode,
            duration,
          });
        } catch (error) {
          logger.error('Failed to create audit log', { error });
        }
      });

      // Call original send
      return originalSend.call(this, payload);
    };
  } catch (error) {
    logger.error('Error in audit middleware', { error });
    // Don't throw, just log - we don't want audit failures to block requests
  }
}

/**
 * Middleware to require audit logging for sensitive operations
 */
export async function requireAuditLog(request: FastifyRequest, reply: FastifyReply) {
  // Mark that this request must be audited
  (request as any).requiresAudit = true;
}

/**
 * Get user audit context from JWT or session
 */
export function getUserIdFromRequest(request: FastifyRequest): string | undefined {
  // Extract from JWT token
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    // In production, verify and extract user ID from JWT
    // This is a placeholder
    return (request as any).userId;
  }

  return undefined;
}

/**
 * Middleware to track sensitive data changes
 */
export function trackSensitiveDataChanges(allowedFields: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (['PUT', 'PATCH'].includes(request.method)) {
      const body = request.body as Record<string, any>;

      // Filter to only allowed fields for sensitive operations
      if (body && allowedFields.length > 0) {
        const allowedBody: Record<string, any> = {};
        for (const field of allowedFields) {
          if (field in body) {
            allowedBody[field] = body[field];
          }
        }

        (request as any).filteredBody = allowedBody;
      }
    }
  };
}

/**
 * Middleware factory for specific resource audit tracking
 */
export function createResourceAuditMiddleware(resourceType: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    (request as any).auditResourceType = resourceType;
  };
}
