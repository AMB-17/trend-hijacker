import { query, transaction } from '../db';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import cryptoRandomString from 'crypto-random-string';
import { logger } from '@packages/utils';

const SALT_ROUNDS = 12;
const TOKEN_LENGTH = 48;
const SESSION_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';

export interface TokenPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: string;
  providerUserId: string;
  providerEmail?: string;
  providerName?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface User2FA {
  id: string;
  userId: string;
  secretKey: string;
  backupCodes: string[];
  enabled: boolean;
  enabledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
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

class AuthService {
  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate secure session token (40+ random characters)
   */
  generateSessionToken(): string {
    return cryptoRandomString({ length: TOKEN_LENGTH, type: 'base64' });
  }

  /**
   * Hash token for database storage (constant-time comparison safe)
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Constant-time comparison for tokens
   */
  private constantTimeEqual(a: string, b: string): boolean {
    try {
      return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }

  /**
   * Generate JWT token
   */
  generateJWT(userId: string, sessionId: string): string {
    const payload: TokenPayload = {
      userId,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + Math.floor(SESSION_TIMEOUT_MS / 1000),
    };

    return jwt.sign(payload, JWT_SECRET);
  }

  /**
   * Verify JWT token
   */
  verifyJWT(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      logger.warn('JWT verification failed', { error });
      return null;
    }
  }

  /**
   * Create user session
   */
  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    deviceName?: string
  ): Promise<{ session: UserSession; token: string; jwt: string }> {
    const token = this.generateSessionToken();
    const tokenHash = this.hashToken(token);

    const result = await query<UserSession>(
      `
      INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, device_name, expires_at)
      VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
      RETURNING 
        id, user_id as "userId", token_hash as "tokenHash", 
        ip_address as "ipAddress", user_agent as "userAgent", 
        device_name as "deviceName", created_at as "createdAt", 
        expires_at as "expiresAt", last_activity_at as "lastActivityAt"
      `,
      [userId, tokenHash, ipAddress, userAgent, deviceName]
    );

    const session = result.rows[0];
    const jwtToken = this.generateJWT(userId, session.id);

    logger.info('Session created', { userId, sessionId: session.id, ipAddress });

    return {
      session,
      token,
      jwt: jwtToken,
    };
  }

  /**
   * Validate session by token
   */
  async validateSession(token: string): Promise<UserSession | null> {
    const tokenHash = this.hashToken(token);

    const result = await query<UserSession>(
      `
      SELECT 
        id, user_id as "userId", token_hash as "tokenHash",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_name as "deviceName", created_at as "createdAt",
        expires_at as "expiresAt", last_activity_at as "lastActivityAt"
      FROM user_sessions
      WHERE token_hash = $1 AND expires_at > NOW()
      `,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];

    // Update last activity
    await query(
      'UPDATE user_sessions SET last_activity_at = NOW() WHERE id = $1',
      [session.id]
    );

    return session;
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    const result = await query<UserSession>(
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
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await query('DELETE FROM user_sessions WHERE id = $1', [sessionId]);
    logger.info('Session deleted', { sessionId });
  }

  /**
   * Delete all sessions for user
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    await query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    logger.info('All sessions deleted for user', { userId });
  }

  /**
   * Setup 2FA (TOTP)
   */
  async setup2FA(
    userId: string
  ): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    const secret = speakeasy.generateSecret({
      name: `Trend Hijacker (${userId})`,
      issuer: 'Trend Hijacker',
      length: 32,
    });

    const backupCodes = Array.from({ length: 10 }, () =>
      cryptoRandomString({ length: 8, type: 'numeric' })
    );

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Don't save yet - user must verify
    logger.info('2FA setup initiated', { userId });

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Enable 2FA after verification
   */
  async enable2FA(userId: string, secretKey: string, token: string): Promise<User2FA | null> {
    const isValid = speakeasy.totp.verify({
      secret: secretKey,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) {
      logger.warn('2FA verification failed', { userId });
      return null;
    }

    const backupCodes = Array.from({ length: 10 }, () =>
      cryptoRandomString({ length: 8, type: 'numeric' })
    );

    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => this.hashPassword(code))
    );

    try {
      const result = await query<User2FA>(
        `
        INSERT INTO user_2fa (user_id, secret_key, backup_codes, enabled, enabled_at)
        VALUES ($1, $2, $3, TRUE, NOW())
        ON CONFLICT (user_id) DO UPDATE 
        SET secret_key = $2, backup_codes = $3, enabled = TRUE, enabled_at = NOW()
        RETURNING 
          id, user_id as "userId", secret_key as "secretKey",
          backup_codes as "backupCodes", enabled, enabled_at as "enabledAt",
          created_at as "createdAt", updated_at as "updatedAt"
        `,
        [userId, secretKey, hashedBackupCodes]
      );

      logger.info('2FA enabled', { userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to enable 2FA', { userId, error });
      throw error;
    }
  }

  /**
   * Verify 2FA token
   */
  async verify2FAToken(userId: string, token: string): Promise<boolean> {
    const result = await query<User2FA>(
      `
      SELECT 
        id, user_id as "userId", secret_key as "secretKey",
        backup_codes as "backupCodes", enabled,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM user_2fa
      WHERE user_id = $1 AND enabled = TRUE
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const twoFA = result.rows[0];

    const isValid = speakeasy.totp.verify({
      secret: twoFA.secretKey,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (isValid) {
      logger.info('2FA token verified', { userId });
    } else {
      logger.warn('2FA token verification failed', { userId });
    }

    return isValid;
  }

  /**
   * Verify 2FA backup code
   */
  async verify2FABackupCode(userId: string, code: string): Promise<boolean> {
    const result = await query<User2FA>(
      `
      SELECT 
        id, user_id as "userId", secret_key as "secretKey",
        backup_codes as "backupCodes", enabled,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM user_2fa
      WHERE user_id = $1 AND enabled = TRUE
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const twoFA = result.rows[0];

    // Check if code matches any backup code
    for (const hashedCode of twoFA.backupCodes) {
      const isMatch = await bcrypt.compare(code, hashedCode);
      if (isMatch) {
        // Remove the used backup code
        const updatedCodes = twoFA.backupCodes.filter(c => c !== hashedCode);

        await query('UPDATE user_2fa SET backup_codes = $1 WHERE id = $2', [
          updatedCodes,
          twoFA.id,
        ]);

        logger.info('2FA backup code used', { userId });
        return true;
      }
    }

    logger.warn('2FA backup code verification failed', { userId });
    return false;
  }

  /**
   * Get remaining 2FA backup codes count
   */
  async get2FABackupCodeCount(userId: string): Promise<number> {
    const result = await query<{ count: number }>(
      `
      SELECT array_length(backup_codes, 1) as count
      FROM user_2fa
      WHERE user_id = $1 AND enabled = TRUE
      `,
      [userId]
    );

    return result.rows[0]?.count || 0;
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string): Promise<void> {
    await query('UPDATE user_2fa SET enabled = FALSE WHERE user_id = $1', [userId]);
    logger.info('2FA disabled', { userId });
  }

  /**
   * Create OAuth account
   */
  async createOAuthAccount(
    userId: string,
    provider: string,
    providerUserId: string,
    providerEmail?: string,
    providerName?: string,
    accessToken?: string,
    refreshToken?: string,
    tokenExpiresAt?: Date
  ): Promise<OAuthAccount> {
    const result = await query<OAuthAccount>(
      `
      INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email, provider_name, access_token, refresh_token, token_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (provider, provider_user_id) DO UPDATE 
      SET access_token = $6, refresh_token = $7, token_expires_at = $8, updated_at = NOW()
      RETURNING 
        id, user_id as "userId", provider, provider_user_id as "providerUserId",
        provider_email as "providerEmail", provider_name as "providerName",
        access_token as "accessToken", refresh_token as "refreshToken",
        token_expires_at as "tokenExpiresAt", created_at as "createdAt", updated_at as "updatedAt"
      `,
      [
        userId,
        provider,
        providerUserId,
        providerEmail || null,
        providerName || null,
        accessToken || null,
        refreshToken || null,
        tokenExpiresAt || null,
      ]
    );

    logger.info('OAuth account created', { userId, provider });
    return result.rows[0];
  }

  /**
   * Get or create OAuth user
   */
  async getOrCreateOAuthUser(
    provider: string,
    providerUserId: string,
    providerEmail: string,
    providerName?: string,
    accessToken?: string,
    refreshToken?: string,
    tokenExpiresAt?: Date
  ): Promise<{ userId: string; isNew: boolean }> {
    return transaction(async (client) => {
      // Check if OAuth account exists
      const existingResult = await client.query(
        `
        SELECT user_id FROM oauth_accounts 
        WHERE provider = $1 AND provider_user_id = $2
        `,
        [provider, providerUserId]
      );

      if (existingResult.rows.length > 0) {
        // Update existing account
        const userId = existingResult.rows[0].user_id;

        await client.query(
          `
          UPDATE oauth_accounts 
          SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = NOW()
          WHERE provider = $4 AND provider_user_id = $5
          `,
          [accessToken || null, refreshToken || null, tokenExpiresAt || null, provider, providerUserId]
        );

        logger.info('OAuth user found', { userId, provider });
        return { userId, isNew: false };
      }

      // Check if user with this email exists
      const emailResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [providerEmail]
      );

      let userId: string;

      if (emailResult.rows.length > 0) {
        userId = emailResult.rows[0].id;
      } else {
        // Create new user
        const newUserResult = await client.query(
          `
          INSERT INTO users (email, password_hash, tier, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING id
          `,
          [providerEmail, await this.hashPassword(cryptoRandomString({ length: 32 })), 'free']
        );

        userId = newUserResult.rows[0].id;
      }

      // Create OAuth account
      await client.query(
        `
        INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email, provider_name, access_token, refresh_token, token_expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [userId, provider, providerUserId, providerEmail, providerName || null, accessToken || null, refreshToken || null, tokenExpiresAt || null]
      );

      logger.info('OAuth user created', { userId, provider });
      return { userId, isNew: true };
    });
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(
    action: string,
    status: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string
  ): Promise<void> {
    try {
      await query(
        `
        INSERT INTO auth_logs (user_id, action, status, ip_address, user_agent, failure_reason, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [userId || null, action, status, ipAddress || null, userAgent || null, failureReason || null]
      );
    } catch (error) {
      logger.error('Failed to log auth event', { error });
    }
  }

  /**
   * Get auth logs for user
   */
  async getUserAuthLogs(userId: string, limit = 50): Promise<any[]> {
    const result = await query(
      `
      SELECT 
        id, user_id as "userId", action, status, 
        ip_address as "ipAddress", user_agent as "userAgent",
        failure_reason as "failureReason", timestamp
      FROM auth_logs
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await query('DELETE FROM user_sessions WHERE expires_at <= NOW()');
    logger.info('Cleaned up expired sessions', { count: result.rowCount });
    return result.rowCount || 0;
  }
}

export const authService = new AuthService();
