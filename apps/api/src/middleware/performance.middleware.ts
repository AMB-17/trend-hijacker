import { FastifyRequest, FastifyReply } from 'fastify';
import { MetricsService } from '../services/metrics.service';

/**
 * Performance Monitoring Middleware
 * Tracks request timing (p50, p95, p99), memory usage, and API metrics
 */

export const performanceMetricsMiddleware = (metricsService: MetricsService) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    // Store metrics in reply for tracking
    reply.on('finish', () => {
      const duration = Date.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;

      // Extract endpoint from path
      let endpoint = request.url.split('?')[0];
      endpoint = endpoint.replace(/\/\d+/g, '/:id'); // Normalize IDs

      // Record timing metrics
      metricsService.recordApiTiming(endpoint, duration, reply.statusCode);

      // Record memory metrics
      metricsService.recordMetric('memory.heap_used', process.memoryUsage().heapUsed, {
        endpoint,
        statusCode: reply.statusCode.toString(),
      });

      // Record memory delta for this request
      if (Math.abs(memoryDelta) > 1000000) {
        // > 1MB
        metricsService.recordMetric('memory.request_delta', memoryDelta, {
          endpoint,
          method: request.method,
        });
      }

      // Record response size
      const contentLength = reply.getHeader('content-length');
      if (contentLength) {
        metricsService.recordMetric('http.response_bytes', parseInt(contentLength as string), {
          endpoint,
        });
      }

      // Log slow requests
      if (duration > 1000) {
        console.warn(`SLOW_REQUEST: ${request.method} ${endpoint} took ${duration}ms`);
      }

      // Track error rates by endpoint
      if (reply.statusCode >= 400) {
        metricsService.recordMetric('http.errors', 1, {
          endpoint,
          statusCode: reply.statusCode.toString(),
        });
      }
    });
  };
};

/**
 * Request context middleware - attaches context to request
 */
export const requestContextMiddleware = () => {
  return (request: FastifyRequest, reply: FastifyReply, next: any) => {
    request.requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    request.startTime = Date.now();
    next();
  };
};

/**
 * Error tracking middleware
 */
export const errorTrackingMiddleware = (metricsService: MetricsService) => {
  return (error: Error, request: FastifyRequest, reply: FastifyReply) => {
    const duration = Date.now() - (request.startTime || Date.now());

    // Record error metric
    metricsService.recordError(error, {
      endpoint: request.url,
      method: request.method,
      statusCode: reply.statusCode,
      duration,
      requestId: request.requestId,
    });

    // Let default error handler proceed
  };
};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export default performanceMetricsMiddleware;
