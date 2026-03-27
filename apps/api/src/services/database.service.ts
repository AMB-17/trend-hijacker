import { Pool, PoolClient, QueryResult } from 'pg';
import { Logger } from '@packages/logger';

interface QueryMetrics {
  endpoint?: string;
  duration: number;
  rowCount?: number;
  query: string;
  timestamp: Date;
  slow: boolean;
}

interface SlowQueryAlert {
  query: string;
  duration: number;
  threshold: number;
  timestamp: Date;
}

interface IndexUtilization {
  indexName: string;
  scanCount: number;
  tupleRead: number;
  tupleFetch: number;
  indexSize: string;
  usageRatio: number;
}

/**
 * DatabaseService - Connection pool management, query optimization, and monitoring
 * Handles read/write split, slow query detection, and performance tracking
 */
export class DatabaseService {
  private primaryPool: Pool;
  private replicaPool: Pool;
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 1000; // milliseconds
  private logger = new Logger('DatabaseService');
  private metricsBuffer: Map<string, number[]> = new Map();

  constructor(primaryUrl: string, replicaUrl?: string) {
    this.primaryPool = new Pool({ connectionString: primaryUrl });
    this.replicaPool = new Pool({
      connectionString: replicaUrl || primaryUrl,
      max: 50, // Read replicas can handle more connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Setup event listeners for connection health
    this.setupPoolListeners(this.primaryPool, 'PRIMARY');
    this.setupPoolListeners(this.replicaPool, 'REPLICA');
  }

  private setupPoolListeners(pool: Pool, name: string) {
    pool.on('error', (err) => {
      this.logger.error(`${name} Pool error:`, err);
    });

    pool.on('connect', () => {
      this.logger.debug(`${name} Pool connection established`);
    });
  }

  /**
   * Execute a query on the primary database (write operations)
   */
  async queryPrimary<T = any>(
    query: string,
    values?: any[],
    endpoint?: string
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    try {
      const result = await this.primaryPool.query<T>(query, values);
      const duration = Date.now() - startTime;

      this.recordMetric({
        endpoint,
        duration,
        rowCount: result.rowCount ?? 0,
        query: this.sanitizeQuery(query),
        timestamp: new Date(),
        slow: duration > this.slowQueryThreshold,
      });

      if (duration > this.slowQueryThreshold) {
        this.alertSlowQuery(query, duration);
      }

      return result;
    } catch (error) {
      this.logger.error(`Query error on PRIMARY:`, { query, error });
      throw error;
    }
  }

  /**
   * Execute a query on the read replica (read-only operations)
   */
  async queryReplica<T = any>(
    query: string,
    values?: any[],
    endpoint?: string
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    try {
      const result = await this.replicaPool.query<T>(query, values);
      const duration = Date.now() - startTime;

      this.recordMetric({
        endpoint,
        duration,
        rowCount: result.rowCount ?? 0,
        query: this.sanitizeQuery(query),
        timestamp: new Date(),
        slow: duration > this.slowQueryThreshold,
      });

      return result;
    } catch (error) {
      // Fallback to primary if replica is unavailable
      this.logger.warn(`Query failed on REPLICA, falling back to PRIMARY:`, { query });
      return this.queryPrimary(query, values, endpoint);
    }
  }

  /**
   * Execute a transaction on the primary database
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    endpoint?: string
  ): Promise<T> {
    const client = await this.primaryPool.connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      this.recordMetric({
        endpoint,
        duration,
        query: 'TRANSACTION',
        timestamp: new Date(),
        slow: duration > this.slowQueryThreshold * 2,
      });

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Transaction error:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch insert for high-volume operations
   */
  async batchInsert<T = any>(
    table: string,
    columns: string[],
    rows: any[],
    batchSize: number = 1000,
    endpoint?: string
  ): Promise<number> {
    let inserted = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const placeholders = batch
        .map((_, idx) => `(${columns.map((_, j) => `$${idx * columns.length + j + 1}`).join(',')})`)
        .join(',');

      const values = batch.flat();
      const query = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`;

      try {
        const result = await this.queryPrimary(query, values, endpoint);
        inserted += result.rowCount ?? 0;
      } catch (error) {
        this.logger.error(`Batch insert error at row ${i}:`, error);
        throw error;
      }
    }

    return inserted;
  }

  /**
   * Record query performance metrics
   */
  private recordMetric(metric: QueryMetrics): void {
    this.queryMetrics.push(metric);

    // Keep only last 1000 metrics
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }

    // Aggregate metrics by endpoint
    if (metric.endpoint) {
      if (!this.metricsBuffer.has(metric.endpoint)) {
        this.metricsBuffer.set(metric.endpoint, []);
      }
      this.metricsBuffer.get(metric.endpoint)!.push(metric.duration);
    }
  }

  /**
   * Alert on slow queries
   */
  private alertSlowQuery(query: string, duration: number): void {
    const alert: SlowQueryAlert = {
      query: this.sanitizeQuery(query),
      duration,
      threshold: this.slowQueryThreshold,
      timestamp: new Date(),
    };

    this.logger.warn(`SLOW QUERY ALERT:`, alert);

    // TODO: Send to APM/monitoring system
  }

  /**
   * Get query performance percentiles
   */
  getPercentiles(endpoint?: string): {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  } {
    let metrics = this.queryMetrics;

    if (endpoint) {
      metrics = metrics.filter((m) => m.endpoint === endpoint);
    }

    if (metrics.length === 0) {
      return { p50: 0, p95: 0, p99: 0, avg: 0 };
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      avg: sum / durations.length,
    };
  }

  /**
   * Get slow query report
   */
  getSlowQueryReport(limit: number = 10): QueryMetrics[] {
    return this.queryMetrics
      .filter((m) => m.slow)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Check index utilization
   */
  async getIndexUtilization(): Promise<IndexUtilization[]> {
    const query = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as "scanCount",
        idx_tup_read as "tupleRead",
        idx_tup_fetch as "tupleFetch",
        pg_size_pretty(pg_relation_size(indexrelid)) as "indexSize",
        CASE 
          WHEN idx_scan > 0 THEN ROUND(100.0 * idx_tup_fetch / NULLIF(idx_tup_read, 0), 2)
          ELSE 0
        END as "usageRatio"
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC;
    `;

    const result = await this.queryReplica(query);
    return result.rows;
  }

  /**
   * Get table sizes
   */
  async getTableSizes(): Promise<
    Array<{
      tableName: string;
      size: string;
      sizeBytes: number;
    }>
  > {
    const query = `
      SELECT 
        tablename as "tableName",
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
        pg_total_relation_size(schemaname || '.' || tablename) as "sizeBytes"
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
    `;

    const result = await this.queryReplica(query);
    return result.rows;
  }

  /**
   * Get database connection stats
   */
  async getConnectionStats(): Promise<{
    activeConnections: number;
    idleConnections: number;
    waitingRequests: number;
    totalConnections: number;
  }> {
    return {
      activeConnections: this.primaryPool.totalCount - this.primaryPool.idleCount,
      idleConnections: this.primaryPool.idleCount,
      waitingRequests: this.primaryPool.waitingCount,
      totalConnections: this.primaryPool.totalCount,
    };
  }

  /**
   * Get replication status
   */
  async getReplicationStatus(): Promise<{
    isPrimary: boolean;
    replicationLag?: number;
    walPosition?: string;
  }> {
    try {
      const result = await this.queryReplica(`
        SELECT 
          EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) as lag_seconds,
          pg_current_wal_lsn() as wal_position
      `);

      if (result.rows.length > 0) {
        return {
          isPrimary: false,
          replicationLag: result.rows[0].lag_seconds,
          walPosition: result.rows[0].wal_position,
        };
      }
    } catch {
      // Primary doesn't have replication functions
    }

    return { isPrimary: true };
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(ms: number): void {
    this.slowQueryThreshold = ms;
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/VALUES\s*\([^)]*\)/gi, 'VALUES (...)')
      .replace(/'[^']*'/g, "'*'")
      .substring(0, 500);
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(timeWindowMs: number = 60000): {
    totalQueries: number;
    slowQueries: number;
    avgDuration: number;
    errorRate: number;
    p95Duration: number;
  } {
    const now = Date.now();
    const recentMetrics = this.queryMetrics.filter(
      (m) => now - m.timestamp.getTime() < timeWindowMs
    );

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        avgDuration: 0,
        errorRate: 0,
        p95Duration: 0,
      };
    }

    const durations = recentMetrics.map((m) => m.duration).sort((a, b) => a - b);
    const slowCount = recentMetrics.filter((m) => m.slow).length;

    return {
      totalQueries: recentMetrics.length,
      slowQueries: slowCount,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      errorRate: 0, // Would be updated when errors are tracked
      p95Duration: durations[Math.floor(durations.length * 0.95)],
    };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await Promise.all([this.primaryPool.end(), this.replicaPool.end()]);
    this.logger.info('Database connections closed');
  }
}

export default DatabaseService;
