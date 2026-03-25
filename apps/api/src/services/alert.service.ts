import { prisma } from "@packages/database";
import { type AlertRule } from "@packages/types";
import { logger } from "@packages/utils";

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

export interface AlertEvaluationSummary {
  usersEvaluated: number;
  alertsEvaluated: number;
  alertsTriggered: number;
  webhookDeliveries: number;
  results: Array<{
    userId: string;
    evaluations: AlertEvaluationResult[];
  }>;
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
  private async deliverWebhook(
    webhookUrl: string,
    payload: {
      alertId: string;
      userId: string;
      matchedTrendIds: string[];
      matchedCount: number;
      triggeredAt: string;
    }
  ): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      return response.ok;
    } catch (error) {
      logger.error("[AlertService] Webhook delivery failed", {
        webhookUrl,
        alertId: payload.alertId,
        error,
      });
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

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

  async evaluateAlerts(userId: string, limit = 20, deliverWebhooks = false): Promise<AlertEvaluationResult[]> {
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

        if (deliverWebhooks && alert.channel === "webhook" && alert.webhookUrl) {
          await this.deliverWebhook(alert.webhookUrl, {
            alertId: alert.id,
            userId,
            matchedTrendIds,
            matchedCount: matchedTrendIds.length,
            triggeredAt: new Date().toISOString(),
          });
        }
      }

      results.push({
        alertId: alert.id,
        matchedTrendIds,
        matchedCount: matchedTrendIds.length,
      });
    }

    return results;
  }

  async evaluateAllAlerts(limit = 20, deliverWebhooks = false): Promise<AlertEvaluationSummary> {
    const users = await prisma.user.findMany({
      where: {
        alerts: {
          some: {
            enabled: true,
          },
        },
      },
      select: {
        id: true,
      },
    });

    const summary: AlertEvaluationSummary = {
      usersEvaluated: users.length,
      alertsEvaluated: 0,
      alertsTriggered: 0,
      webhookDeliveries: 0,
      results: [],
    };

    for (const user of users) {
      const evaluations = await this.evaluateAlerts(user.id, limit, deliverWebhooks);

      const webhookAlertIds = deliverWebhooks
        ? new Set(
            (
              await prisma.alert.findMany({
                where: { userId: user.id, enabled: true, channel: "webhook" },
                select: { id: true },
              })
            ).map((item: { id: string }) => item.id)
          )
        : new Set<string>();

      const triggeredForUser = evaluations.filter(item => item.matchedCount > 0).length;
      const webhookDeliveriesForUser = evaluations.filter(
        item => item.matchedCount > 0 && webhookAlertIds.has(item.alertId)
      ).length;

      summary.alertsEvaluated += evaluations.length;
      summary.alertsTriggered += triggeredForUser;
      if (deliverWebhooks) {
        summary.webhookDeliveries += webhookDeliveriesForUser;
      }
      summary.results.push({
        userId: user.id,
        evaluations,
      });
    }

    return summary;
  }
}

export const alertService = new AlertService();
