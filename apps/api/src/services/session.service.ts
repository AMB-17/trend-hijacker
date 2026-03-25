import { query } from '../db';
import { logger } from '@packages/utils';

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

class SessionService {
  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<Session | null> {
    const result = await query<Session>(
      `
      SELECT 
        id, user_id as "userId", token_hash as "tokenHash",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_name as "deviceName", created_at as "createdAt",
        expires_at as "expiresAt", last_activity_at as "lastActivityAt"
      FROM user_sessions
      WHERE id = $1
      `,
      [sessionId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessionsForUser(userId: string): Promise<Session[]> {
    const result = await query<Session>(
      `
      SELECT 
        id, user_id as "userId", token_hash as "tokenHash",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_name as "deviceName", created_at as "createdAt",
        expires_at as "expiresAt", last_activity_at as "lastActivityAt"
      FROM user_sessions
      WHERE user_id = $1 AND expires_at > NOW()
      ORDER BY last_activity_at DESC
      `,
      [userId]
    );

    return result.rows;
  }

  /**
   * Check if session is valid and not expired
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    const result = await query(
      `
      SELECT id FROM user_sessions 
      WHERE id = $1 AND expires_at > NOW()
      `,
      [sessionId]
    );

    return result.rows.length > 0;
  }

  /**
   * Update session last activity
   */
  async updateSessionActivity(sessionId: string): Promise<Session | null> {
    const result = await query<Session>(
      `
      UPDATE user_sessions 
      SET last_activity_at = NOW()
      WHERE id = $1 AND expires_at > NOW()
      RETURNING 
        id, user_id as "userId", token_hash as "tokenHash",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_name as "deviceName", created_at as "createdAt",
        expires_at as "expiresAt", last_activity_at as "lastActivityAt"
      `,
      [sessionId]
    );

    return result.rows[0] || null;
  }

  /**
   * Invalidate single session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    await query('DELETE FROM user_sessions WHERE id = $1', [sessionId]);
    logger.info('Session invalidated', { sessionId });
  }

  /**
   * Invalidate all sessions for user
   */
  async invalidateAllUserSessions(userId: string): Promise<number> {
    const result = await query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    logger.info('All user sessions invalidated', { userId, count: result.rowCount });
    return result.rowCount || 0;
  }

  /**
   * Extend session expiration
   */
  async extendSessionExpiration(sessionId: string, extensionMs: number): Promise<Session | null> {
    const result = await query<Session>(
      `
      UPDATE user_sessions 
      SET expires_at = expires_at + INTERVAL '${Math.floor(extensionMs / 1000)} seconds'
      WHERE id = $1 AND expires_at > NOW()
      RETURNING 
        id, user_id as "userId", token_hash as "tokenHash",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_name as "deviceName", created_at as "createdAt",
        expires_at as "expiresAt", last_activity_at as "lastActivityAt"
      `,
      [sessionId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get sessions by IP address (for security monitoring)
   */
  async getSessionsByIpAddress(ipAddress: string): Promise<Session[]> {
    const result = await query<Session>(
      `
      SELECT 
        id, user_id as "userId", token_hash as "tokenHash",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_name as "deviceName", created_at as "createdAt",
        expires_at as "expiresAt", last_activity_at as "lastActivityAt"
      FROM user_sessions
      WHERE ip_address = $1 AND expires_at > NOW()
      ORDER BY last_activity_at DESC
      `,
      [ipAddress]
    );

    return result.rows;
  }

  /**
   * Get sessions by user agent (for security monitoring)
   */
  async getSessionsByUserAgent(userAgent: string): Promise<Session[]> {
    const result = await query<Session>(
      `
      SELECT 
        id, user_id as "userId", token_hash as "tokenHash",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_name as "deviceName", created_at as "createdAt",
        expires_at as "expiresAt", last_activity_at as "lastActivityAt"
      FROM user_sessions
      WHERE user_agent = $1 AND expires_at > NOW()
      ORDER BY last_activity_at DESC
      `,
      [userAgent]
    );

    return result.rows;
  }

  /**
   * Delete expired sessions (maintenance)
   */
  async deleteExpiredSessions(): Promise<number> {
    const result = await query('DELETE FROM user_sessions WHERE expires_at <= NOW()');
    logger.info('Expired sessions cleaned up', { count: result.rowCount });
    return result.rowCount || 0;
  }

  /**
   * Get session count for user
   */
  async getUserSessionCount(userId: string): Promise<number> {
    const result = await query(
      `
      SELECT COUNT(*) as count FROM user_sessions 
      WHERE user_id = $1 AND expires_at > NOW()
      `,
      [userId]
    );

    return parseInt(result.rows[0].count, 10) || 0;
  }

  /**
   * Get oldest session (for session limit enforcement)
   */
  async getOldestUserSession(userId: string): Promise<Session | null> {
    const result = await query<Session>(
      `
      SELECT 
        id, user_id as "userId", token_hash as "tokenHash",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_name as "deviceName", created_at as "createdAt",
        expires_at as "expiresAt", last_activity_at as "lastActivityAt"
      FROM user_sessions
      WHERE user_id = $1 AND expires_at > NOW()
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [userId]
    );

    return result.rows[0] || null;
  }
}

export const sessionService = new SessionService();
