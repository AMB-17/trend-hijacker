import { FastifyInstance } from "fastify";
import {
  AlertsListQuerySchema,
  CreateAlertInputSchema,
  UpdateAlertParamsSchema,
  UpdateAlertInputSchema,
  DeleteAlertQuerySchema,
  EvaluateAlertsQuerySchema,
} from "@packages/types";
import { alertService } from "../services/alert.service";

export default async function alertsRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    const parsed = AlertsListQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return {
        success: false,
        error: {
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
      };
    }

    const data = await alertService.listAlerts(parsed.data.userId, parsed.data.enabledOnly);
    return { success: true, data };
  });

  app.post("/", async (request, reply) => {
    const parsed = CreateAlertInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return {
        success: false,
        error: {
          message: "Invalid request body",
          details: parsed.error.flatten(),
        },
      };
    }

    const created = await alertService.createAlert(parsed.data);
    if (!created) {
      reply.code(404);
      return {
        success: false,
        error: { message: "User not found" },
      };
    }

    reply.code(201);
    return { success: true, data: created };
  });

  app.put("/:id", async (request, reply) => {
    const parsedParams = UpdateAlertParamsSchema.safeParse(request.params ?? {});
    const parsedBody = UpdateAlertInputSchema.safeParse(request.body ?? {});

    if (!parsedParams.success || !parsedBody.success) {
      reply.code(400);
      return {
        success: false,
        error: {
          message: "Invalid request",
          details: {
            params: parsedParams.success ? undefined : parsedParams.error.flatten(),
            body: parsedBody.success ? undefined : parsedBody.error.flatten(),
          },
        },
      };
    }

    const updated = await alertService.updateAlert(parsedParams.data.id, parsedBody.data);
    if (!updated) {
      reply.code(404);
      return {
        success: false,
        error: { message: "Alert not found" },
      };
    }

    return { success: true, data: updated };
  });

  app.delete("/:id", async (request, reply) => {
    const parsedParams = UpdateAlertParamsSchema.safeParse(request.params ?? {});
    const parsedQuery = DeleteAlertQuerySchema.safeParse(request.query ?? {});

    if (!parsedParams.success || !parsedQuery.success) {
      reply.code(400);
      return {
        success: false,
        error: {
          message: "Invalid request",
          details: {
            params: parsedParams.success ? undefined : parsedParams.error.flatten(),
            query: parsedQuery.success ? undefined : parsedQuery.error.flatten(),
          },
        },
      };
    }

    const deleted = await alertService.deleteAlert(parsedParams.data.id, parsedQuery.data.userId);
    if (!deleted) {
      reply.code(404);
      return {
        success: false,
        error: { message: "Alert not found" },
      };
    }

    return {
      success: true,
      data: {
        id: parsedParams.data.id,
        deleted: true,
      },
    };
  });

  app.get("/evaluate", async (request, reply) => {
    const parsed = EvaluateAlertsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return {
        success: false,
        error: {
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
      };
    }

    const data = await alertService.evaluateAlerts(parsed.data.userId, parsed.data.limit);
    return {
      success: true,
      data,
      meta: {
        evaluated: data.length,
      },
    };
  });
}
