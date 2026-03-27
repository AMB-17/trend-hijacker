import { Logger } from '@packages/logger';

interface MetricPoint {
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface MetricsAggregates {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

interface ApiTimingMetrics {
  endpoint: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  responseSize?: number;
}

interface ErrorMetrics {
  error: Error;
  context: Record<string, any>;
  timestamp: Date;
}

/**
 * Metrics Service - Centralized APM and monitoring
 * Collects, aggregates, and reports performance metrics
 */
export class MetricsService {
  private metrics: Map<string, MetricPoint[]> = new Map();
  private apiTimings: ApiTimingMetrics[] = [];
  private errors: ErrorMetrics[] = [];
  private logger = new Logger('MetricsService');
  private retentionMs = 24 * 60 * 60 * 1000; // 24 hours
  private cleanupInterval: NodeJS.Timer;

  constructor() {
    this.setupCleanup();
  }

  private setupCleanup(): void {
    // Clean up old metrics every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();

    // Clean up metrics
    for (const [key, points] of this.metrics.entries()) {
      const filtered = points.filter((p) => now - p.timestamp.getTime() < this.retentionMs);
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filtered);
      }
    }

    // Clean up API timings
    this.apiTimings = this.apiTimings.filter(
      (t) => now - t.timestamp.getTime() < this.retentionMs
    );

    // Clean up errors
    this.errors = this.errors.filter((e) => now - e.timestamp.getTime() < this.retentionMs);
  }

  /**
   * Record a metric value
   */
  recordMetric(
    name: string,
    value: number,
    tags: Record<string, string> = {}
  ): void {
    const key = this.buildKey(name, tags);

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)!.push({
      value,
      timestamp: new Date(),
      tags,
    });

    // Keep only last 10000 points per metric
    const points = this.metrics.get(key)!;
    if (points.length > 10000) {
      this.metrics.set(key, points.slice(-10000));
    }
  }

  /**
   * Record API request timing
   */
  recordApiTiming(endpoint: string, duration: number, statusCode: number): void {
    this.apiTimings.push({
      endpoint,
      statusCode,
      duration,
      timestamp: new Date(),
    });

    // Record as metric
    this.recordMetric(`api.request.duration`, duration, {
      endpoint,
      statusCode: statusCode.toString(),
    });

    // Track error rate
    if (statusCode >= 400) {
      this.recordMetric(`api.errors`, 1, {
        endpoint,
        statusCode: statusCode.toString(),
      });
    }
  }

  /**
   * Record an error
   */
  recordError(error: Error, context: Record<string, any> = {}): void {
    this.errors.push({
      error,
      context,
      timestamp: new Date(),
    });

    this.logger.error('Error recorded:', {
      message: error.message,
      stack: error.stack,
      context,
    });

    // Record as metric
    this.recordMetric('errors.total', 1, {
      errorType: error.constructor.name,
    });
  }

  /**
   * Query metrics for a given time range
   */
  queryMetrics(
    metricName: string,
    timeRangeMs: number = 60000,
    tags?: Record<string, string>
  ): MetricsAggregates {
    const key = this.buildKey(metricName, tags);
    const points = this.metrics.get(key) || [];

    // Filter by time range
    const now = Date.now();
    const filtered = points.filter((p) => now - p.timestamp.getTime() < timeRangeMs);

    if (filtered.length === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const values = filtered.map((p) => p.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      sum,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }

  /**
   * Get API endpoint metrics
   */
  getEndpointMetrics(
    endpoint: string,
    timeRangeMs: number = 60000
  ): {
    p50: number;
    p95: number;
    p99: number;
    avgDuration: number;
    errorRate: number;
    totalRequests: number;
  } {
    const now = Date.now();
    const timings = this.apiTimings.filter(
      (t) =>
        t.endpoint === endpoint &&
        now - t.timestamp.getTime() < timeRangeMs
    );

    if (timings.length === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        avgDuration: 0,
        errorRate: 0,
        totalRequests: 0,
      };
    }

    const durations = timings.map((t) => t.duration).sort((a, b) => a - b);
    const errorCount = timings.filter((t) => t.statusCode >= 400).length;

    return {
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      errorRate: errorCount / timings.length,
      totalRequests: timings.length,
    };
  }

  /**
   * Get system health metrics
   */
  getSystemMetrics(): {
    cpuUsage: NodeJS.CpuUsage;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  } {
    return {
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }

  /**
   * Get performance report
   */
  getPerformanceReport(timeRangeMs: number = 60000): {
    totalRequests: number;
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
    endpoints: Array<{
      endpoint: string;
      requests: number;
      avgLatency: number;
      p95Latency: number;
      errorRate: number;
    }>;
  } {
    const now = Date.now();
    const timings = this.apiTimings.filter(
      (t) => now - t.timestamp.getTime() < timeRangeMs
    );

    if (timings.length === 0) {
      return {
        totalRequests: 0,
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        errorRate: 0,
        endpoints: [],
      };
    }

    const durations = timings.map((t) => t.duration).sort((a, b) => a - b);
    const errorCount = timings.filter((t) => t.statusCode >= 400).length;

    // Group by endpoint
    const endpointMap = new Map<string, ApiTimingMetrics[]>();
    for (const timing of timings) {
      if (!endpointMap.has(timing.endpoint)) {
        endpointMap.set(timing.endpoint, []);
      }
      endpointMap.get(timing.endpoint)!.push(timing);
    }

    const endpoints = Array.from(endpointMap.entries())
      .map(([endpoint, timings]) => {
        const durations = timings.map((t) => t.duration).sort((a, b) => a - b);
        const errors = timings.filter((t) => t.statusCode >= 400).length;

        return {
          endpoint,
          requests: timings.length,
          avgLatency: durations.reduce((a, b) => a + b, 0) / durations.length,
          p95Latency: durations[Math.floor(durations.length * 0.95)],
          errorRate: errors / timings.length,
        };
      })
      .sort((a, b) => b.requests - a.requests);

    return {
      totalRequests: timings.length,
      averageLatency: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95Latency: durations[Math.floor(durations.length * 0.95)],
      p99Latency: durations[Math.floor(durations.length * 0.99)],
      errorRate: errorCount / timings.length,
      endpoints,
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 100): ErrorMetrics[] {
    return this.errors.slice(-limit);
  }

  /**
   * Get error summary
   */
  getErrorSummary(timeRangeMs: number = 60000): {
    totalErrors: number;
    byType: Record<string, number>;
    recent: ErrorMetrics[];
  } {
    const now = Date.now();
    const recentErrors = this.errors.filter(
      (e) => now - e.timestamp.getTime() < timeRangeMs
    );

    const byType: Record<string, number> = {};
    for (const error of recentErrors) {
      const type = error.error.constructor.name;
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      totalErrors: recentErrors.length,
      byType,
      recent: recentErrors.slice(-20),
    };
  }

  /**
   * Check SLO compliance
   */
  checkSLO(): {
    compliant: boolean;
    p95Latency: { target: number; actual: number; ok: boolean };
    p99Latency: { target: number; actual: number; ok: boolean };
    errorRate: { target: number; actual: number; ok: boolean };
  } {
    const report = this.getPerformanceReport(60000);

    const p95Target = 100; // ms
    const p99Target = 500; // ms
    const errorRateTarget = 0.001; // 0.1%

    return {
      compliant:
        report.p95Latency <= p95Target &&
        report.p99Latency <= p99Target &&
        report.errorRate <= errorRateTarget,
      p95Latency: {
        target: p95Target,
        actual: report.p95Latency,
        ok: report.p95Latency <= p95Target,
      },
      p99Latency: {
        target: p99Target,
        actual: report.p99Latency,
        ok: report.p99Latency <= p99Target,
      },
      errorRate: {
        target: errorRateTarget,
        actual: report.errorRate,
        ok: report.errorRate <= errorRateTarget,
      },
    };
  }

  private buildKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }

    const tagPairs = Object.entries(tags)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    return `${name}{${tagPairs}}`;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

export default MetricsService;
