import { z } from 'zod';

// Validation schemas

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  tier: z.enum(['free', 'premium', 'enterprise']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TrendSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  summary: z.string().min(10).max(5000),
  opportunityScore: z.number().min(0).max(100),
  velocityScore: z.number().min(0).max(1),
  problemIntensity: z.number().min(0).max(1),
  noveltyScore: z.number().min(0).max(1),
  discussionCount: z.number().int().nonnegative(),
  sourceCount: z.number().int().nonnegative(),
  status: z.enum(['emerging', 'growing', 'peak', 'declining', 'stable']),
  category: z.string().optional(),
  suggestedIdeas: z.array(z.string()),
  marketPotentialEstimate: z.string().optional(),
  peakDate: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const DiscussionSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(['reddit', 'hackernews', 'producthunt', 'indiehackers', 'rss']),
  sourceId: z.string(),
  url: z.string().url(),
  title: z.string().optional(),
  content: z.string().min(1),
  author: z.string().optional(),
  upvotes: z.number().int().nonnegative().default(0),
  commentsCount: z.number().int().nonnegative().default(0),
  sentimentScore: z.number().min(-1).max(1).optional(),
  extractedKeywords: z.array(z.string()).default([]),
  painPointsDetected: z.boolean().default(false),
  createdAt: z.date(),
  fetchedAt: z.date(),
});

export const PainPointSchema = z.object({
  id: z.string().uuid(),
  trendId: z.string().uuid(),
  patternPhrase: z.string().min(1).max(500),
  matchCount: z.number().int().positive(),
  intensity: z.number().min(0).max(1),
  lastSeen: z.date(),
  createdAt: z.date(),
});

export const OpportunityIdeaSchema = z.object({
  type: z.enum(['startup', 'saas', 'content', 'product']),
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(2000),
  targetAudience: z.string().min(1).max(500),
  difficulty: z.enum(['low', 'medium', 'high']),
  potentialMarketSize: z.string().optional(),
});

export const CreateTrendInputSchema = z.object({
  title: z.string().min(1).max(500),
  summary: z.string().min(10).max(5000),
  opportunityScore: z.number().min(0).max(100),
  velocityScore: z.number().min(0).max(1),
  problemIntensity: z.number().min(0).max(1),
  noveltyScore: z.number().min(0).max(1),
  discussionCount: z.number().int().nonnegative(),
  sourceCount: z.number().int().nonnegative(),
  status: z.enum(['emerging', 'growing', 'peak', 'declining', 'stable']).default('emerging'),
  category: z.string().optional(),
  suggestedIdeas: z.array(z.string()).default([]),
});

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
});

export const LimitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export const TrendsListQuerySchema = z.object({
  stage: z.string().min(1).max(64).optional(),
  status: z.string().min(1).max(64).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  sortBy: z.enum(["score", "date", "velocity", "volume"]).default("score"),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
  userId: z.string().min(1).max(128).optional(),
});

export const SavedTrendsQuerySchema = z.object({
  userId: z.string().min(1).max(128),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const SaveTrendInputSchema = z.object({
  userId: z.string().min(1).max(128),
  trendId: z.string().min(1).max(128),
});

export const UserPreferencesSchema = z.object({
  preferredStages: z.array(z.string().min(1).max(64)).max(10).default([]),
  minOpportunityScore: z.number().min(0).max(100).default(0),
  digestCadence: z.enum(["off", "daily", "weekly"]).default("off"),
});

export const UserPreferencesQuerySchema = z.object({
  userId: z.string().min(1).max(128),
});

export const UpsertUserPreferencesInputSchema = z.object({
  userId: z.string().min(1).max(128),
  preferences: UserPreferencesSchema,
});

export const AlertChannelSchema = z.enum(["in_app", "webhook"]);

export const AlertRuleSchema = z.object({
  minOpportunityScore: z.number().min(0).max(100).default(70),
  stages: z.array(z.string().min(1).max(64)).max(10).default([]),
  keywords: z.array(z.string().min(1).max(128)).max(20).default([]),
});

export const AlertsListQuerySchema = z.object({
  userId: z.string().min(1).max(128),
  enabledOnly: z.coerce.boolean().default(false),
});

export const CreateAlertInputSchema = z.object({
  userId: z.string().min(1).max(128),
  name: z.string().min(1).max(120),
  rule: AlertRuleSchema,
  channel: AlertChannelSchema.default("in_app"),
  webhookUrl: z.string().url().optional(),
  enabled: z.boolean().default(true),
});

export const UpdateAlertParamsSchema = z.object({
  id: z.string().min(1).max(128),
});

export const UpdateAlertInputSchema = z.object({
  userId: z.string().min(1).max(128),
  name: z.string().min(1).max(120).optional(),
  rule: AlertRuleSchema.optional(),
  channel: AlertChannelSchema.optional(),
  webhookUrl: z.string().url().optional(),
  enabled: z.boolean().optional(),
});

export const DeleteAlertQuerySchema = z.object({
  userId: z.string().min(1).max(128),
});

export const EvaluateAlertsQuerySchema = z.object({
  userId: z.string().min(1).max(128),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const RemoveSavedTrendParamsSchema = z.object({
  trendId: z.string().min(1).max(128),
});

export const RemoveSavedTrendQuerySchema = z.object({
  userId: z.string().min(1).max(128),
});

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export const SearchSuggestionsQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const ApiMetaSchema = z.record(z.unknown());

export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
  timestamp: z.string().datetime(),
  traceId: z.string().min(1).optional(),
});

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
});

export const createApiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: ApiMetaSchema.optional(),
  });

export type User = z.infer<typeof UserSchema>;
export type Trend = z.infer<typeof TrendSchema>;
export type Discussion = z.infer<typeof DiscussionSchema>;
export type PainPoint = z.infer<typeof PainPointSchema>;
export type OpportunityIdea = z.infer<typeof OpportunityIdeaSchema>;
export type CreateTrendInput = z.infer<typeof CreateTrendInputSchema>;
export type CursorPagination = z.infer<typeof CursorPaginationSchema>;
export type SavedTrendsQuery = z.infer<typeof SavedTrendsQuerySchema>;
export type SaveTrendInput = z.infer<typeof SaveTrendInputSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type UpsertUserPreferencesInput = z.infer<typeof UpsertUserPreferencesInputSchema>;
export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type CreateAlertInput = z.infer<typeof CreateAlertInputSchema>;
export type UpdateAlertInput = z.infer<typeof UpdateAlertInputSchema>;
export type ApiErrorPayload = z.infer<typeof ApiErrorSchema>;
