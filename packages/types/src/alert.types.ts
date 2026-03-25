import { z } from "zod";

// Alert Configuration Schema
export const AlertFrequencyEnum = z.enum([
  "REAL_TIME",
  "DAILY_DIGEST",
  "WEEKLY_DIGEST",
]);
export type AlertFrequency = z.infer<typeof AlertFrequencyEnum>;

export const AlertDeliveryStatusEnum = z.enum([
  "PENDING",
  "SENT",
  "FAILED",
  "DELIVERED",
  "BOUNCED",
]);
export type AlertDeliveryStatus = z.infer<typeof AlertDeliveryStatusEnum>;

// Alert Config
export const AlertConfigSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  emailEnabled: z.boolean().default(true),
  slackEnabled: z.boolean().default(false),
  slackWebhookUrl: z.string().url().optional().nullable(),
  webhookEnabled: z.boolean().default(false),
  webhookUrl: z.string().url().optional().nullable(),
  frequency: AlertFrequencyEnum.default("REAL_TIME"),
  digestHourOfDay: z.number().min(0).max(23).optional().nullable(),
  digestDayOfWeek: z.number().min(0).max(6).optional().nullable(),
  mobileNotifications: z.boolean().default(false),
  inAppNotifications: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type AlertConfig = z.infer<typeof AlertConfigSchema>;

export const UpdateAlertConfigSchema = AlertConfigSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});
export type UpdateAlertConfig = z.infer<typeof UpdateAlertConfigSchema>;

// Alert Rule
export const AlertRuleSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  configId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  minOpportunityScore: z.number().min(0).max(100).default(70),
  minVelocityThreshold: z.number().default(0),
  onlyNewTrends: z.boolean().default(false),
  keywords: z.array(z.string()).default([]),
  stages: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type AlertRule = z.infer<typeof AlertRuleSchema>;

export const CreateAlertRuleSchema = AlertRuleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateAlertRule = z.infer<typeof CreateAlertRuleSchema>;

export const UpdateAlertRuleSchema = AlertRuleSchema.partial().omit({
  id: true,
  userId: true,
  configId: true,
  createdAt: true,
  updatedAt: true,
});
export type UpdateAlertRule = z.infer<typeof UpdateAlertRuleSchema>;

// Alert History
export const AlertHistorySchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  configId: z.string(),
  subject: z.string(),
  message: z.string(),
  channel: z.enum(["email", "slack", "webhook", "in_app"]),
  trendId: z.string().optional().nullable(),
  trendsData: z.record(z.any()).optional().nullable(),
  status: AlertDeliveryStatusEnum.default("PENDING"),
  deliveredAt: z.date().optional().nullable(),
  failureReason: z.string().optional().nullable(),
  retryCount: z.number().default(0),
  nextRetryAt: z.date().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type AlertHistory = z.infer<typeof AlertHistorySchema>;

// Alert Delivery
export const AlertDeliverySchema = z.object({
  id: z.string().optional(),
  historyId: z.string(),
  channel: z.enum(["email", "slack", "webhook"]),
  recipient: z.string(),
  status: AlertDeliveryStatusEnum.default("PENDING"),
  statusCode: z.number().optional().nullable(),
  statusMessage: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
  deliveredAt: z.date().optional().nullable(),
  failureReason: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type AlertDelivery = z.infer<typeof AlertDeliverySchema>;

// API Request/Response Schemas
export const SendTestAlertSchema = z.object({
  channel: z.enum(["email", "slack", "webhook"]),
  testMessage: z.string().optional().default("This is a test notification"),
});
export type SendTestAlert = z.infer<typeof SendTestAlertSchema>;

export const AlertHistoryQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  status: AlertDeliveryStatusEnum.optional(),
  channel: z.enum(["email", "slack", "webhook", "in_app"]).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});
export type AlertHistoryQuery = z.infer<typeof AlertHistoryQuerySchema>;

// Email/Slack Payload Types
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface SlackPayload {
  webhookUrl: string;
  blocks: Array<Record<string, any>>;
  text?: string;
}

export interface WebhookPayload {
  url: string;
  method: "POST" | "PUT";
  headers?: Record<string, string>;
  body: Record<string, any>;
}

// Alert Event Types
export interface TrendAlertEvent {
  type: "new_trend" | "trend_updated" | "trend_exploding";
  trend: {
    id: string;
    title: string;
    summary: string;
    opportunityScore: number;
    velocityGrowth: number;
    stage: string;
  };
  ruleId: string;
  timestamp: Date;
}

export interface AlertDigestEvent {
  type: "daily_digest" | "weekly_digest";
  trends: TrendAlertEvent["trend"][];
  period: "daily" | "weekly";
  timestamp: Date;
}
