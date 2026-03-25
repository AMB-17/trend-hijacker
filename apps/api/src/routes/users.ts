import { FastifyInstance } from "fastify";
import {
  UserPreferencesQuerySchema,
  UpsertUserPreferencesInputSchema,
} from "@packages/types";
import { userPreferenceService } from "../services/user-preference.service";

export default async function usersRoutes(app: FastifyInstance) {
  // GET /api/users/preferences?userId=...
  app.get("/preferences", async (request, reply) => {
    const parsed = UserPreferencesQuerySchema.safeParse(request.query ?? {});
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

    const prefs = await userPreferenceService.getPreferences(parsed.data.userId);
    if (!prefs) {
      reply.code(404);
      return {
        success: false,
        error: {
          message: "User not found",
        },
      };
    }

    return {
      success: true,
      data: prefs,
    };
  });

  // PUT /api/users/preferences
  app.put("/preferences", async (request, reply) => {
    const parsed = UpsertUserPreferencesInputSchema.safeParse(request.body ?? {});
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

    const { userId, preferences } = parsed.data;
    const updated = await userPreferenceService.upsertPreferences(userId, preferences);

    if (!updated) {
      reply.code(404);
      return {
        success: false,
        error: {
          message: "User not found",
        },
      };
    }

    return {
      success: true,
      data: updated,
    };
  });
}
