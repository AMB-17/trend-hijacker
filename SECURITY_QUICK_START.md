# Security Systems Quick Start Guide

## What Was Implemented

Phase 1 of enterprise security systems for Trend Hijacker v2.0 includes:

✅ **OAuth 2.0 SSO** - Google, GitHub, Azure provider support
✅ **SAML 2.0 Integration** - Enterprise single sign-on
✅ **Two-Factor Authentication** - TOTP (Google Authenticator) + backup codes
✅ **Session Management** - Multi-device sessions with activity tracking
✅ **Security Middleware** - CSRF protection, rate limiting, authentication

## Files Created

### Database
- `apps/api/src/schema.ts` - Added 7 new security tables

### Services (Backend Business Logic)
- `apps/api/src/services/auth.service.ts` - Authentication and token management
- `apps/api/src/services/session.service.ts` - Session state management
- `apps/api/src/services/saml.service.ts` - SAML provider management

### Middleware (Request Processing)
- `apps/api/src/middleware/auth.ts` - Authentication, CSRF, rate limiting middleware

### Routes (API Endpoints)
- `apps/api/src/routes/auth.ts` - 13 new authentication endpoints

### Configuration
- `apps/api/src/config/security.ts` - Security constants and best practices

### Documentation
- `SECURITY_IMPLEMENTATION_GUIDE.md` - Complete technical documentation (this file)
- `SECURITY_QUICK_START.md` - Quick reference (this file)

## Installation

```bash
# Navigate to project root
cd d:\workspace

# Install all dependencies including new security packages
pnpm install
```

**New dependencies added:**
```json
{
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0",
  "passport-github2": "^0.1.12",
  "passport-azure-ad": "^4.3.0",
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.3",
  "jsonwebtoken": "^9.1.2",
  "bcryptjs": "^2.4.3",
  "node-saml": "^4.0.0",
  "crypto-random-string": "^5.0.0"
}
```

## Key Architecture

### Database Tables Added

```
oauth_accounts      - OAuth provider accounts
saml_providers      - SAML identity provider config
saml_user_mappings  - Links users to SAML identities
user_2fa            - Two-factor authentication settings
user_sessions       - Active user sessions
auth_logs           - Audit trail of all auth events
```

### Service Layer

```
AuthService
├── Password hashing (bcryptjs)
├── Session token generation (48 char random)
├── JWT token management
├── 2FA setup & verification (TOTP)
├── OAuth account management
└── Audit logging

SessionService
├── Session CRUD operations
├── Activity tracking
├── Expiration enforcement
└── Security monitoring

SAMLService
├── Provider configuration
├── Metadata parsing
├── User mapping
└── Assertion validation
```

### API Endpoints

```
POST   /api/auth/oauth/callback/:provider      - OAuth callback
GET    /api/auth/saml/metadata                 - SAML service provider metadata
POST   /api/auth/saml/acs                      - SAML assertion consumer service

POST   /api/auth/2fa/enable                    - Start 2FA setup
POST   /api/auth/2fa/verify-token              - Verify TOTP token
POST   /api/auth/2fa/verify-backup-code        - Use backup code
POST   /api/auth/2fa/disable                   - Disable 2FA
GET    /api/auth/2fa/backup-codes              - Check remaining codes

GET    /api/auth/sessions                      - List active sessions
DELETE /api/auth/sessions/{id}                 - Revoke specific session
POST   /api/auth/logout                        - Logout all sessions

GET    /api/auth/logs                          - Get auth audit log
GET    /api/auth/csrf-token                    - Get CSRF token
```

## Setup Steps

### 1. Environment Variables

Create/update `.env` file:

```env
# JWT
JWT_SECRET=your-very-long-random-secret-key-min-32-chars

# Session
SESSION_TIMEOUT_MS=604800000
SESSION_TOKEN_LENGTH=48

# SAML
SAML_ENTITY_ID=https://your-domain.example.com
SAML_ACS_URL=https://your-domain.example.com/api/auth/saml/acs
SAML_SLO_URL=https://your-domain.example.com/api/auth/saml/slo

# OAuth (add if using these providers)
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
GITHUB_CLIENT_ID=your-id
GITHUB_CLIENT_SECRET=your-secret
AZURE_CLIENT_ID=your-id
AZURE_CLIENT_SECRET=your-secret
AZURE_TENANT_ID=your-tenant
```

### 2. Database Initialization

The new tables are defined in `schema.ts` and will be created when your database initializes (if using the existing migration system).

Manual SQL initialization (if needed):
```sql
-- Run the SQL from apps/api/src/schema.ts after line 127
```

### 3. Build & Start

```bash
# Development
cd apps/api
npm run dev

# Production
npm run build
npm start
```

## Usage Examples

### Protecting Routes

```typescript
import { authMiddleware } from './middleware/auth';

// Protect endpoint with authentication
app.get('/api/protected-endpoint', 
  { preHandler: [authMiddleware] },
  async (request, reply) => {
    const userId = request.userId;
    return { message: 'You are authenticated!' };
  }
);
```

### Creating Sessions

```typescript
import { authService } from './services/auth.service';

const { session, token, jwt } = await authService.createSession(
  userId,
  ipAddress,           // optional
  userAgent,          // optional
  'MacBook Pro'       // device name
);

// Return to client:
// - token: store in secure cookie or secure storage
// - jwt: use for API calls as "Bearer {jwt}"
```

### Setting Up 2FA

```typescript
// Step 1: User requests 2FA setup
const { secret, qrCode, backupCodes } = await authService.setup2FA(userId);

// Return QR code to frontend, user scans with authenticator app

// Step 2: User verifies token from authenticator
const verified = await authService.enable2FA(userId, secret, userEnteredToken);

if (verified) {
  // 2FA is now enabled
  // Save backup codes securely
}
```

### Managing Sessions

```typescript
import { sessionService } from './services/session.service';

// Get all active sessions for user
const sessions = await sessionService.getActiveSessionsForUser(userId);

// Revoke specific session (force logout from one device)
await sessionService.invalidateSession(sessionId);

// Logout from all devices
await sessionService.invalidateAllUserSessions(userId);
```

### Logging Security Events

```typescript
import { authService } from './services/auth.service';

await authService.logAuthEvent(
  'login',              // action
  'success',           // status
  userId,              // user
  ipAddress,           // optional
  userAgent,           // optional
  null                 // failureReason (only for failed events)
);
```

## Security Highlights

### ✅ Strong Password Hashing
- Bcryptjs with 12 salt rounds
- Protection against rainbow tables
- Adaptive cost factor increases with hardware improvements

### ✅ Secure Session Tokens
- 48 characters of cryptographically random data
- SHA256 hashed before database storage
- Constant-time comparison prevents timing attacks

### ✅ JWT Security
- HS256 algorithm with secret key
- 7-day expiration by default
- Includes session ID for revocation capability

### ✅ 2FA Implementation
- TOTP (Time-based One-Time Password) via Google Authenticator
- 2-time window tolerance for clock skew
- 10 backup codes with one-time use enforcement
- Bcrypt hashing of backup codes

### ✅ CSRF Protection
- Token-based protection on state-changing operations
- Generic error messages prevent information leakage

### ✅ Rate Limiting
- Configurable limits on auth endpoints
- IP-based tracking prevents brute force
- Redis backend support for distributed systems

### ✅ Audit Logging
- All authentication events recorded
- Failure reasons tracked for investigation
- IP address and user agent captured
- 90-day retention policy

## Common Tasks

### Enable 2FA for User

```bash
# No setup needed - use /api/auth/2fa/enable endpoint
# User will get QR code to scan
```

### List All User Sessions

```bash
curl -H "Authorization: Bearer {session_token}" \
  http://localhost:3000/api/auth/sessions
```

### Logout User from Specific Device

```bash
curl -X DELETE \
  -H "Authorization: Bearer {session_token}" \
  -H "x-csrf-token: {csrf_token}" \
  http://localhost:3000/api/auth/sessions/{sessionId}
```

### View Authentication Audit Log

```bash
curl -H "Authorization: Bearer {session_token}" \
  http://localhost:3000/api/auth/logs
```

### Reset 2FA for User

```sql
-- Disable 2FA in database (use through API for proper logging)
UPDATE user_2fa SET enabled = FALSE WHERE user_id = 'user-uuid';
```

## Testing

### Test Session Creation

```bash
# Create a session (requires existing login endpoint)
curl -X POST http://localhost:3000/api/auth/sessions \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}'
```

### Test 2FA

```bash
# Get 2FA setup
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/auth/2fa/enable

# Verify TOTP token
curl -X POST http://localhost:3000/api/auth/2fa/verify-token \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"token": "123456"}'
```

### Test CSRF Protection

```bash
# This should fail (no CSRF token)
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer {token}"

# This should succeed (with CSRF token)
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer {token}" \
  -H "x-csrf-token: {csrf_token}"
```

## Troubleshooting

### "Session not found"
- Check if session has expired (7 days)
- Verify token_hash matches in database
- Check token isn't corrupted in transmission

### "2FA verification failed"
- Verify time is synchronized on server and authenticator device
- Check token is within 30-second window
- Verify correct base32 secret is stored

### "CSRF token missing"
- GET /api/auth/csrf-token to get a fresh token
- Include in x-csrf-token header for POST/PUT/DELETE

### OAuth "redirect_uri mismatch"
- Verify CORS_ORIGIN env variable matches configured redirect URI
- Check OAuth provider app settings

### SAML "signature validation failed"
- Verify IdP certificate is correctly stored
- Check assertion timestamp is within acceptable window
- Ensure IdP clock is synchronized with server

## Next Steps

1. **Integrate with Login/Signup** - Connect to existing auth system
2. **Frontend Implementation** - Add 2FA UI, session management
3. **OAuth Provider Setup** - Configure Google, GitHub, Azure apps
4. **SAML IdP Integration** - Test with Okta, Azure AD, or other IdP
5. **Monitoring & Alerting** - Set up alerts for suspicious auth patterns
6. **Load Testing** - Verify rate limiting under load

## Support Resources

- **Full Technical Guide**: See `SECURITY_IMPLEMENTATION_GUIDE.md`
- **Code Examples**: Check route handlers in `routes/auth.ts`
- **Configuration**: Review `config/security.ts` for tuning
- **Passport.js Docs**: http://www.passportjs.org/
- **Speakeasy Docs**: https://www.npmjs.com/package/speakeasy
- **OAuth 2.0 RFC**: https://tools.ietf.org/html/rfc6749

## Phase Completion Status

✅ Phase 1 - Enterprise Security Systems Complete
- OAuth 2.0 SSO implementation
- SAML 2.0 integration 
- Two-factor authentication (2FA)
- Session management
- Security middleware
- Audit logging
- All database schema
- All services
- All routes
- Security configuration

🚀 Ready for Phase 2: Advanced Features (WebAuthn, risk-based auth, etc.)
