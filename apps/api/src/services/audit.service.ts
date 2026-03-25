import { query, transaction } from '../db';
import { logger } from '@packages/utils';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  beforeValue?: Record<string, any>;
  afterValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  timestamp: Date;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  status?: 'success' | 'failed';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

interface ExportLogsOptions {
  format: 'json' | 'csv';
  filters: AuditLogFilters;
}

class AuditService {
  /**
   * Log an action to the audit table
   */
  async logAction(
    userId: string | null,
    action: string,
    resourceType: string | null,
    resourceId: string | null,
    beforeValue: Record<string, any> | null,
    afterValue: Record<string, any> | null,
    context: {
      ipAddress?: string;
      userAgent?: string;
    },
    status: 'success' | 'failed' = 'success',
    errorMessage?: string
  ): Promise<AuditLogEntry> {
    try {
      const result = await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, before_value, after_value, ip_address, user_agent, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          userId,
          action,
          resourceType,
          resourceId,
          beforeValue ? JSON.stringify(beforeValue) : null,
          afterValue ? JSON.stringify(afterValue) : null,
          context.ipAddress || null,
          context.userAgent || null,
          status,
          errorMessage || null,
        ]
      );

      return this.mapAuditLogRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to log action', { action, userId, error });
      throw error;
    }
  }

  /**
   * Query audit logs with filters
   */
  async queryLogs(filters: AuditLogFilters): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      if (filters.action) {
        whereClause += ` AND action = $${paramIndex}`;
        params.push(filters.action);
        paramIndex++;
      }

      if (filters.resourceType) {
        whereClause += ` AND resource_type = $${paramIndex}`;
        params.push(filters.resourceType);
        paramIndex++;
      }

      if (filters.resourceId) {
        whereClause += ` AND resource_id = $${paramIndex}`;
        params.push(filters.resourceId);
        paramIndex++;
      }

      if (filters.status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.startDate) {
        whereClause += ` AND timestamp >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        whereClause += ` AND timestamp <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      // Get total count
      const countResult = await query(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Get paginated results
      const limit = Math.min(filters.limit || 100, 1000);
      const offset = filters.offset || 0;

      const result = await query(
        `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      return {
        logs: result.rows.map(row => this.mapAuditLogRow(row)),
        total,
      };
    } catch (error) {
      logger.error('Failed to query audit logs', { error });
      throw error;
    }
  }

  /**
   * Export audit logs in specified format
   */
  async exportLogs(options: ExportLogsOptions): Promise<string> {
    try {
      const { logs } = await this.queryLogs({ ...options.filters, limit: 10000 });

      if (options.format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else if (options.format === 'csv') {
        return this.logsToCSV(logs);
      }

      throw new Error(`Unsupported export format: ${options.format}`);
    } catch (error) {
      logger.error('Failed to export audit logs', { error });
      throw error;
    }
  }

  /**
   * Delete audit logs older than specified days
   */
  async deleteOldLogs(days: number): Promise<number> {
    try {
      const result = await query(
        `DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '1 day' * $1`,
        [days]
      );

      logger.info(`Deleted ${result.rowCount} old audit logs`);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to delete old audit logs', { error });
      throw error;
    }
  }

  /**
   * Get audit log summary statistics
   */
  async getStatistics(userId?: string): Promise<Record<string, any>> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (userId) {
        whereClause += ' AND user_id = $1';
        params.push(userId);
      }

      const result = await query(
        `SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_actions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_actions,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT resource_type) as resource_types,
          DATE(MIN(timestamp)) as earliest_log,
          DATE(MAX(timestamp)) as latest_log
         FROM audit_logs ${whereClause}`,
        params
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get audit statistics', { error });
      throw error;
    }
  }

  /**
   * Get user's action history
   */
  async getUserActionHistory(userId: string, limit = 50): Promise<AuditLogEntry[]> {
    try {
      const result = await query(
        `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(row => this.mapAuditLogRow(row));
    } catch (error) {
      logger.error('Failed to get user action history', { userId, error });
      throw error;
    }
  }

  private mapAuditLogRow(row: any): AuditLogEntry {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      beforeValue: row.before_value ? JSON.parse(row.before_value) : undefined,
      afterValue: row.after_value ? JSON.parse(row.after_value) : undefined,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      status: row.status,
      errorMessage: row.error_message,
      timestamp: new Date(row.timestamp),
    };
  }

  private logsToCSV(logs: AuditLogEntry[]): string {
    const headers = [
      'id',
      'userId',
      'action',
      'resourceType',
      'resourceId',
      'status',
      'timestamp',
      'ipAddress',
    ];
    const rows = logs.map(log =>
      headers
        .map(header => {
          const value = (log as any)[this.toCamelCase(header)];
          if (value === undefined || value === null) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  private toCamelCase(str: string): string {
    return str.replace(/_(.)/g, (_, c) => c.toUpperCase());
  }
}

export const auditService = new AuditService();
