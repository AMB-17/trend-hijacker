import { FastifyInstance } from "fastify";
import {
  CreateCollectionSchema,
  UpdateCollectionSchema,
  CreateCollectionItemSchema,
  UpdateCollectionItemSchema,
  CreateCollectionCommentSchema,
} from "@trend-hijacker/types";
import { CollectionService } from "../services/collection.service";
import { WorkspaceService } from "../services/workspace.service";
import { errorResponse, successResponse } from "../utils/api-response";

/**
 * Collection Management Routes
 */
export default async function collectionsRoutes(app: FastifyInstance) {
  // Get collections in workspace
  app.get("/", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { workspaceId, page, limit } = request.query as {
        workspaceId: string;
        page?: string;
        limit?: string;
      };

      if (!workspaceId) {
        reply.code(400);
        return errorResponse(request, "workspaceId is required", "MISSING_PARAMETER");
      }

      // Check if user is member of workspace
      const canView = await WorkspaceService.checkPermission(
        workspaceId,
        userId,
        "view_activity"
      );

      if (!canView) {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }

      const collections = await CollectionService.getWorkspaceCollections(
        workspaceId,
        userId,
        { page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 }
      );

      return successResponse(collections);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Create collection
  app.post("/", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { workspaceId, ...data } = request.body as any;

      if (!workspaceId) {
        reply.code(400);
        return errorResponse(request, "workspaceId is required", "MISSING_PARAMETER");
      }

      const parsed = CreateCollectionSchema.safeParse({ ...data, workspaceId });
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      const collection = await CollectionService.createCollection(
        workspaceId,
        userId,
        parsed.data
      );

      reply.code(201);
      return successResponse(collection);
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Get collection by ID
  app.get("/:collectionId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { collectionId } = request.params as { collectionId: string };
      const collection = await CollectionService.getCollection(collectionId, userId);

      if (!collection) {
        reply.code(404);
        return errorResponse(request, "Collection not found", "COLLECTION_NOT_FOUND");
      }

      return successResponse(collection);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Update collection
  app.put("/:collectionId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { collectionId } = request.params as { collectionId: string };
      const parsed = UpdateCollectionSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      const collection = await CollectionService.updateCollection(
        collectionId,
        userId,
        parsed.data
      );

      return successResponse(collection);
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }
      if (error.message === "Collection not found") {
        reply.code(404);
        return errorResponse(request, "Collection not found", "COLLECTION_NOT_FOUND");
      }
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Delete collection
  app.delete("/:collectionId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { collectionId } = request.params as { collectionId: string };
      await CollectionService.deleteCollection(collectionId, userId);

      return successResponse({ id: collectionId, deleted: true });
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }
      if (error.message === "Collection not found") {
        reply.code(404);
        return errorResponse(request, "Collection not found", "COLLECTION_NOT_FOUND");
      }
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Add trend to collection
  app.post("/:collectionId/items", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { collectionId } = request.params as { collectionId: string };
      const parsed = CreateCollectionItemSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      const item = await CollectionService.addItem(
        collectionId,
        userId,
        parsed.data
      );

      reply.code(201);
      return successResponse(item);
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }
      if (error.message === "Collection not found") {
        reply.code(404);
        return errorResponse(request, "Collection not found", "COLLECTION_NOT_FOUND");
      }
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Update collection item
  app.put("/:collectionId/items/:itemId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { itemId } = request.params as { itemId: string };
      const parsed = UpdateCollectionItemSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      const item = await CollectionService.updateItem(itemId, userId, parsed.data);
      return successResponse(item);
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }
      if (error.message === "Item not found") {
        reply.code(404);
        return errorResponse(request, "Item not found", "ITEM_NOT_FOUND");
      }
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Remove item from collection
  app.delete("/:collectionId/items/:itemId", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { collectionId, itemId } = request.params as {
        collectionId: string;
        itemId: string;
      };

      await CollectionService.removeItem(collectionId, itemId, userId);
      return successResponse({ id: itemId, deleted: true });
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }
      if (error.message === "Item not found") {
        reply.code(404);
        return errorResponse(request, "Item not found", "ITEM_NOT_FOUND");
      }
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Add comment to collection
  app.post("/:collectionId/comments", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { collectionId } = request.params as { collectionId: string };
      const parsed = CreateCollectionCommentSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return errorResponse(
          request,
          "Invalid request body",
          "INVALID_REQUEST_BODY",
          parsed.error.flatten()
        );
      }

      const comment = await CollectionService.addComment(
        collectionId,
        userId,
        parsed.data
      );

      reply.code(201);
      return successResponse(comment);
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }
      if (error.message === "Collection not found") {
        reply.code(404);
        return errorResponse(request, "Collection not found", "COLLECTION_NOT_FOUND");
      }
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Get collection comments
  app.get("/:collectionId/comments", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { collectionId } = request.params as { collectionId: string };

      const comments = await CollectionService.getComments(collectionId);
      return successResponse(comments);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Generate public share link
  app.post("/:collectionId/share-link", async (request, reply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        reply.code(401);
        return errorResponse(request, "Unauthorized", "UNAUTHORIZED");
      }

      const { collectionId } = request.params as { collectionId: string };
      const shareLink = await CollectionService.generateShareLink(
        collectionId,
        userId
      );

      return successResponse({ shareLink });
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        reply.code(403);
        return errorResponse(request, "Forbidden", "FORBIDDEN");
      }
      if (error.message === "Collection not found") {
        reply.code(404);
        return errorResponse(request, "Collection not found", "COLLECTION_NOT_FOUND");
      }
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });

  // Get public collection by share token
  app.get("/share/:shareToken", async (request, reply) => {
    try {
      const { shareToken } = request.params as { shareToken: string };

      const collection = await CollectionService.getPublicCollection(shareToken);

      if (!collection) {
        reply.code(404);
        return errorResponse(request, "Collection not found", "COLLECTION_NOT_FOUND");
      }

      return successResponse(collection);
    } catch (error) {
      reply.code(500);
      return errorResponse(request, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });
}
