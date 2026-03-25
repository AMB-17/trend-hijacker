/**
 * Security Configuration Constants
 */

export const SECURITY_CONSTANTS = {
  // Session configuration
  SESSION_TIMEOUT_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  SESSION_TOKEN_LENGTH: 48, // bytes for random token generation
  MAX_SESSIONS_PER_USER: 10,
  SESSION_ACTIVITY_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes for activity warning

  // Password configuration
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_HASH_ROUNDS: 12,

  // 2FA configuration
  TWO_FA_TOTP_WINDOW: 2, // Allow 2 time windows for TOTP
  TWO_FA_BACKUP_CODE_COUNT: 10,
  TWO_FA_BACKUP_CODE_LENGTH: 8,
  TOTP_ISSUER: 'Trend Hijacker',

  // Rate limiting
  AUTH_RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: 5,
  LOGIN_RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: 5,
  PASSWORD_RESET_RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS: 3,

  // JWT configuration
  JWT_EXPIRATION_SECONDS: 7 * 24 * 60 * 60, // 7 days
  JWT_REFRESH_THRESHOLD_SECONDS: 24 * 60 * 60, // Refresh if less than 1 day left
  JWT_ALGORITHM: 'HS256',

  // OAuth configuration
  OAUTH_STATE_EXPIRATION_MS: 10 * 60 * 1000, // 10 minutes
  OAUTH_CODE_EXPIRATION_MS: 10 * 60 * 1000, // 10 minutes
  OAUTH_PROVIDERS: ['google', 'github', 'azure'] as const,

  // SAML configuration
  SAML_ASSERTION_CONSUMER_SERVICE_INDEX: 0,
  SAML_NAME_ID_FORMAT: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',

  // CSRF configuration
  CSRF_TOKEN_LENGTH: 32,
  CSRF_HEADER_NAME: 'x-csrf-token',
  CSRF_COOKIE_NAME: 'csrf-token',

  // IP address handling
  IP_ADDRESS_HEADER: 'x-forwarded-for',
  IP_ADDRESS_HEADER_FALLBACK: 'x-real-ip',

  // Security headers
  HSTS_MAX_AGE: 31536000, // 1 year
  CSP_DIRECTIVES: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
  },

  // Account lockout configuration
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes

  // Email verification
  EMAIL_VERIFICATION_EXPIRATION_MS: 24 * 60 * 60 * 1000, // 24 hours
  EMAIL_VERIFICATION_CODE_LENGTH: 6,

  // Data retention
  AUTH_LOG_RETENTION_DAYS: 90,
  SESSION_CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
};

/**
 * Security best practices
 */
export const SECURITY_BEST_PRACTICES = {
  // Always use HTTPS in production
  REQUIRE_HTTPS: true,

  // Use secure cookies
  COOKIE_SECURE: true,
  COOKIE_HTTP_ONLY: true,
  COOKIE_SAME_SITE: 'Strict' as const,

  // Security headers
  ENABLE_HSTS: true,
  ENABLE_CSP: true,
  ENABLE_X_FRAME_OPTIONS: true,
  ENABLE_X_CONTENT_TYPE_OPTIONS: true,
  ENABLE_X_XSS_PROTECTION: true,

  // Logging
  LOG_SECURITY_EVENTS: true,
  LOG_FAILED_AUTH_ATTEMPTS: true,
  LOG_SENSITIVE_OPERATIONS: true,

  // Validation
  VALIDATE_CSRF_TOKENS: true,
  VALIDATE_ORIGIN: true,
  RATE_LIMIT_AUTH_ENDPOINTS: true,
};

/**
 * Error messages for security reasons (generic to prevent user enumeration)
 */
export const SECURITY_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_LOCKED: 'Account temporarily locked. Please try again later.',
  SESSION_EXPIRED: 'Session has expired. Please log in again.',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden',
  TOO_MANY_ATTEMPTS: 'Too many attempts. Please try again later.',
  INVALID_2FA_TOKEN: 'Invalid authentication code',
  INVALID_BACKUP_CODE: 'Invalid backup code',
  CSRF_TOKEN_MISSING: 'CSRF token is required',
  CSRF_TOKEN_INVALID: 'Invalid CSRF token',
  INVALID_OAUTH_PROVIDER: 'Invalid OAuth provider',
  INVALID_SAML_RESPONSE: 'Invalid SAML response',
};
