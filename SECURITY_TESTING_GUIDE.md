# Security Systems - Testing Guide

## Overview

This guide provides comprehensive testing procedures for all security features implemented in Phase 1.

## Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database
- Postman or curl
- Authenticator app (Google Authenticator, Authy, etc.)

## Setup

```bash
# Install dependencies
cd d:\workspace
pnpm install

# Start the API
cd apps/api
npm run dev
```

The API will be available at `http://localhost:3000`

## Unit Tests

### Testing Password Hashing

```typescript
// auth.service.test.ts
describe('AuthService - Password Hashing', () => {
  it('should hash password', async () => {
    const hash = await authService.hashPassword('test-password-123');
    expect(hash).not.toBe('test-password-123');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should verify correct password', async () => {
    const hash = await authService.hashPassword('test-password-123');
    const isValid = await authService.verifyPassword('test-password-123', hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const hash = await authService.hashPassword('test-password-123');
    const isValid = await authService.verifyPassword('wrong-password', hash);
    expect(isValid).toBe(false);
  });

  it('should use constant time comparison', async () => {
    const hash = await authService.hashPassword('test-password');
    const start1 = Date.now();
    await authService.verifyPassword('test-password', hash);
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await authService.verifyPassword('wrong-password', hash);
    const time2 = Date.now() - start2;

    // Times should be similar (within 50ms) to prevent timing attacks
    expect(Math.abs(time1 - time2)).toBeLessThan(50);
  });
});
```

### Testing Session Token Generation

```typescript
describe('AuthService - Session Tokens', () => {
  it('should generate random tokens', () => {
    const token1 = authService.generateSessionToken();
    const token2 = authService.generateSessionToken();
    
    expect(token1).not.toBe(token2);
  });

  it('should generate tokens of correct length', () => {
    const token = authService.generateSessionToken();
    // 48 chars in crypto-random-string base64 should be ~64 chars
    expect(token.length).toBeGreaterThanOrEqual(48);
  });

  it('should use cryptographic randomness', () => {
    const tokens = Array.from({ length: 100 }, () => 
      authService.generateSessionToken()
    );
    
    // All tokens should be unique
    const unique = new Set(tokens);
    expect(unique.size).toBe(100);
  });
});
```

### Testing JWT Tokens

```typescript
describe('AuthService - JWT Tokens', () => {
  it('should generate JWT token', () => {
    const jwt = authService.generateJWT('user-123', 'session-456');
    expect(jwt).toBeDefined();
    expect(jwt.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should verify valid JWT token', () => {
    const jwt = authService.generateJWT('user-123', 'session-456');
    const payload = authService.verifyJWT(jwt);
    
    expect(payload).toBeDefined();
    expect(payload?.userId).toBe('user-123');
    expect(payload?.sessionId).toBe('session-456');
  });

  it('should reject invalid JWT token', () => {
    const payload = authService.verifyJWT('invalid.jwt.token');
    expect(payload).toBeNull();
  });

  it('should include expiration', () => {
    const jwt = authService.generateJWT('user-123', 'session-456');
    const payload = authService.verifyJWT(jwt);
    
    expect(payload?.exp).toBeDefined();
    expect(payload!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
```

### Testing 2FA

```typescript
describe('AuthService - 2FA', () => {
  it('should setup 2FA with QR code', async () => {
    const result = await authService.setup2FA('user-123');
    
    expect(result.secret).toBeDefined();
    expect(result.qrCode).toContain('data:image/png');
    expect(result.backupCodes).toHaveLength(10);
  });

  it('should verify TOTP token', async () => {
    const { secret } = await authService.setup2FA('user-123');
    
    // Generate valid TOTP token
    const token = speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    });
    
    const isValid = await authService.enable2FA('user-123', secret, token);
    expect(isValid).not.toBeNull();
  });

  it('should reject invalid TOTP token', async () => {
    const { secret } = await authService.setup2FA('user-123');
    const isValid = await authService.enable2FA('user-123', secret, '000000');
    
    expect(isValid).toBeNull();
  });

  it('should verify and remove backup codes', async () => {
    // ... setup 2FA first
    const isValid = await authService.verify2FABackupCode('user-123', backupCode);
    expect(isValid).toBe(true);
    
    // Same code should not work twice
    const isValid2 = await authService.verify2FABackupCode('user-123', backupCode);
    expect(isValid2).toBe(false);
  });

  it('should track remaining backup codes', async () => {
    // ... setup 2FA with 10 codes
    const count = await authService.get2FABackupCodeCount('user-123');
    expect(count).toBe(10);
    
    // Use one code
    await authService.verify2FABackupCode('user-123', backupCode);
    
    // Should have 9 remaining
    const newCount = await authService.get2FABackupCodeCount('user-123');
    expect(newCount).toBe(9);
  });
});
```

## Integration Tests

### Testing Session Creation and Validation

```bash
# Create a session
curl -X POST http://localhost:3000/api/auth/sessions \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "deviceName": "Test Device"}'

# Response should include:
# {
#   "success": true,
#   "data": {
#     "session": { ... },
#     "token": "...",
#     "jwt": "..."
#   }
# }
```

### Testing 2FA Setup

```bash
# Get 2FA setup info
curl -H "Authorization: Bearer {session_token}" \
  http://localhost:3000/api/auth/2fa/enable

# Response includes:
# - secret (base32 encoded)
# - qrCode (data URL)
# - backupCodes (array of 10 codes)

# Display QR code in terminal:
# - Copy qrCode data URL to browser
# - Or use: npm install -g qr-image
# - And decode the secret with your authenticator app

# Verify 2FA setup
curl -X POST http://localhost:3000/api/auth/2fa/verify-token \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{"token": "123456"}'  # From authenticator app
```

### Testing Session Management

```bash
# List all active sessions
curl -H "Authorization: Bearer {session_token}" \
  http://localhost:3000/api/auth/sessions

# Response:
# {
#   "success": true,
#   "data": {
#     "sessions": [
#       {
#         "id": "...",
#         "deviceName": "Desktop",
#         "ipAddress": "192.168.1.1",
#         "createdAt": "2024-01-15T10:00:00Z",
#         "lastActivityAt": "2024-01-15T10:05:00Z",
#         "isCurrent": true
#       }
#     ]
#   }
# }

# Revoke a specific session
curl -X DELETE http://localhost:3000/api/auth/sessions/{sessionId} \
  -H "Authorization: Bearer {session_token}" \
  -H "x-csrf-token: {csrf_token}"

# Logout all sessions
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer {session_token}" \
  -H "x-csrf-token: {csrf_token}"
```

### Testing CSRF Protection

```bash
# This should fail (no CSRF token)
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer {session_token}"

# Response should be 403 Forbidden:
# {
#   "success": false,
#   "error": {
#     "code": "CSRF_TOKEN_MISSING",
#     "message": "CSRF token is required"
#   }
# }

# Get CSRF token
curl http://localhost:3000/api/auth/csrf-token

# This should succeed (with CSRF token)
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer {session_token}" \
  -H "x-csrf-token: {csrf_token}"
```

### Testing Authentication Logs

```bash
# Get authentication audit log
curl -H "Authorization: Bearer {session_token}" \
  http://localhost:3000/api/auth/logs

# Response includes:
# {
#   "success": true,
#   "data": {
#     "logs": [
#       {
#         "id": "...",
#         "action": "login",
#         "status": "success",
#         "timestamp": "2024-01-15T10:00:00Z",
#         "ipAddress": "192.168.1.1",
#         "userAgent": "Mozilla/5.0..."
#       }
#     ]
#   }
# }
```

## Security Tests

### Testing Token Collision Probability

```bash
# Generate many tokens and check for collisions
curl http://localhost:3000/api/auth/csrf-token &
curl http://localhost:3000/api/auth/csrf-token &
curl http://localhost:3000/api/auth/csrf-token &
# ... (100 times)

# All should have different tokens
# Probability of collision: 1 in 2^128 or less
```

### Testing Rate Limiting

```bash
# Make 5 failed login attempts in under 1 minute
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@test.com", "password": "wrong"}'
done

# 6th attempt should be rate limited (429 Too Many Requests)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "wrong"}'
```

### Testing Session Expiration

```bash
# In database, update session to expired time:
UPDATE user_sessions 
SET expires_at = NOW() - INTERVAL '1 minute' 
WHERE id = 'session-id';

# Try using expired session token:
curl -H "Authorization: Bearer {expired_token}" \
  http://localhost:3000/api/auth/sessions

# Should fail with 401 Unauthorized
```

### Testing TOTP Window Tolerance

```typescript
// Test that TOTP works within 2-window tolerance
describe('TOTP Window Tolerance', () => {
  it('should accept token from current time window', async () => {
    const token = speakeasy.totp({
      secret: secret,
      encoding: 'base32',
      time: Math.floor(Date.now() / 1000)
    });
    
    const isValid = await authService.verify2FAToken(userId, token);
    expect(isValid).toBe(true);
  });

  it('should accept token from ±30 second window', async () => {
    const token = speakeasy.totp({
      secret: secret,
      encoding: 'base32',
      time: Math.floor(Date.now() / 1000) - 30
    });
    
    const isValid = await authService.verify2FAToken(userId, token);
    expect(isValid).toBe(true);
  });

  it('should reject token outside 60 second window', async () => {
    const token = speakeasy.totp({
      secret: secret,
      encoding: 'base32',
      time: Math.floor(Date.now() / 1000) - 120
    });
    
    const isValid = await authService.verify2FAToken(userId, token);
    expect(isValid).toBe(false);
  });
});
```

## Performance Tests

### Session Creation Performance

```bash
# Measure session creation time
time curl -X POST http://localhost:3000/api/auth/sessions \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}'

# Should complete in <100ms typically
# Bcrypt hashing takes ~100ms, token generation is instant
```

### Token Validation Performance

```bash
# Measure token validation time (100 validations)
for i in {1..100}; do
  time curl -H "Authorization: Bearer {session_token}" \
    http://localhost:3000/api/auth/sessions
done

# Each should complete in <10ms (database query only)
```

## Load Tests

### Simulating Multiple Concurrent Users

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/health

# Using autocannon
npm install -g autocannon
autocannon http://localhost:3000/api/health -c 10 -d 30
```

### Testing Session Limits

```typescript
// Create max sessions per user
for (let i = 0; i < 10; i++) {
  await authService.createSession(userId, `Device ${i}`);
}

// 11th session should trigger oldest session removal
const session11 = await authService.createSession(userId, 'Device 11');
expect(session11).toBeDefined();

// Should only have 10 active sessions
const sessions = await sessionService.getActiveSessionsForUser(userId);
expect(sessions.length).toBe(10);
```

## Database Tests

### Verifying Data Integrity

```sql
-- Check OAuth accounts are properly linked
SELECT * FROM oauth_accounts WHERE user_id = 'test-user';

-- Check SAML mappings are unique
SELECT COUNT(*) FROM saml_user_mappings 
GROUP BY saml_provider_id, saml_name_id 
HAVING COUNT(*) > 1;  -- Should be empty

-- Check 2FA backup codes are hashed
SELECT secret_key, backup_codes FROM user_2fa 
WHERE user_id = 'test-user';  -- backup_codes should be hashed strings

-- Check session tokens are hashed
SELECT token_hash FROM user_sessions 
WHERE user_id = 'test-user';  -- Should all be SHA256 hashes

-- Verify expired sessions exist in logs
SELECT COUNT(*) FROM auth_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

## Cleanup

### Remove Test Data

```sql
-- Delete test user and related data
DELETE FROM oauth_accounts WHERE user_id = 'test-user-123';
DELETE FROM saml_user_mappings WHERE user_id = 'test-user-123';
DELETE FROM user_2fa WHERE user_id = 'test-user-123';
DELETE FROM user_sessions WHERE user_id = 'test-user-123';
DELETE FROM auth_logs WHERE user_id = 'test-user-123';

-- Clean up expired sessions
DELETE FROM user_sessions WHERE expires_at <= NOW();

-- Archive old auth logs
DELETE FROM auth_logs WHERE timestamp < NOW() - INTERVAL '90 days';
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run unit tests
        run: pnpm test -- auth.service.test.ts
      
      - name: Run integration tests
        run: pnpm test:integration
      
      - name: Run security tests
        run: pnpm test:security
```

## Manual Testing Checklist

### Before Release

- [ ] Password hashing produces different hash each time
- [ ] Session tokens are unique (100 generations)
- [ ] JWT tokens are signed correctly
- [ ] 2FA setup generates valid QR codes
- [ ] 2FA verification works with authenticator app
- [ ] Backup codes work and are one-time use
- [ ] Session management creates/lists/deletes properly
- [ ] CSRF protection blocks requests without token
- [ ] Rate limiting throttles after N attempts
- [ ] Auth logs record all events
- [ ] Token comparison is constant-time
- [ ] Database schema creates without errors
- [ ] All API endpoints respond correctly
- [ ] Error messages don't leak information
- [ ] Expired sessions are automatically cleaned

## Troubleshooting

### "Module not found" errors
```bash
# Ensure dependencies are installed
pnpm install
```

### "Database connection failed"
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### "JWT verification failed"
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Should be 32+ characters
```

### "2FA verification fails"
```bash
# Check system time is synchronized
date
ntpdate -s time.nist.gov

# Verify authenticator time matches
```

## References

- OWASP Testing Cheat Sheet
- NIST Authentication Guidelines
- TOTP RFC 6238
- OAuth 2.0 RFC 6749
- SAML 2.0 Specification
