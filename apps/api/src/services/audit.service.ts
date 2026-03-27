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

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: string | undefined,
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.logAction(
        userId || null,
        eventType,
        'security_event',
        undefined,
        null,
        metadata || null,
        {},
        'success'
      );

      logger.warn('Security event logged', { eventType, severity, userId });
    } catch (error) {
      logger.error('Failed to log security event', { eventType, error });
    }
  }

  /**
   * Query audit logs with advanced filtering
   */
  async queryAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    return this.queryLogs(filters);
  }

  /**
   * Export audit logs in multiple formats
   */
  async exportAuditLogs(
    filters: Record<string, any>,
    format: 'json' | 'csv' | 'jsonl' = 'json'
  ): Promise<string> {
    try {
      const { logs } = await this.queryLogs({ ...filters, limit: 100000 });

      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else if (format === 'csv') {
        return this.logsToCSV(logs);
      } else if (format === 'jsonl') {
        return logs.map(log => JSON.stringify(log)).join('\n');
      }

      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      logger.error('Failed to export audit logs', { format, error });
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    framework: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    framework: string;
    periodStart: Date;
    periodEnd: Date;
    totalAuditLogs: number;
    securityEvents: number;
    failedAuthAttempts: number;
    unauthorizedAccesses: number;
    complianceScore: number;
  }> {
    try {
      const stats = await query<{
        total_logs: number;
        security_events: number;
        failed_auths: number;
        unauthorized: number;
      }>(
        `
        SELECT
          COUNT(*) as total_logs,
          COUNT(CASE WHEN action LIKE '%security%' THEN 1 END) as security_events,
          COUNT(CASE WHEN action = 'failed_auth_attempt' THEN 1 END) as failed_auths,
          COUNT(CASE WHEN action LIKE '%unauthorized%' OR status = 'failed' THEN 1 END) as unauthorized
        FROM audit_logs
        WHERE timestamp >= $1 AND timestamp <= $2
        `,
        [startDate, endDate]
      );

      const row = stats.rows[0] || {};
      const totalLogs = parseInt(row.total_logs || '0', 10);
      const securityEvents = parseInt(row.security_events || '0', 10);
      const failedAuths = parseInt(row.failed_auths || '0', 10);
      const unauthorized = parseInt(row.unauthorized || '0', 10);

      // Simple compliance score: lower violations = higher score
      const violations = securityEvents + failedAuths + unauthorized;
      const complianceScore = Math.max(0, Math.min(100, 100 - (violations / (totalLogs || 1)) * 100));

      return {
        framework,
        periodStart: startDate,
        periodEnd: endDate,
        totalAuditLogs: totalLogs,
        securityEvents,
        failedAuthAttempts: failedAuths,
        unauthorizedAccesses: unauthorized,
        complianceScore,
      };
    } catch (error) {
      logger.error('Failed to generate compliance report', { framework, error });
      throw error;
    }
  }

  /**
   * Get sensitive actions audit trail
   */
  async getSensitiveActionsAudit(
    filters: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      limit?: number;
    }
  ): Promise<AuditLogEntry[]> {
    try {
      const sensitiveSActions = [
        'user_deleted',
        'password_changed',
        'permission_granted',
        'permission_revoked',
        'data_exported',
        'data_deleted',
        'system_config_changed',
      ];

      const whereConditions = [
        `action IN (${sensitiveSActions.map(a => `'${a}'`).join(',')})`,
      ];
      const params: any[] = [];

      if (filters.startDate) {
        whereConditions.push(`timestamp >= $${params.length + 1}`);
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        whereConditions.push(`timestamp <= $${params.length + 1}`);
        params.push(filters.endDate);
      }

      if (filters.userId) {
        whereConditions.push(`user_id = $${params.length + 1}`);
        params.push(filters.userId);
      }

      const limit = Math.min(filters.limit || 500, 1000);
      whereConditions.push(`LIMIT ${limit}`);

      const result = await query(
        `SELECT * FROM audit_logs WHERE ${whereConditions.join(' AND ')} ORDER BY timestamp DESC`,
        params
      );

      return result.rows.map(row => this.mapAuditLogRow(row));
    } catch (error) {
      logger.error('Failed to get sensitive actions audit', { error });
      throw error;
    }
  }

  /**
   * Get user data export for GDPR compliance
   */
  async getUserDataExport(userId: string): Promise<{
    user: Record<string, any>;
    auditLog: AuditLogEntry[];
    sessions: Record<string, any>[];
  }> {
    try {
      // Get user data
      const userResult = await query(
        'SELECT id, email, name, tier, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );
      const user = userResult.rows[0];

      // Get audit logs
      const { logs } = await this.queryLogs({ userId, limit: 10000 });

      // Get sessions
      const sessionsResult = await query(
        'SELECT id, ip_address, user_agent, device_name, created_at, expires_at FROM user_sessions WHERE user_id = $1',
        [userId]
      );

      return {
        user,
        auditLog: logs,
        sessions: sessionsResult.rows,
      };
    } catch (error) {
      logger.error('Failed to export user data', { userId, error });
      throw error;
    }
  }

  /**
   * Log data deletion request (GDPR Right to be Forgotten)
   */
  async logDeletionRequest(userId: string, reason?: string): Promise<void> {
    try {
      await this.logAction(
        userId,
        'user_deletion_requested',
        'user',
        userId,
        null,
        { reason },
        {},
        'success'
      );

      logger.info('User deletion request logged', { userId });
    } catch (error) {
      logger.error('Failed to log deletion request', { userId, error });
    }
  }

  /**
   * Get audit log counts by action type
   */
  async getActionCounts(
    startDate: Date,
    endDate: Date
  ): Promise<{ [action: string]: number }> {
    try {
      const result = await query(
        `
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE timestamp >= $1 AND timestamp <= $2
        GROUP BY action
        ORDER BY count DESC
        `,
        [startDate, endDate]
      );

      const counts: { [action: string]: number } = {};
      result.rows.forEach((row: any) => {
        counts[row.action] = parseInt(row.count, 10);
      });

      return counts;
    } catch (error) {
      logger.error('Failed to get action counts', { error });
      throw error;
    }
  }

  /**
   * Get failed login attempts by IP
   */
  async getFailedLoginsByIP(
    limit: number = 100
  ): Promise<{ [ip: string]: number }> {
    try {
      const result = await query(
        `
        SELECT ip_address, COUNT(*) as attempts
        FROM audit_logs
        WHERE action = 'failed_auth_attempt'
          AND timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY ip_address
        ORDER BY attempts DESC
        LIMIT $1
        `,
        [limit]
      );

      const byIP: { [ip: string]: number } = {};
      result.rows.forEach((row: any) => {
        byIP[row.ip_address || 'unknown'] = parseInt(row.attempts, 10);
      });

      return byIP;
    } catch (error) {
      logger.error('Failed to get failed logins by IP', { error });
      throw error;
    }
  }
}

export const auditService = new AuditService();
