import { FastifyInstance } from "fastify";
import {
  UserPreferencesQuerySchema,
  UpsertUserPreferencesInputSchema,
} from "@packages/types";
import { userPreferenceService } from "../services/user-preference.service";
import { errorResponse, successResponse } from "../utils/api-response";

export default async function usersRoutes(app: FastifyInstance) {
  // GET /api/users/preferences?userId=...
  app.get("/preferences", async (request, reply) => {
    const parsed = UserPreferencesQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorResponse(request, "Invalid query parameters", "INVALID_QUERY_PARAMETERS", parsed.error.flatten());
    }

    const prefs = await userPreferenceService.getPreferences(parsed.data.userId);
    if (!prefs) {
      reply.code(404);
      return errorResponse(request, "User not found", "USER_NOT_FOUND");
    }

    return successResponse(prefs);
  });

  // PUT /api/users/preferences
  app.put("/preferences", async (request, reply) => {
    const parsed = UpsertUserPreferencesInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorResponse(request, "Invalid request body", "INVALID_REQUEST_BODY", parsed.error.flatten());
    }

    const { userId, preferences } = parsed.data;
    const updated = await userPreferenceService.upsertPreferences(userId, preferences);

    if (!updated) {
      reply.code(404);
      return errorResponse(request, "User not found", "USER_NOT_FOUND");
    }

    return successResponse(updated);
  });
}
