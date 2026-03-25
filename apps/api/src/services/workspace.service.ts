import { prisma } from "@trend-hijacker/database";
import {
  CreateWorkspace,
  UpdateWorkspace,
  WorkspaceRole,
  ActivityAction,
} from "@trend-hijacker/types";
import { logger } from "@trend-hijacker/utils";
import crypto from "crypto";

/**
 * Workspace Service
 * Manages workspaces, members, and permissions
 */

export class WorkspaceService {
  /**
   * Create a new workspace
   */
  static async createWorkspace(
    ownerId: string,
    data: CreateWorkspace
  ): Promise<any> {
    const workspace = await prisma.workspace.create({
      data: {
        ...data,
        ownerId,
      },
    });

    // Add owner as admin
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: ownerId,
        role: "ADMIN",
      },
    });

    // Log activity
    await this.logActivity({
      workspaceId: workspace.id,
      action: "WORKSPACE_CREATED",
      description: `Workspace "${workspace.name}" created`,
      actorId: ownerId,
    });

    return workspace;
  }

  /**
   * Get workspace by ID
   */
  static async getWorkspace(workspaceId: string, userId: string): Promise<any> {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId },
      include: {
        members: true,
        collections: {
          include: {
            _count: {
              select: { items: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      return null;
    }

    // Check if user is member
    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember && workspace.ownerId !== userId) {
      return null;
    }

    return workspace;
  }

  /**
   * Get all workspaces for user
   */
  static async getUserWorkspaces(userId: string): Promise<any[]> {
    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: true,
        _count: {
          select: { collections: true },
        },
      },
    });

    return workspaces;
  }

  /**
   * Update workspace
   */
  static async updateWorkspace(
    workspaceId: string,
    userId: string,
    data: UpdateWorkspace
  ): Promise<any> {
    // Check if user is admin
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!member || member.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });

    // Log activity
    await this.logActivity({
      workspaceId,
      action: "WORKSPACE_UPDATED",
      description: "Workspace updated",
      actorId: userId,
    });

    return workspace;
  }

  /**
   * Delete workspace
   */
  static async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.ownerId !== userId) {
      throw new Error("Unauthorized");
    }

    await prisma.workspace.delete({
      where: { id: workspaceId },
    });
  }

  /**
   * Add member to workspace
   */
  static async addMember(
    workspaceId: string,
    invitedUserId: string,
    role: WorkspaceRole = "MEMBER",
    invitedBy: string
  ): Promise<any> {
    // Check if member already exists
    const existing = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: invitedUserId },
    });

    if (existing) {
      return existing;
    }

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: invitedUserId,
        role,
        invitedAt: new Date(),
        invitedBy,
      },
    });

    // Log activity
    await this.logActivity({
      workspaceId,
      action: "MEMBER_INVITED",
      description: `User invited to workspace with role ${role}`,
      actorId: invitedBy,
      targetId: invitedUserId,
    });

    return member;
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    workspaceId: string,
    userId: string,
    newRole: WorkspaceRole,
    changedBy: string
  ): Promise<any> {
    const member = await prisma.workspaceMember.update({
      where: {
        id: `${workspaceId}-${userId}`,
      },
      data: { role: newRole },
    });

    // Log activity
    await this.logActivity({
      workspaceId,
      action: "MEMBER_ROLE_CHANGED",
      description: `Role changed to ${newRole}`,
      actorId: changedBy,
      targetId: userId,
      targetType: "user",
    });

    return member;
  }

  /**
   * Remove member from workspace
   */
  static async removeMember(
    workspaceId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    await prisma.workspaceMember.deleteMany({
      where: { workspaceId, userId },
    });

    // Log activity
    await this.logActivity({
      workspaceId,
      action: "MEMBER_REMOVED",
      description: "Member removed from workspace",
      actorId: removedBy,
      targetId: userId,
    });
  }

  /**
   * Get workspace members
   */
  static async getMembers(workspaceId: string): Promise<any[]> {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  /**
   * Check if user has permission in workspace
   */
  static async checkPermission(
    workspaceId: string,
    userId: string,
    permission: string
  ): Promise<boolean> {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!member) {
      return false;
    }

    const permissions: Record<WorkspaceRole, string[]> = {
      ADMIN: [
        "manage_members",
        "manage_collections",
        "manage_workspace",
        "view_activity",
        "create_collection",
        "edit_collection",
        "delete_collection",
        "add_item",
        "remove_item",
        "comment",
      ],
      EDITOR: [
        "create_collection",
        "edit_collection",
        "add_item",
        "remove_item",
        "comment",
        "view_activity",
      ],
      MEMBER: [
        "create_collection",
        "add_item",
        "comment",
        "view_activity",
      ],
      VIEWER: ["view_activity"],
    };

    return permissions[member.role]?.includes(permission) ?? false;
  }

  /**
   * Log workspace activity
   */
  static async logActivity(params: {
    workspaceId: string;
    action: ActivityAction;
    description?: string;
    actorId?: string;
    targetId?: string;
    targetType?: string;
    collectionId?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return prisma.workspaceActivityLog.create({
      data: {
        workspaceId: params.workspaceId,
        collectionId: params.collectionId,
        action: params.action,
        description: params.description,
        actorId: params.actorId,
        targetId: params.targetId,
        targetType: params.targetType,
        metadata: params.metadata,
      },
    });
  }

  /**
   * Get activity log for workspace
   */
  static async getActivityLog(
    workspaceId: string,
    options: { page?: number; limit?: number; action?: string } = {}
  ): Promise<any> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
    if (options.action) {
      where.action = options.action;
    }

    const [items, total] = await Promise.all([
      prisma.workspaceActivityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.workspaceActivityLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
