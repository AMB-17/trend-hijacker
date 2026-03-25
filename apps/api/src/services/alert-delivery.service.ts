import { prisma } from "@trend-hijacker/database";
import {
  EmailPayload,
  SlackPayload,
  WebhookPayload,
  AlertDeliveryStatus,
} from "@trend-hijacker/types";
import { logger } from "@trend-hijacker/utils";

/**
 * Alert Delivery Service
 * Handles sending notifications via email, Slack, and webhooks
 */

export class AlertDeliveryService {
  /**
   * Send email notification
   */
  static async sendEmail(payload: EmailPayload): Promise<{
    success: boolean;
    externalId?: string;
    error?: string;
  }> {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error("RESEND_API_KEY not configured");
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: payload.from || process.env.ALERT_FROM_EMAIL || "noreply@trendhijacker.com",
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          reply_to: payload.replyTo,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Email API error: ${error}`);
      }

      const data = await response.json() as { id?: string; email?: string };
      return {
        success: true,
        externalId: data.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Email delivery failed", { error: errorMessage, payload });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send Slack notification
   */
  static async sendSlack(payload: SlackPayload): Promise<{
    success: boolean;
    externalId?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(payload.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blocks: payload.blocks,
          text: payload.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Slack API error: ${error}`);
      }

      return {
        success: true,
        externalId: `slack-${Date.now()}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Slack delivery failed", { error: errorMessage, payload });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send custom webhook notification
   */
  static async sendWebhook(payload: WebhookPayload): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(payload.url, {
        method: payload.method,
        headers: {
          "Content-Type": "application/json",
          ...payload.headers,
        },
        body: JSON.stringify(payload.body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Webhook error: ${error}`);
      }

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Webhook delivery failed", { error: errorMessage, payload });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create alert history record and send notification
   */
  static async createAndSendAlert(params: {
    userId: string;
    configId: string;
    subject: string;
    message: string;
    channel: "email" | "slack" | "webhook" | "in_app";
    trendId?: string;
    trendsData?: Record<string, any>;
  }): Promise<{ success: boolean; historyId: string; error?: string }> {
    try {
      const history = await prisma.alertHistory.create({
        data: {
          userId: params.userId,
          configId: params.configId,
          subject: params.subject,
          message: params.message,
          channel: params.channel,
          trendId: params.trendId,
          trendsData: params.trendsData,
          status: "PENDING",
        },
      });

      // Get user info for email
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Send based on channel
      let deliveryResult;
      if (params.channel === "email" && user.email) {
        deliveryResult = await this.sendEmail({
          to: user.email,
          subject: params.subject,
          html: params.message,
        });
      } else if (params.channel === "slack") {
        const config = await prisma.alertConfig.findUnique({
          where: { id: params.configId },
        });

        if (!config?.slackWebhookUrl) {
          throw new Error("Slack webhook URL not configured");
        }

        deliveryResult = await this.sendSlack({
          webhookUrl: config.slackWebhookUrl,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*${params.subject}*\n\n${params.message}`,
              },
            },
          ],
          text: params.subject,
        });
      } else if (params.channel === "webhook") {
        const config = await prisma.alertConfig.findUnique({
          where: { id: params.configId },
        });

        if (!config?.webhookUrl) {
          throw new Error("Webhook URL not configured");
        }

        deliveryResult = await this.sendWebhook({
          url: config.webhookUrl,
          method: "POST",
          body: {
            type: params.channel,
            subject: params.subject,
            message: params.message,
            trendId: params.trendId,
            timestamp: new Date(),
          },
        });
      } else {
        // In-app notification - just mark as delivered
        deliveryResult = { success: true };
      }

      // Create delivery record
      if (deliveryResult.success) {
        await prisma.alertDelivery.create({
          data: {
            historyId: history.id,
            channel: params.channel,
            recipient:
              params.channel === "email"
                ? user.email
                : params.channel === "slack"
                  ? (await prisma.alertConfig.findUnique({
                      where: { id: params.configId },
                    }))?.slackWebhookUrl || ""
                  : (await prisma.alertConfig.findUnique({
                      where: { id: params.configId },
                    }))?.webhookUrl || "",
            status: "DELIVERED",
            externalId: deliveryResult.externalId,
            deliveredAt: new Date(),
          },
        });

        await prisma.alertHistory.update({
          where: { id: history.id },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
          },
        });
      } else {
        await prisma.alertDelivery.create({
          data: {
            historyId: history.id,
            channel: params.channel,
            recipient: "",
            status: "FAILED",
            failureReason: deliveryResult.error,
          },
        });

        await prisma.alertHistory.update({
          where: { id: history.id },
          data: {
            status: "FAILED",
            failureReason: deliveryResult.error,
            nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // Retry in 5 minutes
          },
        });
      }

      return {
        success: deliveryResult.success,
        historyId: history.id,
        error: deliveryResult.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Failed to create and send alert", { error: errorMessage });
      throw error;
    }
  }

  /**
   * Retry failed alert deliveries
   */
  static async retryFailedDeliveries(maxRetries = 3): Promise<{
    retriedCount: number;
    successCount: number;
  }> {
    try {
      const failedAlerts = await prisma.alertHistory.findMany({
        where: {
          status: "FAILED",
          retryCount: { lt: maxRetries },
          nextRetryAt: { lte: new Date() },
        },
        take: 100,
      });

      let successCount = 0;

      for (const alert of failedAlerts) {
        try {
          const config = await prisma.alertConfig.findUnique({
            where: { id: alert.configId },
          });

          if (!config) continue;

          let deliveryResult;
          if (alert.channel === "email") {
            const user = await prisma.user.findUnique({
              where: { id: alert.userId },
            });
            if (!user?.email) continue;

            deliveryResult = await this.sendEmail({
              to: user.email,
              subject: alert.subject,
              html: alert.message,
            });
          } else if (alert.channel === "slack" && config.slackWebhookUrl) {
            deliveryResult = await this.sendSlack({
              webhookUrl: config.slackWebhookUrl,
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*${alert.subject}*\n\n${alert.message}`,
                  },
                },
              ],
              text: alert.subject,
            });
          } else if (alert.channel === "webhook" && config.webhookUrl) {
            deliveryResult = await this.sendWebhook({
              url: config.webhookUrl,
              method: "POST",
              body: {
                type: alert.channel,
                subject: alert.subject,
                message: alert.message,
                trendId: alert.trendId,
                timestamp: alert.createdAt,
              },
            });
          } else {
            continue;
          }

          if (deliveryResult.success) {
            await prisma.alertHistory.update({
              where: { id: alert.id },
              data: {
                status: "DELIVERED",
                deliveredAt: new Date(),
              },
            });
            successCount++;
          } else {
            await prisma.alertHistory.update({
              where: { id: alert.id },
              data: {
                retryCount: { increment: 1 },
                nextRetryAt: new Date(
                  Date.now() + Math.pow(2, alert.retryCount + 1) * 60 * 1000
                ), // Exponential backoff
              },
            });
          }
        } catch (error) {
          logger.error("Failed to retry alert", { alertId: alert.id, error });
        }
      }

      return {
        retriedCount: failedAlerts.length,
        successCount,
      };
    } catch (error) {
      logger.error("Failed to retry alert deliveries", { error });
      throw error;
    }
  }

  /**
   * Generate HTML email template for alert
   */
  static generateAlertEmailTemplate(params: {
    subject: string;
    trendTitle?: string;
    opportunityScore?: number;
    velocityGrowth?: number;
    summary?: string;
    link?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; border-radius: 4px; }
            .content { padding: 20px 0; }
            .trend-card { border: 1px solid #ddd; padding: 15px; border-radius: 4px; margin: 10px 0; }
            .score { background-color: #e8f5e9; padding: 10px; border-radius: 4px; margin: 10px 0; }
            .footer { color: #999; font-size: 12px; text-align: center; margin-top: 20px; }
            .button { background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${params.subject}</h2>
              <p>New opportunity alert from Trend Hijacker</p>
            </div>
            
            <div class="content">
              ${
                params.trendTitle
                  ? `
                <div class="trend-card">
                  <h3>${params.trendTitle}</h3>
                  ${params.opportunityScore ? `<div class="score"><strong>Opportunity Score:</strong> ${params.opportunityScore.toFixed(1)}/100</div>` : ""}
                  ${params.velocityGrowth ? `<div class="score"><strong>Growth Velocity:</strong> ${(params.velocityGrowth * 100).toFixed(1)}%</div>` : ""}
                  ${params.summary ? `<p>${params.summary}</p>` : ""}
                  ${params.link ? `<p><a href="${params.link}" class="button">View Trend</a></p>` : ""}
                </div>
              `
                  : ""
              }
            </div>
            
            <div class="footer">
              <p>Trend Hijacker - Detect opportunities early</p>
              <p><a href="https://trendhijacker.com/alerts">Manage alerts</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate digest email template
   */
  static generateDigestEmailTemplate(params: {
    period: "daily" | "weekly";
    trends: Array<{ title: string; score: number; summary: string }>;
  }): string {
    const periodText = params.period === "daily" ? "Daily" : "Weekly";
    const trendRows = params.trends
      .slice(0, 5)
      .map(
        (trend) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${trend.title}</strong><br>
          <small style="color: #666;">${trend.summary}</small>
        </td>
        <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">
          <strong>${trend.score.toFixed(1)}</strong>
        </td>
      </tr>
    `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; }
            .footer { color: #999; font-size: 12px; text-align: center; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${periodText} Opportunity Digest</h2>
              <p>Top trending opportunities for ${new Date().toLocaleDateString()}</p>
            </div>
            
            <table>
              <thead>
                <tr style="background-color: #f4f4f4;">
                  <th style="text-align: left; padding: 10px;">Opportunity</th>
                  <th style="text-align: right; padding: 10px;">Score</th>
                </tr>
              </thead>
              <tbody>
                ${trendRows}
              </tbody>
            </table>
            
            <div class="footer">
              <p>Trend Hijacker - Detect opportunities early</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
