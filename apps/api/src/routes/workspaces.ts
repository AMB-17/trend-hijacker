import { FastifyInstance } from "fastify";
import { prisma } from "@trend-hijacker/database";
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  WorkspaceQuerySchema,
  InviteWorkspaceMemberSchema,
  UpdateWorkspaceMemberSchema,
  ActivityLogQuerySchema,
} from "@trend-hijacker/types";
import { WorkspaceService } from "../services/workspace.service";
import { errorResponse, successResponse } from "../utils/api-response";

/**
 * Workspace Management Routes
 */
export default async function workspacesRoutes(app: FastifyInstance) {
  // Get all workspaces for user
  app.get("/", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const parsed = WorkspaceQuerySchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid query parameters",
          "INVALID_QUERY_PARAMETERS",
          parsed.error.flatten()
        );
      }

      const workspaces = await WorkspaceService.getUserWorkspaces(userId);
      return successResponse(workspaces);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Create workspace
  app.post("/", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const parsed = CreateWorkspaceSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      const workspace = await WorkspaceService.createWorkspace(userId, parsed.data);
      reply.code(201);
      return successResponse(workspace);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Get workspace by ID
  app.get("/:workspaceId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { workspaceId } = request.params as { workspaceId: string };
      const workspace = await WorkspaceService.getWorkspace(workspaceId, userId);

      if (!workspace) {
        reply.code(404);
        return errorResponse(request, "Workspace not found", "WORKSPACE_NOT_FOUND");
      }

      return successResponse(workspace);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Update workspace
  app.put("/:workspaceId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { workspaceId } = request.params as { workspaceId: string };
      const parsed = UpdateWorkspaceSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      const workspace = await WorkspaceService.updateWorkspace(
        workspaceId,
        userId,
        parsed.data
      );
      return successResponse(workspace);
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Delete workspace
  app.delete("/:workspaceId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { workspaceId } = request.params as { workspaceId: string };
      await WorkspaceService.deleteWorkspace(workspaceId, userId);
      return successResponse({ id: workspaceId, deleted: true });
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Get workspace members
  app.get("/:workspaceId/members", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { workspaceId } = request.params as { workspaceId: string };

      // Check if user is member
      const workspace = await WorkspaceService.getWorkspace(workspaceId, userId);
      if (!workspace) {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }

      const members = await WorkspaceService.getMembers(workspaceId);
      return successResponse(members);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Invite member to workspace
  app.post("/:workspaceId/members", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { workspaceId } = request.params as { workspaceId: string };
      const parsed = InviteWorkspaceMemberSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      // Check if user is admin
      const workspace = await WorkspaceService.getWorkspace(workspaceId, userId);
      if (!workspace) {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }

      // Find invited user by email
      const invitedUser = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });

      if (!invitedUser) {
        reply.code(404);
        return errorResponse(request, "User not found", "USER_NOT_FOUND");
      }

      const member = await WorkspaceService.addMember(
        workspaceId,
        invitedUser.id,
        parsed.data.role,
        userId
      );

      reply.code(201);
      return successResponse(member);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Update member role
  app.put("/:workspaceId/members/:memberId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { workspaceId, memberId } = request.params as {
        workspaceId: string;
        memberId: string;
      };
      const parsed = UpdateWorkspaceMemberSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      // Check if user is admin
      const canManage = await WorkspaceService.checkPermission(
        workspaceId,
        userId,
        "manage_members"
      );

      if (!canManage) {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }

      const member = await WorkspaceService.updateMemberRole(
        workspaceId,
        memberId,
        parsed.data.role,
        userId
      );

      return successResponse(member);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Remove member from workspace
  app.delete("/:workspaceId/members/:memberId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { workspaceId, memberId } = request.params as {
        workspaceId: string;
        memberId: string;
      };

      // Check if user is admin
      const canManage = await WorkspaceService.checkPermission(
        workspaceId,
        userId,
        "manage_members"
      );

      if (!canManage) {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }

      await WorkspaceService.removeMember(workspaceId, memberId, userId);
      return successResponse({ id: memberId, deleted: true });
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Get activity log
  app.get("/:workspaceId/activity", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { workspaceId } = request.params as { workspaceId: string };

      // Check if user can view activity
      const canView = await WorkspaceService.checkPermission(
        workspaceId,
        userId,
        "view_activity"
      );

      if (!canView) {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }

      const parsed = ActivityLogQuerySchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid query parameters",
          "INVALID_QUERY_PARAMETERS",
          parsed.error.flatten()
        );
      }

      const activity = await WorkspaceService.getActivityLog(workspaceId, parsed.data);
      return successResponse(activity);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });
}
