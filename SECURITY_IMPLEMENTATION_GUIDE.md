# Enterprise Security Systems Implementation Guide - Phase 1

## Overview

This document describes the implementation of three enterprise security systems for Trend Hijacker v2.0:

1. **OAuth 2.0 Integration** (SSO) - Support for Google, GitHub, and Azure
2. **SAML 2.0 Integration** - Enterprise single sign-on
3. **Two-Factor Authentication (2FA)** - TOTP and backup codes

## Architecture Components

### Database Schema

All security-related tables have been added to `schema.ts`:

#### OAuth Accounts Table
```sql
oauth_accounts
  - id (UUID primary key)
  - user_id (references users)
  - provider (google, github, azure)
  - provider_user_id (provider's unique identifier)
  - provider_email, provider_name
  - access_token, refresh_token, token_expires_at
  - Indexes: user_id, provider
```

#### SAML Providers Table
```sql
saml_providers
  - id (UUID primary key)
  - issuer (unique SAML IdP identifier)
  - certificate (IdP public certificate)
  - metadata_url, sso_url, slo_url (SAML endpoints)
  - enabled (boolean flag)
```

#### SAML User Mappings Table
```sql
saml_user_mappings
  - id (UUID primary key)
  - user_id, saml_provider_id (references)
  - saml_name_id (IdP's unique identifier for the user)
  - Unique constraint on (saml_provider_id, saml_name_id)
```

#### 2FA Settings Table
```sql
user_2fa
  - id (UUID primary key)
  - user_id (unique reference to users)
  - secret_key (base32 encoded TOTP secret)
  - backup_codes (array of hashed backup codes)
  - enabled (boolean flag)
  - enabled_at (timestamp when 2FA was activated)
```

#### User Sessions Table
```sql
user_sessions
  - id (UUID primary key)
  - user_id, token_hash (SHA256 hash for database storage)
  - ip_address, user_agent, device_name
  - created_at, expires_at (7-day default expiration), last_activity_at
  - Indexes: user_id, token_hash, expires_at
```

#### Auth Logs Table
```sql
auth_logs
  - id (UUID primary key)
  - user_id (nullable), action, status, ip_address, user_agent
  - failure_reason (for failed attempts)
  - timestamp
  - Indexes: user_id, timestamp DESC, ip_address
```

### Services

#### 1. Auth Service (`auth.service.ts`)

**Responsibilities:**
- Password hashing and verification (bcryptjs)
- Session token generation (48+ character random strings)
- Session management (create, validate, delete)
- JWT token generation and verification
- 2FA setup, enablement, and verification
- Backup code generation and verification
- OAuth account management
- Authentication event logging

**Key Methods:**
- `hashPassword(password)` - Bcrypt hashing with 12 rounds
- `generateSessionToken()` - Cryptographically secure random token
- `createSession(userId, ipAddress, userAgent, deviceName)` - Returns session + JWT
- `validateSession(token)` - Constant-time comparison verification
- `setup2FA(userId)` - QR code + backup codes generation
- `enable2FA(userId, secretKey, token)` - TOTP verification
- `verify2FAToken(userId, token)` - TOTP validation with 2-window tolerance
- `verify2FABackupCode(userId, code)` - Backup code verification with removal
- `getOrCreateOAuthUser(...)` - OAuth flow user lookup/creation
- `logAuthEvent(action, status, userId, ipAddress, userAgent, failureReason)`

**Security Features:**
- Constant-time token comparison
- Session token hashing before database storage
- Password hashing with 12-round bcrypt
- JWT signing with configurable secret
- TOTP with 2-window tolerance for clock skew
- Automatic backup code removal after use
- Comprehensive audit logging

#### 2. Session Service (`session.service.ts`)

**Responsibilities:**
- Session state management
- Session validation
- Session expiration handling
- Multiple session management per user
- Session activity tracking
- Security monitoring (IP-based session retrieval)

**Key Methods:**
- `getSessionById(sessionId)` - Retrieve session details
- `getActiveSessionsForUser(userId)` - List all active sessions
- `isSessionValid(sessionId)` - Quick validity check
- `updateSessionActivity(sessionId)` - Update last activity timestamp
- `invalidateSession(sessionId)` - Delete single session
- `invalidateAllUserSessions(userId)` - Logout all devices
- `extendSessionExpiration(sessionId, extensionMs)` - Extend session life
- `getSessionsByIpAddress(ipAddress)` - Security monitoring
- `deleteExpiredSessions()` - Maintenance cleanup

**Security Features:**
- Session expiration enforcement (7-day default)
- Activity tracking for idle sessions
- Session limit enforcement per user
- IP address tracking for anomaly detection
- User agent tracking for device recognition

#### 3. SAML Service (`saml.service.ts`)

**Responsibilities:**
- SAML provider configuration management
- SAML user mapping
- SAML metadata parsing
- SAML assertion validation
- Service provider metadata generation

**Key Methods:**
- `upsertSAMLProvider(issuer, certificate, metadataUrl, ssoUrl, sloUrl)`
- `getSAMLProviderByIssuer(issuer)` - Lookup provider by issuer
- `createOrGetSAMLMapping(userId, samlProviderId, samlNameId)`
- `getUserBySAMLMapping(samlProviderId, samlNameId)` - Reverse lookup
- `parseSAMLMetadata(metadataXml)` - Extract provider endpoints
- `generateSPMetadata(entityId, acsUrl, sloUrl)` - Service provider metadata
- `validateSAMLAssertionSignature(assertionXml, certificate)` - Signature validation
- `extractNameIdFromAssertion(assertionXml)` - User identifier extraction
- `extractAttributesFromAssertion(assertionXml)` - User attribute extraction

**Security Features:**
- Certificate-based assertion validation
- NameID extraction and mapping
- User attribute extraction
- Metadata parsing and validation

### Middleware

#### 1. Auth Middleware (`middleware/auth.ts`)

**Purpose:** Validate Bearer tokens from Authorization header

```typescript
app.get('/protected', { preHandler: [authMiddleware] }, async (request, reply) => {
  // request.userId and request.sessionId are populated
})
```

**Security Features:**
- Bearer token validation
- Session existence check
- Activity timestamp update
- IP address capture

#### 2. JWT Auth Middleware

**Purpose:** Validate JWT tokens with fallback to session verification

**Security Features:**
- JWT signature verification
- Session validation against database
- Token expiration checking

#### 3. 2FA Middleware

**Purpose:** Ensure user has 2FA enabled and verified

#### 4. CSRF Protection Middleware

**Purpose:** Validate CSRF tokens for state-changing operations

**Security Features:**
- Required for POST, PUT, PATCH, DELETE
- Constant-time comparison
- Generic error messages

#### 5. Auth Rate Limiting

**Purpose:** Prevent brute force attacks

**Configuration:**
- 5 attempts per minute for auth endpoints
- IP-based rate limiting
- Distributed via Redis (extensible)

### API Routes

#### Authentication Routes (`routes/auth.ts`)

**OAuth Endpoints:**
- `POST /api/auth/oauth/callback/:provider` - OAuth callback handler
  - Validates authorization code
  - Exchanges for access token
  - Creates or links user account
  - Returns session token

**SAML Endpoints:**
- `GET /api/auth/saml/metadata` - Service provider metadata
  - Returns XML metadata for IdP configuration
  - Includes entity ID, ACS URL, SLO URL
  
- `POST /api/auth/saml/acs` - Assertion Consumer Service
  - Receives SAML assertions from IdP
  - Validates signature
  - Extracts user info
  - Creates session

**2FA Endpoints:**
- `POST /api/auth/2fa/enable` - Start 2FA setup
  - Generates TOTP secret
  - Returns QR code
  - Returns backup codes (encrypted)
  - Requires authentication

- `POST /api/auth/2fa/verify-token` - Verify TOTP token
  - Validates 6-digit token
  - Uses 2-window tolerance
  - Logs security event
  - Returns verification status

- `POST /api/auth/2fa/verify-backup-code` - Verify backup code
  - Validates and removes used code
  - Returns remaining code count
  - Logs security event

- `POST /api/auth/2fa/disable` - Disable 2FA
  - Disables 2FA on account
  - Requires CSRF token
  - Logs security event

- `GET /api/auth/2fa/backup-codes` - Get remaining backup codes count

**Session Management:**
- `GET /api/auth/sessions` - List all active sessions
  - Returns device info, IP, timestamp
  - Marks current session

- `DELETE /api/auth/sessions/:sessionId` - Revoke specific session
  - Requires user ownership
  - Logs security event

- `POST /api/auth/logout` - Logout (revoke all sessions)
  - Deletes all user sessions
  - Logs security event
  - Requires CSRF token

**Security & Audit:**
- `GET /api/auth/logs` - Get authentication audit log
  - Returns last 50 login/2FA events
  - Shows IP, device, timestamp, status
  - Shows failure reasons

- `GET /api/auth/csrf-token` - Get CSRF token
  - For initial page load
  - Returns random token

## Security Features

### Password Security
- Bcryptjs with 12 rounds (configurable)
- Constant-time comparison
- No password requirements enforced at validation level (implement business rules)
- Support for password history (extensible)

### Session Security
- 48+ character cryptographically random tokens
- SHA256 hashing for database storage
- Constant-time token comparison
- 7-day expiration (configurable)
- Activity tracking
- Automatic cleanup of expired sessions
- Device name tracking
- IP address capture
- User agent capture

### JWT Security
- HS256 algorithm (uses shared secret)
- 7-day expiration
- Includes session ID for revocation capability
- Signature verification before trust
- Refresh token support (extensible)

### 2FA Security
- TOTP (Time-based One-Time Password) using Speakeasy
- 2-time window tolerance for clock skew
- 10 backup codes generated during setup
- Backup codes bcrypt-hashed
- One-time use enforcement
- Backup code count tracking
- User can disable 2FA requiring password

### OAuth Security
- State parameter validation
- Code exchange verification
- Token expiration handling
- Account linking/creation
- Support for Google, GitHub, Azure (extensible)

### SAML Security
- Metadata parsing and validation
- Certificate-based signature validation
- NameID extraction and mapping
- User attribute mapping
- Assertion encryption support (extensible)

### CSRF Protection
- Token-based protection
- Configurable header name
- Required for state-changing operations
- Generic error responses

### Rate Limiting
- Auth endpoint rate limiting
- Login attempt throttling
- Password reset throttling
- Distributed rate limiting support (Redis)

### Audit Logging
- All authentication events logged
- Success/failure tracking
- IP address and user agent capture
- Failure reason recording
- User activity timestamps
- 90-day retention policy (configurable)

## Configuration

### Environment Variables

```env
# JWT configuration
JWT_SECRET=your-super-secret-key-change-in-production

# Session configuration
SESSION_TIMEOUT_MS=604800000  # 7 days in milliseconds
SESSION_TOKEN_LENGTH=48

# 2FA configuration
TOTP_ISSUER=Trend Hijacker

# SAML configuration
SAML_ENTITY_ID=https://trend-hijacker.example.com
SAML_ACS_URL=https://trend-hijacker.example.com/api/auth/saml/acs
SAML_SLO_URL=https://trend-hijacker.example.com/api/auth/saml/slo

# OAuth configuration (if using specific providers)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/trendhijacker

# CORS
CORS_ORIGIN=https://trend-hijacker.example.com
```

### Security Configuration Constants

Edit `config/security.ts` for:
- `SESSION_TIMEOUT_MS` - Session expiration time
- `PASSWORD_HASH_ROUNDS` - Bcrypt rounds (higher = slower but more secure)
- `TWO_FA_TOTP_WINDOW` - TOTP time window tolerance
- `AUTH_RATE_LIMIT_MAX_ATTEMPTS` - Brute force protection
- `HSTS_MAX_AGE` - HSTS header lifetime

## Integration Points

### Frontend Integration

**Session Creation:**
```javascript
// 1. Call login endpoint (not yet created, use existing auth)
// 2. Receive session token and JWT
// 3. Store in secure httpOnly cookies or secure localStorage
// 4. Include in Authorization header: "Bearer <token>"

// 5. For 2FA setup:
const { secret, qrCode, backupCodes } = await fetch('/api/auth/2fa/enable', {
  headers: { 'Authorization': 'Bearer ' + sessionToken }
});
// Display QR code to user
// Ask for token verification

// 6. Verify 2FA setup:
await fetch('/api/auth/2fa/verify-token', {
  method: 'POST',
  body: JSON.stringify({ token: userEnteredToken }),
  headers: { 
    'Authorization': 'Bearer ' + sessionToken,
    'x-csrf-token': csrfToken
  }
});

// 7. Manage sessions:
const sessions = await fetch('/api/auth/sessions', {
  headers: { 'Authorization': 'Bearer ' + sessionToken }
});

// 8. Logout:
await fetch('/api/auth/logout', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer ' + sessionToken,
    'x-csrf-token': csrfToken
  }
});
```

### Backend Integration

```typescript
import { authMiddleware, authService } from './middleware/auth';
import { sessionService } from './services/session.service';

// Protect routes
app.get('/protected', { preHandler: [authMiddleware] }, async (request, reply) => {
  const userId = request.userId;
  const sessions = await sessionService.getActiveSessionsForUser(userId);
  return { sessions };
});

// Get 2FA status
const twoFAStatus = await authService.get2FABackupCodeCount(userId);

// Log security events
await authService.logAuthEvent(
  'custom_action',
  'success',
  userId,
  ipAddress,
  userAgent
);
```

## Deployment Checklist

- [ ] Install dependencies: `pnpm install`
- [ ] Run migrations/initialize database schema
- [ ] Set all required environment variables
- [ ] Configure JWT_SECRET to strong random value
- [ ] Set SAML_ENTITY_ID and URLs
- [ ] Configure OAuth provider credentials
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Set up CORS for production domain
- [ ] Configure rate limiting backend (Redis)
- [ ] Enable HSTS header
- [ ] Enable CSP header
- [ ] Set up log aggregation for auth_logs
- [ ] Configure backup code recovery process
- [ ] Test OAuth flow with each provider
- [ ] Test SAML flow with test IdP
- [ ] Test 2FA setup and verification
- [ ] Test session management
- [ ] Load test rate limiting

## Testing

### Unit Tests

```bash
# Test auth service
npm run test -- auth.service.test.ts

# Test session service
npm run test -- session.service.test.ts

# Test SAML service
npm run test -- saml.service.test.ts

# Test auth middleware
npm run test -- auth.middleware.test.ts
```

### Integration Tests

- OAuth callback flow with mock OAuth provider
- SAML ACS endpoint with test assertion
- 2FA setup and verification flow
- Session creation and validation
- JWT token verification
- CSRF token protection
- Rate limiting enforcement
- Backup code usage

### Security Tests

- Constant-time comparison verification
- Password hash verification with wrong password
- Token collision probability
- TOTP time window tolerance
- Backup code one-time use enforcement
- Session expiration enforcement
- CSRF token validation
- Rate limit bypass attempts

## Maintenance

### Regular Tasks

- Monitor `auth_logs` for suspicious patterns
- Review failed login attempts by IP
- Check for account lockouts
- Verify session distribution across time
- Monitor OAuth token expiration
- Check SAML certificate expiration

### Cleanup Tasks

```sql
-- Delete logs older than 90 days
DELETE FROM auth_logs WHERE timestamp < NOW() - INTERVAL '90 days';

-- Delete expired sessions
DELETE FROM user_sessions WHERE expires_at <= NOW();

-- List users with many active sessions (potential compromise)
SELECT user_id, COUNT(*) as session_count 
FROM user_sessions 
WHERE expires_at > NOW() 
GROUP BY user_id 
HAVING COUNT(*) > 10;
```

### Monitoring

Monitor these metrics:
- Failed login attempts per IP
- Successful 2FA verifications
- Backup code usage
- Session creation rate
- OAuth provider availability
- SAML IdP availability
- Average session duration
- Token refresh rate

## Future Enhancements

1. **Phase 2 - Advanced Features**
   - Passwordless authentication (WebAuthn/FIDO2)
   - Risk-based authentication
   - Device fingerprinting
   - Geo-location based access
   - Anomaly detection

2. **Phase 3 - Enterprise Features**
   - Conditional access policies
   - Proxy authentication
   - Custom SAML attribute mapping
   - Multi-tenant support
   - API token management

3. **Phase 4 - Compliance**
   - GDPR data export
   - SOC 2 audit log retention
   - HIPAA compliance
   - FIPS 140-2 cryptography
   - Audit trail immutability

## References

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [SAML 2.0 Specification](https://wiki.oasis-open.org/security/saml-core)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Speakeasy Library](https://www.npmjs.com/package/speakeasy)
- [Node SAML Library](https://www.npmjs.com/package/node-saml)
- [Passport.js Documentation](http://www.passportjs.org/)

## Support

For issues or questions about this implementation:
1. Check the auth logs for error details
2. Review the security configuration
3. Verify environment variables are set correctly
4. Check that all dependencies are installed
5. Run migrations if schema changes were made
