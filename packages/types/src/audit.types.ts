/**
 * Audit Logging & Compliance Types
 * For GDPR, HIPAA, SOC 2 compliance
 */

export enum AuditAction {
  // User Management
  UserCreated = 'user_created',
  UserLoggedIn = 'user_logged_in',
  UserLoggedOut = 'user_logged_out',
  UserUpdated = 'user_updated',
  UserDeleted = 'user_deleted',
  UserActivated = 'user_activated',
  UserDeactivated = 'user_deactivated',

  // Authentication
  PasswordChanged = 'password_changed',
  PasswordReset = 'password_reset',
  TwoFAEnabled = 'two_fa_enabled',
  TwoFADisabled = 'two_fa_disabled',
  OAuthLinked = 'oauth_linked',
  OAuthUnlinked = 'oauth_unlinked',
  SAMLLogin = 'saml_login',

  // Access Control
  PermissionGranted = 'permission_granted',
  PermissionRevoked = 'permission_revoked',
  RoleAssigned = 'role_assigned',
  RoleRemoved = 'role_removed',

  // Data Access
  DataExported = 'data_exported',
  DataImported = 'data_imported',
  DataModified = 'data_modified',
  DataDeleted = 'data_deleted',
  DataViewed = 'data_viewed',

  // Workspace
  WorkspaceCreated = 'workspace_created',
  WorkspaceUpdated = 'workspace_updated',
  WorkspaceDeleted = 'workspace_deleted',
  MemberAdded = 'member_added',
  MemberRemoved = 'member_removed',

  // Settings
  SettingsUpdated = 'settings_updated',
  SecuritySettingsUpdated = 'security_settings_updated',
  NotificationSettingsUpdated = 'notification_settings_updated',

  // Admin
  AdminAction = 'admin_action',
  SystemConfigChanged = 'system_config_changed',

  // Security
  FailedAuthAttempt = 'failed_auth_attempt',
  SuspiciousActivity = 'suspicious_activity',
  SecurityAlert = 'security_alert',
  IPAddressChanged = 'ip_address_changed',
  SessionTerminated = 'session_terminated',

  // Compliance
  AuditLogExported = 'audit_log_exported',
  ComplianceReportGenerated = 'compliance_report_generated',
  DataRetentionPolicyApplied = 'data_retention_policy_applied',
}

export enum AuditSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

export enum AuditStatus {
  Success = 'success',
  Failed = 'failed',
  Attempted = 'attempted',
  Denied = 'denied',
}

export enum ResourceType {
  User = 'user',
  Workspace = 'workspace',
  Collection = 'collection',
  Trend = 'trend',
  Alert = 'alert',
  Report = 'report',
  Session = 'session',
  Settings = 'settings',
  System = 'system',
  Other = 'other',
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: AuditAction;
  actionCategory?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  resourceName?: string;
  beforeValue?: Record<string, any>;
  afterValue?: Record<string, any>;
  status: AuditStatus;
  severity: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  errorMessage?: string;
  additionalContext?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  actionCategory?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  status?: AuditStatus;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface AuditLogQueryResult {
  logs: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}

export interface AuditExportOptions {
  format: 'json' | 'csv' | 'jsonl';
  filters: AuditLogFilters;
  includeMetadata?: boolean;
  signatureAlgorithm?: 'sha256' | 'sha512';
}

export interface AuditExportResult {
  fileUrl: string;
  fileName: string;
  format: string;
  recordCount: number;
  totalSize: number;
  createdAt: Date;
  signature?: string;
}

// Security Event Types
export interface SecurityEvent {
  id: string;
  userId?: string;
  eventType: string;
  severity: AuditSeverity;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolution?: string;
}

// Compliance Report Types
export enum ComplianceFramework {
  GDPR = 'gdpr',
  HIPAA = 'hipaa',
  SOC2 = 'soc2',
  PCI_DSS = 'pci_dss',
  ISO27001 = 'iso_27001',
  CCPA = 'ccpa',
}

export interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  status: 'draft' | 'finalized' | 'approved';
  metrics: ComplianceMetrics;
  findings: ComplianceFinding[];
  recommendations: string[];
  generatedBy: string;
}

export interface ComplianceMetrics {
  totalAuditLogs: number;
  securityEvents: number;
  failedAuthAttempts: number;
  dataAccessAttempts: number;
  unauthorizedAccessAttempts: number;
  policyViolations: number;
  userDataExportRequests: number;
  userDataDeletionRequests: number;
  averageResponseTime: number;
  complianceScore: number; // 0-100
}

export interface ComplianceFinding {
  id: string;
  severity: AuditSeverity;
  category: string;
  title: string;
  description: string;
  evidence: string[];
  remediation: string;
  dueDate?: Date;
  status: 'open' | 'resolved' | 'mitigated';
}

// Data Retention Policy
export interface RetentionPolicy {
  id: string;
  name: string;
  description?: string;
  resourceType: ResourceType;
  retentionDays: number;
  archiveAfterDays?: number;
  deleteAfterDays?: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User Data Export (GDPR Right to Portability)
export interface UserDataExport {
  id: string;
  userId: string;
  exportedBy: string;
  format: 'json' | 'csv' | 'xlsx';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  fileSize?: number;
  recordCount?: number;
  createdAt: Date;
  expiresAt: Date;
  error?: string;
}

// Account Deletion Request (GDPR Right to be Forgotten)
export interface AccountDeletionRequest {
  id: string;
  userId: string;
  requestedAt: Date;
  confirmedAt?: Date;
  deletedAt?: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  reason?: string;
  notes?: string;
}

// Audit Configuration
export interface AuditConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retentionDays: number;
  encryptLogs: boolean;
  signLogs: boolean;
  webhookUrl?: string;
  excludedActions?: AuditAction[];
  samplingRate?: number; // 0-1
}

export interface AuditLogCreateRequest {
  userId?: string;
  action: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  beforeValue?: Record<string, any>;
  afterValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: AuditStatus;
  severity?: AuditSeverity;
  errorMessage?: string;
  additionalContext?: Record<string, any>;
}

export interface SessionAuditLog {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastActivityAt: Date;
  ipAddress: string;
  userAgent: string;
  deviceName?: string;
  actionCount: number;
  failureCount: number;
}
