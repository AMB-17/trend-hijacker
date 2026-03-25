#!/usr/bin/env bash
# Frontend Components Guide for Multi-Platform Alerts & Workspaces
# This file outlines the React components needed for complete feature implementation

## ALERT SYSTEM COMPONENTS

### 1. AlertSettingsPage
Location: `apps/web/app/alerts/page.tsx`
Purpose: Main alert configuration interface

```
AlertSettingsPage
├── Header (Title + Description)
├── AlertChannelsCard
│   ├── EmailToggle + WebhookInput
│   ├── SlackToggle + SlackWebhookInput
│   └── WebhookToggle + WebhookInput
├── FrequencySelector
│   ├── RealtimeOption
│   ├── DailyDigestOption (with hour picker)
│   └── WeeklyDigestOption (with day/hour picker)
├── AlertRulesSection
│   ├── RulesList
│   │   └── RuleCard (with edit/delete buttons)
│   └── CreateRuleButton
└── TestNotificationButton
```

### 2. CreateAlertRuleModal
Component: `apps/web/components/alerts/CreateAlertRuleModal.tsx`
Purpose: Modal for creating/editing alert rules

```
CreateAlertRuleModal
├── Form
│   ├── RuleNameInput
│   ├── RuleDescriptionInput
│   ├── OpportunityScoreSlider (0-100)
│   ├── VelocityThresholdSlider
│   ├── OnlyNewTrendsToggle
│   ├── KeywordsInput (multiselect/tags)
│   ├── StagesMultiselect
│   └── EnabledToggle
└── FormActions (Save/Cancel)
```

### 3. AlertHistoryView
Component: `apps/web/components/alerts/AlertHistoryView.tsx`
Purpose: View sent alerts with filters

```
AlertHistoryView
├── Filters
│   ├── DateRangePicker
│   ├── StatusFilter (dropdown)
│   └── ChannelFilter (checkbox group)
├── AlertsTable
│   ├── Columns:
│   │   - Subject
│   │   - Channel (badge)
│   │   - Status (badge)
│   │   - Delivered At
│   │   - View Details (button)
│   └── Pagination
└── AlertDetailModal (on click row)
```

### 4. TestNotificationButton
Component: `apps/web/components/alerts/TestNotificationButton.tsx`
Purpose: Send test notification to verify setup

```
TestNotificationButton
├── ChannelSelector (radio buttons)
├── SendButton
└── StatusMessage (loading/success/error)
```

## WORKSPACE COMPONENTS

### 5. WorkspaceSwitcher
Component: `apps/web/components/workspaces/WorkspaceSwitcher.tsx`
Purpose: Dropdown to switch between workspaces

```
WorkspaceSwitcher
├── CurrentWorkspaceButton
├── Dropdown Menu
│   ├── WorkspaceList
│   │   ├── WorkspaceItem (clickable)
│   │   └── CurrentWorkspaceBadge
│   ├── Divider
│   ├── "Create Workspace" Button
│   └── "Workspace Settings" Button
└── Modal (CreateWorkspaceModal when needed)
```

### 6. WorkspacesPage
Location: `apps/web/app/workspaces/page.tsx`
Purpose: Manage workspaces

```
WorkspacesPage
├── Header (Title + Create button)
├── WorkspaceCards (grid)
│   └── WorkspaceCard (each)
│       ├── Name + Description
│       ├── Member count badge
│       ├── Collection count
│       └── Action buttons (view/settings/delete)
└── CreateWorkspaceModal (when needed)
```

### 7. WorkspaceSettingsPage
Location: `apps/web/app/workspaces/:workspaceId/settings/page.tsx`
Purpose: Workspace admin panel

```
WorkspaceSettingsPage
├── WorkspaceInfoCard (editable)
│   ├── NameInput
│   ├── DescriptionInput
│   ├── PrivacyToggle
│   └── SaveButton
├── MembersSection
│   ├── MembersList
│   │   └── MemberRow
│   │       ├── Email + Name
│   │       ├── Role badge
│   │       ├── RoleSelector (admin only)
│   │       └── RemoveButton
│   └── InviteMemberButton
├── ActivityLogSection
│   └── ActivityFeed
└── DeleteWorkspaceButton (owner only, destructive)
```

### 8. InviteMemberModal
Component: `apps/web/components/workspaces/InviteMemberModal.tsx`
Purpose: Invite new team members

```
InviteMemberModal
├── Form
│   ├── EmailInput (with validation)
│   ├── RoleSelector (default: MEMBER)
│   ├── MessageTextarea (optional)
│   └── InviteButton
└── RecentInvitesList (optional)
```

## COLLECTION COMPONENTS

### 9. CollectionsPage
Location: `apps/web/app/collections/page.tsx`
Purpose: Browse and manage collections

```
CollectionsPage
├── WorkspaceContext (shows current workspace)
├── Header (Title + Create button)
├── FilterBar
│   ├── SearchInput
│   ├── SortSelector
│   └── ViewToggle (grid/list)
├── CollectionGrid
│   └── CollectionCard
│       ├── Name + Description
│       ├── Item count badge
│       ├── Comment count
│       ├── AccessBadge (public/private)
│       └── Action buttons (open/share/delete)
└── CreateCollectionModal (when needed)
```

### 10. CollectionDetailPage
Location: `apps/web/app/collections/:collectionId/page.tsx`
Purpose: View and manage collection contents

```
CollectionDetailPage
├── CollectionHeader
│   ├── Name + Description (editable)
│   ├── ShareButton
│   └── SettingsButton
├── TrendItemsView
│   ├── AddItemsButton
│   ├── TrendsList
│   │   └── TrendItem
│   │       ├── TrendCard
│   │       ├── NotesInput (editable)
│   │       ├── TagsInput (editable)
│   │       └── RemoveButton
│   └── Pagination
├── CommentsSection
│   ├── CommentsList
│   │   └── CommentItem
│   │       ├── Author info
│   │       └── Timestamp
│   └── CommentInput (bottom)
└── ActivityFeed (collapsible)
```

### 11. SaveToCollectionButton
Component: `apps/web/components/trends/SaveToCollectionButton.tsx`
Purpose: Quick save button on trend cards

```
SaveToCollectionButton
├── Button (icon + text)
└── Modal (on click)
    ├── CollectionSelector (dropdown or list)
    ├── NotesInput (optional)
    ├── TagsInput (optional)
    └── SaveButton
```

### 12. ShareCollectionModal
Component: `apps/web/components/collections/ShareCollectionModal.tsx`
Purpose: Generate and share public links

```
ShareCollectionModal
├── ShareLinkSection
│   ├── GenerateLinkButton (if not exists)
│   ├── LinkDisplay (copyable)
│   ├── CopyButton
│   └── RegenerateButton
├── ShareSettingsSection
│   ├── PublicToggle
│   └── ExpirationSelector (optional)
└── SharedWithList (who has access)
```

### 13. PublicCollectionView
Location: `apps/web/app/collections/share/:shareToken/page.tsx`
Purpose: View public collection (no auth required)

```
PublicCollectionView
├── Header (collection info)
├── TrendsList (read-only)
│   └── TrendCard (no edit buttons)
├── CommentsSection (read-only or allow comments)
└── BackLink (to landing/home)
```

## ACTIVITY & COLLABORATION COMPONENTS

### 14. ActivityFeed
Component: `apps/web/components/workspaces/ActivityFeed.tsx`
Purpose: Show workspace activity log

```
ActivityFeed
├── Filters
│   ├── ActionTypeFilter
│   └── DateRangeFilter
├── TimelineView
│   └── ActivityItem (each)
│       ├── Icon (action-specific)
│       ├── Description
│       ├── Actor info (avatar + name)
│       └── Timestamp (relative)
└── LoadMore / Pagination
```

### 15. CollectionComments
Component: `apps/web/components/collections/CollectionComments.tsx`
Purpose: Collaborative comment section

```
CollectionComments
├── CommentsList
│   └── CommentThread
│       ├── AuthorAvatar
│       ├── AuthorName + Timestamp
│       ├── CommentText
│       └── EditButton (if author)
├── CommentInput
│   ├── AvatarDisplay (current user)
│   ├── TextAreaInput
│   └── PostButton (with char count)
└── LoadMoreComments (if >10)
```

## CONTEXT & HOOKS

### 16. WorkspaceContext
Location: `apps/web/lib/workspace-context.tsx`
Purpose: Global workspace state

```
export const WorkspaceProvider = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  
  return (
    <WorkspaceContext.Provider value={{ currentWorkspace, workspaces, ... }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
```

### 17. Custom Hooks
Location: `apps/web/lib/hooks/`

#### `useAlertConfig()`
- Get/update alert configuration
- Auto-refetch on interval

#### `useAlertRules(configId)`
- List and manage alert rules
- Real-time sync

#### `useCollections(workspaceId)`
- List collections in workspace
- Pagination support

#### `useWorkspaceMembers(workspaceId)`
- List workspace members
- Real-time updates

#### `useActivityLog(workspaceId, options)`
- Fetch activity with filters
- Pagination

## STYLING & STATE MANAGEMENT

### Badge Components
- `AlertStatusBadge` (DELIVERED, FAILED, PENDING)
- `RoleBadge` (ADMIN, EDITOR, MEMBER, VIEWER)
- `AccessBadge` (public, private)
- `ChannelBadge` (email, slack, webhook)

### Reusable Modals
- `ConfirmDeleteModal` (for workspace/collection delete)
- `LoadingModal` (async operations)
- `ErrorModal` (error display)

### Loading States
- Skeleton loaders for collections
- Skeleton loaders for alert history
- Activity feed placeholder

---

## Implementation Priority

### Phase 1: Critical Path
1. AlertSettingsPage (alerts must work)
2. WorkspaceSwitcher (core UX)
3. CollectionsPage (browse collections)
4. SaveToCollectionButton (core feature)

### Phase 2: Important Features
5. CollectionDetailPage (collection editing)
6. WorkspacesPage (workspace management)
7. AlertHistoryView (view sent alerts)
8. ActivityFeed (collaboration insight)

### Phase 3: Polish & Extras
9. PublicCollectionView (sharing)
10. InviteMemberModal (team features)
11. TestNotificationButton (verification)
12. WorkspaceSettingsPage (admin features)

---

## API Integration Points

### Alert System
- `GET /api/alerts-config/config` → Load AlertSettingsPage
- `PUT /api/alerts-config/config` → Save settings
- `POST /api/alerts-config/rules` → Create rule
- `GET /api/alerts-config/history` → Load AlertHistoryView
- `POST /api/alerts-config/send-test` → Test notification

### Workspaces
- `GET /api/workspaces` → WorkspaceSwitcher + WorkspacesPage
- `POST /api/workspaces` → Create workspace
- `GET /api/workspaces/:id` → Workspace details
- `GET /api/workspaces/:id/members` → Members list
- `POST /api/workspaces/:id/members` → Invite member
- `GET /api/workspaces/:id/activity` → Activity feed

### Collections
- `GET /api/collections?workspaceId=...` → List collections
- `POST /api/collections` → Create collection
- `GET /api/collections/:id` → Collection detail
- `POST /api/collections/:id/items` → Add trend
- `POST /api/collections/:id/comments` → Add comment
- `POST /api/collections/:id/share-link` → Generate share link
- `GET /api/collections/share/:token` → View public

---

## State Management Pattern

```typescript
// Per-component state (simple cases)
const [config, setConfig] = useState(null);

// Context + Hooks (workspace-wide)
const { currentWorkspace } = useWorkspace();

// React Query / SWR (recommended for this scale)
const { data: collections } = useQuery(
  ['collections', workspaceId],
  () => fetchCollections(workspaceId)
);
```

---

## Error Handling in UI

### Error Boundaries
- AlertsErrorBoundary
- WorkspacesErrorBoundary
- CollectionsErrorBoundary

### Toast Notifications
- Success: "Alert rule created"
- Error: "Failed to save settings"
- Warning: "Alert failed to send"
- Info: "Test notification sent"

---

## Accessibility (a11y)

- ARIA labels on all buttons
- Keyboard navigation for dropdowns
- Focus management in modals
- Color-blind friendly badges
- Screen reader friendly tables

---

**Total Components**: 15 major components + 6+ hooks + utilities

**Estimated Implementation Time**: 40-60 hours for full UI suite

**Recommendation**: Implement in phases, starting with core features (Phase 1)
