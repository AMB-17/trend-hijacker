import { prisma } from "@packages/database";
import { type AlertRule } from "@packages/types";

type AlertChannel = "in_app" | "webhook";

export interface AlertView {
  id: string;
  userId: string;
  name: string;
  rule: AlertRule;
  channel: AlertChannel;
  webhookUrl?: string;
  enabled: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEvaluationResult {
  alertId: string;
  matchedTrendIds: string[];
  matchedCount: number;
}

function toAlertView(alert: {
  id: string;
  userId: string;
  name: string;
  minOpportunityScore: number;
  stages: string[];
  keywords: string[];
  channel: string;
  webhookUrl: string | null;
  enabled: boolean;
  lastTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AlertView {
  return {
    id: alert.id,
    userId: alert.userId,
    name: alert.name,
    rule: {
      minOpportunityScore: alert.minOpportunityScore,
      stages: alert.stages,
      keywords: alert.keywords,
    },
    channel: alert.channel as AlertChannel,
    webhookUrl: alert.webhookUrl ?? undefined,
    enabled: alert.enabled,
    lastTriggeredAt: alert.lastTriggeredAt?.toISOString(),
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString(),
  };
}

export class AlertService {
  async listAlerts(userId: string, enabledOnly = false): Promise<AlertView[]> {
    const alerts = await prisma.alert.findMany({
      where: {
        userId,
        ...(enabledOnly ? { enabled: true } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return alerts.map(toAlertView);
  }

  async createAlert(input: {
    userId: string;
    name: string;
    rule: AlertRule;
    channel: AlertChannel;
    webhookUrl?: string;
    enabled: boolean;
  }): Promise<AlertView | null> {
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } });
    if (!user) {
      return null;
    }

    const created = await prisma.alert.create({
      data: {
        userId: input.userId,
        name: input.name,
        minOpportunityScore: input.rule.minOpportunityScore,
        stages: input.rule.stages,
        keywords: input.rule.keywords,
        channel: input.channel,
        webhookUrl: input.webhookUrl,
        enabled: input.enabled,
      },
    });

    return toAlertView(created);
  }

  async updateAlert(
    id: string,
    input: {
      userId: string;
      name?: string;
      rule?: AlertRule;
      channel?: AlertChannel;
      webhookUrl?: string;
      enabled?: boolean;
    }
  ): Promise<AlertView | null> {
    const current = await prisma.alert.findFirst({
      where: { id, userId: input.userId },
    });

    if (!current) {
      return null;
    }

    const updated = await prisma.alert.update({
      where: { id: current.id },
      data: {
        ...(typeof input.name === "string" ? { name: input.name } : {}),
        ...(input.rule
          ? {
              minOpportunityScore: input.rule.minOpportunityScore,
              stages: input.rule.stages,
              keywords: input.rule.keywords,
            }
          : {}),
        ...(input.channel ? { channel: input.channel } : {}),
        ...(input.webhookUrl !== undefined ? { webhookUrl: input.webhookUrl } : {}),
        ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
      },
    });

    return toAlertView(updated);
  }

  async deleteAlert(id: string, userId: string): Promise<boolean> {
    const deleted = await prisma.alert.deleteMany({
      where: { id, userId },
    });

    return deleted.count > 0;
  }

  async evaluateAlerts(userId: string, limit = 20): Promise<AlertEvaluationResult[]> {
    const [alerts, trends] = await Promise.all([
      prisma.alert.findMany({
        where: { userId, enabled: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.trend.findMany({
        where: {
          status: { in: ["EMERGING", "ACTIVE", "EXPLODING"] },
        },
        select: {
          id: true,
          opportunityScore: true,
          stage: true,
          keywords: true,
        },
        take: limit,
        orderBy: { opportunityScore: "desc" },
      }),
    ]);

    const results: AlertEvaluationResult[] = [];

    for (const alert of alerts) {
      const matchedTrendIds = trends
        .filter((trend: { opportunityScore: number; stage: string; keywords: string[] }) => {
          if (trend.opportunityScore < alert.minOpportunityScore) {
            return false;
          }

          if (alert.stages.length > 0 && !alert.stages.includes(trend.stage)) {
            return false;
          }

          if (alert.keywords.length > 0) {
            const trendKeywords = trend.keywords.map(k => k.toLowerCase());
            const hasKeywordMatch = alert.keywords.some((k: string) => trendKeywords.includes(k.toLowerCase()));
            if (!hasKeywordMatch) {
              return false;
            }
          }

          return true;
        })
        .map((trend: { id: string }) => trend.id);

      if (matchedTrendIds.length > 0) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: new Date() },
        });
      }

      results.push({
        alertId: alert.id,
        matchedTrendIds,
        matchedCount: matchedTrendIds.length,
      });
    }

    return results;
  }
}

export const alertService = new AlertService();
