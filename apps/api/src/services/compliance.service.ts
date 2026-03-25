import { query, transaction } from '../db';
import { logger } from '@packages/utils';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface ExportedUserData {
  id: string;
  userId: string;
  exportType: 'json' | 'csv';
  fileSizeBytes: number;
  downloadToken: string;
  createdAt: Date;
  expiresAt: Date;
  downloadedAt?: Date;
}

export interface DataDeletionRequest {
  id: string;
  userId: string;
  requestedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedAt?: Date;
  errorMessage?: string;
  anonymizedData: boolean;
}

export interface RetentionPolicy {
  id: string;
  workspaceId: string;
  dataType: 'audit_logs' | 'auth_logs' | 'error_logs';
  retentionDays: number;
  archiveLocation?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class ComplianceService {
  /**
   * Export all user data in specified format (GDPR Data Portability)
   */
  async exportUserData(userId: string, format: 'json' | 'csv' = 'json'): Promise<ExportedUserData> {
    const client = await transaction();

    try {
      // Collect all user data
      const userData = await this.collectUserData(userId);
      const dataContent = format === 'json' ? JSON.stringify(userData, null, 2) : this.userDataToCSV(userData);
      const fileSizeBytes = Buffer.byteLength(dataContent, 'utf8');

      // Generate unique download token (valid for 7 days)
      const downloadToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Store export record
      const result = await client.query(
        `INSERT INTO exported_data (user_id, export_type, file_size_bytes, download_token, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, format, fileSizeBytes, downloadToken, expiresAt]
      );

      // Store actual content temporarily (in production, upload to S3/storage)
      // For now, we'll store reference and content can be generated on-demand
      logger.info(`Exported user data for user ${userId}`, { format, fileSizeBytes });

      await client.query('COMMIT');
      return this.mapExportedDataRow(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to export user data', { userId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark user data for deletion (GDPR Right to be Forgotten)
   */
  async deleteUserData(userId: string, anonymize = true): Promise<DataDeletionRequest> {
    const client = await transaction();

    try {
      // Create deletion request
      const requestResult = await client.query(
        `INSERT INTO data_deletion_requests (user_id, anonymized_data, status)
         VALUES ($1, $2, 'processing')
         RETURNING *`,
        [userId, anonymize]
      );

      const deletionRequest = requestResult.rows[0];

      // Perform cascading deletion
      try {
        // Delete sessions
        await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

        // Delete 2FA settings
        await client.query('DELETE FROM user_2fa WHERE user_id = $1', [userId]);

        // Delete OAuth accounts
        await client.query('DELETE FROM oauth_accounts WHERE user_id = $1', [userId]);

        // Delete SAML mappings
        await client.query('DELETE FROM saml_user_mappings WHERE user_id = $1', [userId]);

        // Delete user trends
        await client.query('DELETE FROM trends WHERE id IN (SELECT id FROM trends WHERE created_at > NOW() - INTERVAL 1000000 HOUR)', [userId]);

        // Delete user alerts
        await client.query('DELETE FROM alerts WHERE user_id = $1', [userId]);

        // Anonymize audit logs if requested
        if (anonymize) {
          await client.query(
            `UPDATE audit_logs 
             SET user_id = NULL, ip_address = NULL, user_agent = NULL
             WHERE user_id = $1`,
            [userId]
          );

          // Anonymize auth logs
          await client.query(
            `UPDATE auth_logs 
             SET user_id = NULL, ip_address = NULL, user_agent = NULL
             WHERE user_id = $1`,
            [userId]
          );
        }

        // Delete the user account
        await client.query('DELETE FROM users WHERE id = $1', [userId]);

        // Mark deletion as completed
        await client.query(
          `UPDATE data_deletion_requests 
           SET status = 'completed', completed_at = NOW()
           WHERE id = $1`,
          [deletionRequest.id]
        );

        logger.info(`Successfully deleted user data for ${userId}`, { anonymize });
      } catch (error) {
        // Mark deletion as failed
        await client.query(
          `UPDATE data_deletion_requests 
           SET status = 'failed', error_message = $2
           WHERE id = $1`,
          [deletionRequest.id, (error as Error).message]
        );
        throw error;
      }

      await client.query('COMMIT');

      // Fetch updated deletion request
      const updated = await query(
        'SELECT * FROM data_deletion_requests WHERE id = $1',
        [deletionRequest.id]
      );

      return this.mapDeletionRequestRow(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete user data', { userId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate compliance report (GDPR, SOC 2, etc.)
   */
  async generateComplianceReport(workspaceId: string, reportType: string): Promise<Record<string, any>> {
    try {
      const report: Record<string, any> = {
        type: reportType,
        generatedAt: new Date(),
        workspaceId,
      };

      switch (reportType) {
        case 'gdpr':
          report.dataProcessing = await this.getDataProcessingInfo(workspaceId);
          report.dataRetention = await this.getRetentionPolicies(workspaceId);
          report.dataSubjectRequests = await this.getDataSubjectRequests(workspaceId);
          report.incidentLog = await this.getSecurityIncidents(workspaceId);
          break;

        case 'soc2':
          report.accessControls = await this.getAccessControlMetrics(workspaceId);
          report.auditTrail = await this.getAuditMetrics(workspaceId);
          report.securityIncidents = await this.getSecurityIncidents(workspaceId);
          break;

        case 'hipaa':
          report.dataUsage = await this.getDataUsageMetrics(workspaceId);
          report.accessLogs = await this.getAccessMetrics(workspaceId);
          report.incidentLog = await this.getSecurityIncidents(workspaceId);
          break;

        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      logger.info(`Generated ${reportType} compliance report`, { workspaceId });
      return report;
    } catch (error) {
      logger.error('Failed to generate compliance report', { workspaceId, reportType, error });
      throw error;
    }
  }

  /**
   * Apply data retention policies
   */
  async applyRetentionPolicy(): Promise<{ processed: number; deleted: number }> {
    try {
      const policies = await query(
        `SELECT * FROM retention_policies WHERE enabled = TRUE`,
        []
      );

      let totalDeleted = 0;

      for (const policy of policies.rows) {
        let deleted = 0;

        switch (policy.data_type) {
          case 'audit_logs':
            deleted = await this.deleteOldAuditLogs(policy.retention_days);
            break;
          case 'auth_logs':
            deleted = await this.deleteOldAuthLogs(policy.retention_days);
            break;
          case 'error_logs':
            deleted = await this.deleteOldErrorLogs(policy.retention_days);
            break;
        }

        totalDeleted += deleted;
      }

      logger.info(`Applied retention policies`, { policiesProcessed: policies.rowCount, recordsDeleted: totalDeleted });
      return { processed: policies.rowCount || 0, deleted: totalDeleted };
    } catch (error) {
      logger.error('Failed to apply retention policies', { error });
      throw error;
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string, userId: string): Promise<ExportedUserData | null> {
    try {
      const result = await query(
        `SELECT * FROM exported_data WHERE id = $1 AND user_id = $2`,
        [exportId, userId]
      );

      return result.rows.length > 0 ? this.mapExportedDataRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to get export status', { exportId, error });
      throw error;
    }
  }

  /**
   * Get deletion request status
   */
  async getDeletionStatus(userId: string): Promise<DataDeletionRequest | null> {
    try {
      const result = await query(
        `SELECT * FROM data_deletion_requests 
         WHERE user_id = $1 
         ORDER BY requested_at DESC 
         LIMIT 1`,
        [userId]
      );

      return result.rows.length > 0 ? this.mapDeletionRequestRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to get deletion status', { userId, error });
      throw error;
    }
  }

  /**
   * Mark exported data as downloaded
   */
  async markAsDownloaded(downloadToken: string): Promise<void> {
    try {
      await query(
        `UPDATE exported_data SET downloaded_at = NOW() WHERE download_token = $1`,
        [downloadToken]
      );
    } catch (error) {
      logger.error('Failed to mark data as downloaded', { error });
      throw error;
    }
  }

  // Private helper methods

  private async collectUserData(userId: string): Promise<Record<string, any>> {
    const userData: Record<string, any> = {};

    // Get user profile
    const userResult = await query('SELECT id, email, tier, created_at, updated_at FROM users WHERE id = $1', [userId]);
    userData.profile = userResult.rows[0];

    // Get trends
    const trendsResult = await query('SELECT * FROM trends ORDER BY created_at DESC LIMIT 1000', []);
    userData.trends = trendsResult.rows;

    // Get alerts
    const alertsResult = await query('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 500', []);
    userData.alerts = alertsResult.rows;

    // Get sessions (without sensitive tokens)
    const sessionsResult = await query(
      'SELECT id, ip_address, user_agent, device_name, created_at, expires_at FROM user_sessions WHERE user_id = $1',
      [userId]
    );
    userData.sessions = sessionsResult.rows;

    // Get auth logs
    const authLogsResult = await query('SELECT * FROM auth_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1000', [userId]);
    userData.authLogs = authLogsResult.rows;

    // Get audit logs
    const auditLogsResult = await query('SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 5000', [userId]);
    userData.auditLogs = auditLogsResult.rows;

    return userData;
  }

  private userDataToCSV(userData: Record<string, any>): string {
    // Simple CSV export - in production, use a proper CSV library
    const lines: string[] = [];

    for (const [key, value] of Object.entries(userData)) {
      if (Array.isArray(value) && value.length > 0) {
        const headers = Object.keys(value[0]);
        lines.push(`\n${key}:`);
        lines.push(headers.join(','));
        for (const row of value) {
          lines.push(
            headers
              .map(h => {
                const v = (row as any)[h];
                return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
              })
              .join(',')
          );
        }
      }
    }

    return lines.join('\n');
  }

  private async deleteOldAuditLogs(days: number): Promise<number> {
    const result = await query(
      `DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '1 day' * $1`,
      [days]
    );
    return result.rowCount || 0;
  }

  private async deleteOldAuthLogs(days: number): Promise<number> {
    const result = await query(
      `DELETE FROM auth_logs WHERE timestamp < NOW() - INTERVAL '1 day' * $1`,
      [days]
    );
    return result.rowCount || 0;
  }

  private async deleteOldErrorLogs(days: number): Promise<number> {
    // Placeholder for error logs deletion
    return 0;
  }

  private async getRetentionPolicies(workspaceId: string): Promise<any[]> {
    const result = await query('SELECT * FROM retention_policies WHERE workspace_id = $1', [workspaceId]);
    return result.rows;
  }

  private async getDataProcessingInfo(workspaceId: string): Promise<Record<string, any>> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(timestamp) as earliest_timestamp,
        MAX(timestamp) as latest_timestamp
       FROM audit_logs`,
      []
    );
    return result.rows[0];
  }

  private async getDataSubjectRequests(workspaceId: string): Promise<any[]> {
    const result = await query(
      `SELECT id, user_id, status, requested_at, completed_at 
       FROM data_deletion_requests 
       ORDER BY requested_at DESC 
       LIMIT 100`,
      []
    );
    return result.rows;
  }

  private async getSecurityIncidents(workspaceId: string): Promise<any[]> {
    const result = await query(
      `SELECT id, user_id, action, status, error_message, timestamp 
       FROM audit_logs 
       WHERE status = 'failed' 
       ORDER BY timestamp DESC 
       LIMIT 100`,
      []
    );
    return result.rows;
  }

  private async getAccessControlMetrics(workspaceId: string): Promise<Record<string, any>> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_logins,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_logins
       FROM auth_logs 
       WHERE timestamp > NOW() - INTERVAL 30 DAYS`,
      []
    );
    return result.rows[0];
  }

  private async getAuditMetrics(workspaceId: string): Promise<Record<string, any>> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_events,
        COUNT(DISTINCT action) as unique_actions
       FROM audit_logs 
       WHERE timestamp > NOW() - INTERVAL 30 DAYS`,
      []
    );
    return result.rows[0];
  }

  private async getDataUsageMetrics(workspaceId: string): Promise<Record<string, any>> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN resource_type = 'trend' THEN 1 ELSE 0 END) as trend_records,
        SUM(CASE WHEN resource_type = 'alert' THEN 1 ELSE 0 END) as alert_records
       FROM audit_logs`,
      []
    );
    return result.rows[0];
  }

  private async getAccessMetrics(workspaceId: string): Promise<Record<string, any>> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_access_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips
       FROM auth_logs 
       WHERE timestamp > NOW() - INTERVAL 30 DAYS`,
      []
    );
    return result.rows[0];
  }

  private mapExportedDataRow(row: any): ExportedUserData {
    return {
      id: row.id,
      userId: row.user_id,
      exportType: row.export_type,
      fileSizeBytes: row.file_size_bytes,
      downloadToken: row.download_token,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      downloadedAt: row.downloaded_at ? new Date(row.downloaded_at) : undefined,
    };
  }

  private mapDeletionRequestRow(row: any): DataDeletionRequest {
    return {
      id: row.id,
      userId: row.user_id,
      requestedAt: new Date(row.requested_at),
      status: row.status,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      errorMessage: row.error_message,
      anonymizedData: row.anonymized_data,
    };
  }
}

export const complianceService = new ComplianceService();
