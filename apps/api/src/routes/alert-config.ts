import { FastifyInstance } from "fastify";
import { prisma } from "@trend-hijacker/database";
import {
  AlertConfigSchema,
  UpdateAlertConfigSchema,
  AlertRuleSchema,
  UpdateAlertRuleSchema,
  SendTestAlertSchema,
  AlertHistoryQuerySchema,
} from "@trend-hijacker/types";
import { multiChannelAlertService } from "../services/alert.service";
import { errorResponse, successResponse } from "../utils/api-response";

/**
 * Alert Configuration & Management Routes
 */
export default async function alertConfigRoutes(app: FastifyInstance) {
  // Get alert configuration for current user
  app.get("/config", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const config = await multiChannelAlertService.getAlertConfig(userId);
      return successResponse(config);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Update alert configuration
  app.put("/config", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const parsed = UpdateAlertConfigSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      const config = await multiChannelAlertService.updateAlertConfig(
        userId,
        parsed.data
      );
      return successResponse(config);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Create alert rule
  app.post("/rules", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const parsed = AlertRuleSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      // Verify user owns this config
      const config = await multiChannelAlertService.getAlertConfig(userId);
      if (parsed.data.configId !== config.id) {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }

      const rule = await multiChannelAlertService.createAlertRule(
        userId,
        parsed.data.configId,
        parsed.data
      );

      reply.code(201);
      return successResponse(rule);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Update alert rule
  app.put("/rules/:ruleId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { ruleId } = request.params as { ruleId: string };
      const parsed = UpdateAlertRuleSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      // Verify rule belongs to user
      const config = await multiChannelAlertService.getAlertConfig(userId);
      const ruleExists = config.rules.some((r: any) => r.id === ruleId);
      if (!ruleExists) {
        reply.code(404);
        return errorResponse(request, "Rule not found", "RULE_NOT_FOUND");
      }

      const rule = await prisma.alertRule.update({
        where: { id: ruleId },
        data: parsed.data,
      });

      return successResponse(rule);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Delete alert rule
  app.delete("/rules/:ruleId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { ruleId } = request.params as { ruleId: string };

      // Verify rule belongs to user
      const config = await multiChannelAlertService.getAlertConfig(userId);
      const ruleExists = config.rules.some((r: any) => r.id === ruleId);
      if (!ruleExists) {
        reply.code(404);
        return errorResponse(request, "Rule not found", "RULE_NOT_FOUND");
      }

      await prisma.alertRule.delete({
        where: { id: ruleId },
      });

      return successResponse({ id: ruleId, deleted: true });
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Get alert history
  app.get("/history", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const parsed = AlertHistoryQuerySchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid query parameters",
          "INVALID_QUERY_PARAMETERS",
          parsed.error.flatten()
        );
      }

      const history = await multiChannelAlertService.getAlertHistory(
        userId,
        parsed.data
      );
      return successResponse(history);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Send test alert
  app.post("/send-test", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const parsed = SendTestAlertSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      const result = await multiChannelAlertService.sendTestAlert(
        userId,
        parsed.data.channel
      );

      if (!result.success) {
        reply.code(400);
        return errorResponse(
          request,
          result.error || "Failed to send test alert",
          "TEST_ALERT_FAILED"
        );
      }

      return successResponse({ sent: true, channel: parsed.data.channel });
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });
}
