/**
 * Enterprise Authentication Types
 * OAuth2/OIDC, SAML2, 2FA/TOTP, Session Management
 */

export enum OAuthProvider {
  Google = 'google',
  GitHub = 'github',
  Azure = 'azure',
  Microsoft = 'microsoft',
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  idToken?: string;
  tokenType: string;
}

export interface OAuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  locale?: string;
}

// SAML Types
export interface SAMLConfig {
  issuer: string;
  cert: string;
  entryPoint: string;
  logoutUrl?: string;
  identifierFormat?: string;
  requestIdAttribute?: string;
}

export interface SAMLResponse {
  NameID: string;
  attributes: Record<string, string | string[]>;
  issuer?: string;
  sessionIndex?: string;
}

export interface SAMLUser {
  nameId: string;
  email: string;
  name?: string;
  attributes?: Record<string, any>;
}

export interface SAMLMetadata {
  xml: string;
  entityId: string;
  acsUrl: string;
  sloUrl: string;
}

// 2FA/TOTP Types
export interface TwoFAConfig {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFASetup {
  userId: string;
  secretKey: string;
  backupCodes: string[];
  enabled: boolean;
  enabledAt?: Date;
}

export interface TwoFAVerification {
  token: string;
  backupCode?: string;
}

// Session Types
export interface SessionConfig {
  timeout: number; // ms
  refreshInterval: number; // ms
  sameSite: 'Strict' | 'Lax' | 'None';
  secure: boolean;
  httpOnly: boolean;
}

export interface AuthenticatedSession {
  userId: string;
  sessionId: string;
  token: string;
  jwt: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
}

export interface SessionDevice {
  id: string;
  userId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  lastActivityAt: Date;
  createdAt: Date;
  expiresAt: Date;
}

// OAuth Account Link
export interface OAuthAccountLink {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  providerEmail?: string;
  providerName?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  linkedAt: Date;
  lastUsedAt?: Date;
}

// Auth Request Types
export interface LoginRequest {
  email: string;
  password: string;
  deviceName?: string;
}

export interface OAuthCallbackRequest {
  code: string;
  state?: string;
  provider: OAuthProvider;
}

export interface Setup2FARequest {
  userId: string;
}

export interface Verify2FARequest {
  secretKey: string;
  token: string;
}

export interface Disable2FARequest {
  password: string;
}

// Auth Response Types
export interface LoginResponse {
  session: AuthenticatedSession;
  user: {
    id: string;
    email: string;
    name?: string;
  };
  requiresTwoFA?: boolean;
}

export interface Setup2FAResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface SessionListResponse {
  sessions: SessionDevice[];
  total: number;
}

// Token Payload
export interface TokenPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

// MFA Status
export enum MFAStatus {
  NotSetup = 'not_setup',
  Pending = 'pending',
  Active = 'active',
  Disabled = 'disabled',
}

export interface UserMFAStatus {
  userId: string;
  mfaEnabled: boolean;
  mfaStatus: MFAStatus;
  methods: MFAMethod[];
  backupCodesRemaining: number;
}

export enum MFAMethod {
  TOTP = 'totp',
  SMS = 'sms',
  Email = 'email',
  BackupCode = 'backup_code',
}

// Provider specific tokens
export interface ProviderTokens {
  provider: OAuthProvider;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: Date;
  scope: string[];
}
