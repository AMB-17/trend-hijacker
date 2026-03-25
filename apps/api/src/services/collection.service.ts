import { prisma } from "@trend-hijacker/database";
import {
  CreateCollection,
  UpdateCollection,
  CreateCollectionItem,
  UpdateCollectionItem,
  CreateCollectionComment,
} from "@trend-hijacker/types";
import { logger } from "@trend-hijacker/utils";
import crypto from "crypto";
import { WorkspaceService } from "./workspace.service";

/**
 * Collection Service
 * Manages trend collections and collaborative features
 */

export class CollectionService {
  /**
   * Create a new collection
   */
  static async createCollection(
    workspaceId: string,
    creatorId: string,
    data: CreateCollection
  ): Promise<any> {
    // Check permission
    const canCreate = await WorkspaceService.checkPermission(
      workspaceId,
      creatorId,
      "create_collection"
    );

    if (!canCreate) {
      throw new Error("Unauthorized");
    }

    const collection = await prisma.collection.create({
      data: {
        ...data,
        workspaceId,
        creatorId,
        shareToken: crypto.randomBytes(16).toString("hex"),
      },
    });

    // Log activity
    await WorkspaceService.logActivity({
      workspaceId,
      collectionId: collection.id,
      action: "COLLECTION_CREATED",
      description: `Collection "${collection.name}" created`,
      actorId: creatorId,
    });

    return collection;
  }

  /**
   * Get collection by ID
   */
  static async getCollection(
    collectionId: string,
    userId: string
  ): Promise<any> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        items: {
          include: {
            _count: {
              select: { comments: true },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });

    if (!collection) {
      return null;
    }

    // Check access
    if (!collection.isPublic) {
      const isMember = await WorkspaceService.checkPermission(
        collection.workspaceId,
        userId,
        "view_activity"
      );

      if (!isMember && collection.creatorId !== userId) {
        return null;
      }
    }

    return collection;
  }

  /**
   * Get collections in workspace
   */
  static async getWorkspaceCollections(
    workspaceId: string,
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<any> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.collection.findMany({
        where: { workspaceId },
        skip,
        take: limit,
        include: {
          _count: {
            select: { items: true, comments: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.collection.count({ where: { workspaceId } }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Update collection
   */
  static async updateCollection(
    collectionId: string,
    userId: string,
    data: UpdateCollection
  ): Promise<any> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Check permission
    const canEdit = await WorkspaceService.checkPermission(
      collection.workspaceId,
      userId,
      "edit_collection"
    );

    if (!canEdit && collection.creatorId !== userId) {
      throw new Error("Unauthorized");
    }

    const updated = await prisma.collection.update({
      where: { id: collectionId },
      data,
    });

    // Log activity
    await WorkspaceService.logActivity({
      workspaceId: collection.workspaceId,
      collectionId,
      action: "COLLECTION_UPDATED",
      description: "Collection updated",
      actorId: userId,
    });

    return updated;
  }

  /**
   * Delete collection
   */
  static async deleteCollection(
    collectionId: string,
    userId: string
  ): Promise<void> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Check permission
    const canDelete = await WorkspaceService.checkPermission(
      collection.workspaceId,
      userId,
      "delete_collection"
    );

    if (!canDelete && collection.creatorId !== userId) {
      throw new Error("Unauthorized");
    }

    await prisma.collection.delete({
      where: { id: collectionId },
    });

    // Log activity
    await WorkspaceService.logActivity({
      workspaceId: collection.workspaceId,
      collectionId,
      action: "COLLECTION_DELETED",
      description: "Collection deleted",
      actorId: userId,
    });
  }

  /**
   * Add trend to collection
   */
  static async addItem(
    collectionId: string,
    userId: string,
    data: CreateCollectionItem
  ): Promise<any> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Check permission
    const canAdd = await WorkspaceService.checkPermission(
      collection.workspaceId,
      userId,
      "add_item"
    );

    if (!canAdd) {
      throw new Error("Unauthorized");
    }

    // Get trend data
    const trend = await prisma.trend.findUnique({
      where: { id: data.trendId },
    });

    const item = await prisma.collectionItem.create({
      data: {
        collectionId,
        trendId: data.trendId,
        notes: data.notes,
        tags: data.tags,
        trendSnapshot: trend ? JSON.parse(JSON.stringify(trend)) : null,
      },
    });

    // Update item count
    await prisma.collection.update({
      where: { id: collectionId },
      data: { itemCount: { increment: 1 } },
    });

    // Log activity
    await WorkspaceService.logActivity({
      workspaceId: collection.workspaceId,
      collectionId,
      action: "ITEM_ADDED",
      description: `Trend added to collection`,
      actorId: userId,
      targetId: data.trendId,
      targetType: "trend",
    });

    return item;
  }

  /**
   * Remove item from collection
   */
  static async removeItem(
    collectionId: string,
    itemId: string,
    userId: string
  ): Promise<void> {
    const item = await prisma.collectionItem.findUnique({
      where: { id: itemId },
      include: { collection: true },
    });

    if (!item) {
      throw new Error("Item not found");
    }

    // Check permission
    const canRemove = await WorkspaceService.checkPermission(
      item.collection.workspaceId,
      userId,
      "remove_item"
    );

    if (!canRemove) {
      throw new Error("Unauthorized");
    }

    await prisma.collectionItem.delete({
      where: { id: itemId },
    });

    // Update item count
    await prisma.collection.update({
      where: { id: collectionId },
      data: { itemCount: { decrement: 1 } },
    });

    // Log activity
    await WorkspaceService.logActivity({
      workspaceId: item.collection.workspaceId,
      collectionId,
      action: "ITEM_REMOVED",
      description: `Trend removed from collection`,
      actorId: userId,
    });
  }

  /**
   * Update collection item
   */
  static async updateItem(
    itemId: string,
    userId: string,
    data: UpdateCollectionItem
  ): Promise<any> {
    const item = await prisma.collectionItem.findUnique({
      where: { id: itemId },
      include: { collection: true },
    });

    if (!item) {
      throw new Error("Item not found");
    }

    // Check permission
    const canEdit = await WorkspaceService.checkPermission(
      item.collection.workspaceId,
      userId,
      "edit_collection"
    );

    if (!canEdit) {
      throw new Error("Unauthorized");
    }

    return prisma.collectionItem.update({
      where: { id: itemId },
      data: {
        notes: data.notes !== undefined ? data.notes : item.notes,
        tags: data.tags !== undefined ? data.tags : item.tags,
      },
    });
  }

  /**
   * Add comment to collection
   */
  static async addComment(
    collectionId: string,
    userId: string,
    data: CreateCollectionComment
  ): Promise<any> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Check permission
    const canComment = await WorkspaceService.checkPermission(
      collection.workspaceId,
      userId,
      "comment"
    );

    if (!canComment) {
      throw new Error("Unauthorized");
    }

    const comment = await prisma.collectionComment.create({
      data: {
        collectionId,
        userId,
        text: data.text,
      },
    });

    // Log activity
    await WorkspaceService.logActivity({
      workspaceId: collection.workspaceId,
      collectionId,
      action: "COMMENT_ADDED",
      description: "Comment added to collection",
      actorId: userId,
    });

    return comment;
  }

  /**
   * Get comments for collection
   */
  static async getComments(collectionId: string): Promise<any[]> {
    return prisma.collectionComment.findMany({
      where: { collectionId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Generate public share link
   */
  static async generateShareLink(
    collectionId: string,
    userId: string
  ): Promise<string> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Check permission
    const canEdit = await WorkspaceService.checkPermission(
      collection.workspaceId,
      userId,
      "edit_collection"
    );

    if (!canEdit && collection.creatorId !== userId) {
      throw new Error("Unauthorized");
    }

    const shareToken = crypto.randomBytes(16).toString("hex");
    await prisma.collection.update({
      where: { id: collectionId },
      data: { shareToken, isPublic: true },
    });

    return `${process.env.WEB_URL}/collections/share/${shareToken}`;
  }

  /**
   * Get collection by share token
   */
  static async getPublicCollection(shareToken: string): Promise<any> {
    return prisma.collection.findUnique({
      where: { shareToken },
      include: {
        items: true,
        comments: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });
  }
}
