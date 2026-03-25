import { z } from "zod";

// Workspace Role Enum
export const WorkspaceRoleEnum = z.enum(["ADMIN", "EDITOR", "MEMBER", "VIEWER"]);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleEnum>;

// Activity Action Enum
export const ActivityActionEnum = z.enum([
  "WORKSPACE_CREATED",
  "WORKSPACE_UPDATED",
  "WORKSPACE_DELETED",
  "MEMBER_INVITED",
  "MEMBER_JOINED",
  "MEMBER_ROLE_CHANGED",
  "MEMBER_REMOVED",
  "COLLECTION_CREATED",
  "COLLECTION_UPDATED",
  "COLLECTION_DELETED",
  "ITEM_ADDED",
  "ITEM_REMOVED",
  "COMMENT_ADDED",
  "COMMENT_UPDATED",
  "COMMENT_DELETED",
]);
export type ActivityAction = z.infer<typeof ActivityActionEnum>;

// Workspace Schema
export const WorkspaceSchema = z.object({
  id: z.string().optional(),
  ownerId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  isPrivate: z.boolean().default(true),
  stripeCustomerId: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const CreateWorkspaceSchema = WorkspaceSchema.omit({
  id: true,
  ownerId: true,
  stripeCustomerId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateWorkspace = z.infer<typeof CreateWorkspaceSchema>;

export const UpdateWorkspaceSchema = WorkspaceSchema.partial().omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
});
export type UpdateWorkspace = z.infer<typeof UpdateWorkspaceSchema>;

// Workspace Member Schema
export const WorkspaceMemberSchema = z.object({
  id: z.string().optional(),
  workspaceId: z.string(),
  userId: z.string(),
  role: WorkspaceRoleEnum.default("MEMBER"),
  joinedAt: z.date().optional(),
  invitedAt: z.date().optional().nullable(),
  invitedBy: z.string().optional().nullable(),
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const CreateWorkspaceMemberSchema = z.object({
  email: z.string().email(),
  role: WorkspaceRoleEnum.default("MEMBER"),
});
export type CreateWorkspaceMember = z.infer<typeof CreateWorkspaceMemberSchema>;

export const UpdateWorkspaceMemberSchema = z.object({
  role: WorkspaceRoleEnum,
});
export type UpdateWorkspaceMember = z.infer<typeof UpdateWorkspaceMemberSchema>;

// Collection Schema
export const CollectionSchema = z.object({
  id: z.string().optional(),
  workspaceId: z.string(),
  creatorId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  isPublic: z.boolean().default(false),
  shareToken: z.string().optional().nullable(),
  itemCount: z.number().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type Collection = z.infer<typeof CollectionSchema>;

export const CreateCollectionSchema = CollectionSchema.omit({
  id: true,
  creatorId: true,
  itemCount: true,
  shareToken: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateCollection = z.infer<typeof CreateCollectionSchema>;

export const UpdateCollectionSchema = CollectionSchema.partial().omit({
  id: true,
  workspaceId: true,
  creatorId: true,
  itemCount: true,
  createdAt: true,
  updatedAt: true,
});
export type UpdateCollection = z.infer<typeof UpdateCollectionSchema>;

// Collection Item Schema
export const CollectionItemSchema = z.object({
  id: z.string().optional(),
  collectionId: z.string(),
  trendId: z.string(),
  trendSnapshot: z.record(z.any()).optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  addedAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type CollectionItem = z.infer<typeof CollectionItemSchema>;

export const CreateCollectionItemSchema = z.object({
  trendId: z.string(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
export type CreateCollectionItem = z.infer<typeof CreateCollectionItemSchema>;

export const UpdateCollectionItemSchema = z.object({
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});
export type UpdateCollectionItem = z.infer<typeof UpdateCollectionItemSchema>;

// Collection Comment Schema
export const CollectionCommentSchema = z.object({
  id: z.string().optional(),
  collectionId: z.string(),
  userId: z.string(),
  text: z.string().min(1).max(5000),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type CollectionComment = z.infer<typeof CollectionCommentSchema>;

export const CreateCollectionCommentSchema = z.object({
  text: z.string().min(1).max(5000),
});
export type CreateCollectionComment = z.infer<typeof CreateCollectionCommentSchema>;

export const UpdateCollectionCommentSchema = z.object({
  text: z.string().min(1).max(5000),
});
export type UpdateCollectionComment = z.infer<typeof UpdateCollectionCommentSchema>;

// Workspace Activity Log Schema
export const WorkspaceActivityLogSchema = z.object({
  id: z.string().optional(),
  workspaceId: z.string(),
  collectionId: z.string().optional().nullable(),
  action: ActivityActionEnum,
  description: z.string().optional().nullable(),
  actorId: z.string().optional().nullable(),
  actorName: z.string().optional().nullable(),
  targetId: z.string().optional().nullable(),
  targetType: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  createdAt: z.date().optional(),
});
export type WorkspaceActivityLog = z.infer<typeof WorkspaceActivityLogSchema>;

// API Request/Response Schemas
export const WorkspaceQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "name", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type WorkspaceQuery = z.infer<typeof WorkspaceQuerySchema>;

export const ActivityLogQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  action: ActivityActionEnum.optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ActivityLogQuery = z.infer<typeof ActivityLogQuerySchema>;

// Permission checking helpers
export const ROLE_PERMISSIONS: Record<WorkspaceRole, string[]> = {
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
  MEMBER: ["create_collection", "add_item", "comment", "view_activity"],
  VIEWER: ["view_activity"],
};

export function hasPermission(
  role: WorkspaceRole,
  permission: string
): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Invite Schema
export const InviteWorkspaceMemberSchema = z.object({
  email: z.string().email(),
  role: WorkspaceRoleEnum.default("MEMBER"),
  message: z.string().optional(),
});
export type InviteWorkspaceMember = z.infer<typeof InviteWorkspaceMemberSchema>;
