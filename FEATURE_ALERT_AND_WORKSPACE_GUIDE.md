# Multi-Platform Alert System & Collaborative Workspaces

## Overview

This document describes two major new features implemented in Trend Hijacker v2.0:

1. **Multi-Platform Alert System** - Email, Slack, and webhook-based notifications
2. **Collaborative Workspaces & Collections** - Team collaboration with role-based access control

---

## FEATURE 2: Multi-Platform Alert System

### Architecture

The alert system is built with multiple layers:

```
AlertConfig (user preferences)
    ├── AlertRule (conditions)
    ├── AlertHistory (sent alerts)
    └── AlertDelivery (delivery tracking)
```

### Database Schema

#### `alert_configs`
Stores user notification preferences:
- `id`: Unique identifier
- `userId`: Owner user
- `emailEnabled`: Enable email notifications
- `slackEnabled`: Enable Slack notifications
- `slackWebhookUrl`: Slack webhook URL
- `webhookEnabled`: Enable custom webhooks
- `webhookUrl`: Custom webhook endpoint
- `frequency`: `REAL_TIME` | `DAILY_DIGEST` | `WEEKLY_DIGEST`
- `digestHourOfDay`: Hour for daily digest (0-23)
- `digestDayOfWeek`: Day for weekly digest (0-6)
- `mobileNotifications`: Mobile push notifications
- `inAppNotifications`: In-app notifications

#### `alert_rules`
Defines conditions that trigger alerts:
- `id`: Unique identifier
- `userId`: Rule owner
- `configId`: Parent configuration
- `name`: Rule name (e.g., "AI Opportunities")
- `description`: Optional description
- `minOpportunityScore`: Score threshold (0-100)
- `minVelocityThreshold`: Growth rate threshold
- `onlyNewTrends`: Only alert on newly detected trends
- `keywords`: Array of keywords to match
- `stages`: Array of trend stages to match
- `enabled`: Rule is active

#### `alert_history`
Log of all sent alerts:
- `id`: Unique identifier
- `userId`: Alert recipient
- `configId`: Alert configuration used
- `subject`: Email subject
- `message`: Alert message body
- `channel`: `email` | `slack` | `webhook` | `in_app`
- `trendId`: Associated trend (optional)
- `trendsData`: Trend snapshot at time of alert
- `status`: `PENDING` | `SENT` | `FAILED` | `DELIVERED` | `BOUNCED`
- `deliveredAt`: Timestamp of successful delivery
- `failureReason`: Error message if failed
- `retryCount`: Number of retry attempts
- `nextRetryAt`: When to retry (exponential backoff)

#### `alert_deliveries`
Granular delivery tracking:
- `id`: Unique identifier
- `historyId`: Parent alert history
- `channel`: Delivery channel
- `recipient`: Email, Slack webhook, or webhook URL
- `status`: Delivery status
- `statusCode`: HTTP status from service
- `statusMessage`: Response message
- `externalId`: Message ID from email/Slack service
- `deliveredAt`: Delivery timestamp
- `failureReason`: Delivery error

### API Endpoints

#### Alert Configuration

##### `GET /api/alerts-config/config`
Get current user's alert configuration.

**Response:**
```json
{
  "id": "config_123",
  "userId": "user_456",
  "emailEnabled": true,
  "slackEnabled": false,
  "frequency": "REAL_TIME",
  "rules": [...]
}
```

##### `PUT /api/alerts-config/config`
Update alert configuration.

**Request Body:**
```json
{
  "emailEnabled": true,
  "slackEnabled": true,
  "slackWebhookUrl": "https://hooks.slack.com/...",
  "frequency": "DAILY_DIGEST",
  "digestHourOfDay": 9
}
```

#### Alert Rules

##### `POST /api/alerts-config/rules`
Create new alert rule.

**Request Body:**
```json
{
  "userId": "user_456",
  "configId": "config_123",
  "name": "High-Opportunity Trends",
  "description": "Alert on trends scoring > 80",
  "minOpportunityScore": 80,
  "minVelocityThreshold": 0.5,
  "onlyNewTrends": false,
  "keywords": ["AI", "machine learning"],
  "stages": ["emerging", "exploding"],
  "enabled": true
}
```

##### `PUT /api/alerts-config/rules/:ruleId`
Update existing rule.

##### `DELETE /api/alerts-config/rules/:ruleId`
Delete rule.

#### Alert History

##### `GET /api/alerts-config/history`
Get sent alerts with pagination and filtering.

**Query Parameters:**
```
?page=1&limit=20&status=DELIVERED&channel=email&startDate=...&endDate=...
```

**Response:**
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

#### Testing

##### `POST /api/alerts-config/send-test`
Send test notification to verify configuration.

**Request Body:**
```json
{
  "channel": "email",
  "testMessage": "This is a test"
}
```

### Email Templates

The system includes pre-built HTML templates:

#### New Trend Alert
```
Subject: New Opportunity: {trend_title}

[HTML email with:]
- Trend title and summary
- Opportunity score (0-100)
- Growth velocity percentage
- View trend button (link to dashboard)
- Branded footer
```

#### Daily Digest
```
Subject: Daily Opportunity Digest

[HTML email with:]
- Top 5 opportunities from past 24 hours
- Score and summary for each
- Trend link button
```

#### Weekly Digest
```
Subject: Weekly Opportunity Digest

[HTML email with:]
- Top 5 opportunities from past 7 days
- Performance metrics
- Trend link button
```

### Services

#### `AlertDeliveryService`
Handles sending to external services:
- `sendEmail(payload)` - Send via Resend API
- `sendSlack(payload)` - Send to Slack webhook
- `sendWebhook(payload)` - Send to custom webhook
- `createAndSendAlert(params)` - Create history and send
- `retryFailedDeliveries()` - Retry with exponential backoff
- `generateAlertEmailTemplate()` - Generate HTML
- `generateDigestEmailTemplate()` - Generate digest HTML

#### `AlertService` (Extended)
- `getOrCreateAlertConfig(userId)` - Ensure config exists
- `updateAlertConfig(userId, data)` - Update user preferences
- `createAlertRule(data)` - Create new rule
- `checkTrendAgainstRules(userId, trend)` - Match trend to rules
- `triggerAlertForTrend()` - Send alert for matching trend
- `sendDigestAlert(userId, period)` - Send daily/weekly digest
- `sendTestAlert(userId, channel)` - Test notification

### Configuration

#### Environment Variables
```env
# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key
ALERT_FROM_EMAIL=noreply@trendhijacker.com

# Web URL for links in emails
WEB_URL=https://app.trendhijacker.com
```

### Error Handling

The system implements robust error handling:

1. **Validation**: All inputs validated with Zod schemas
2. **Retry Logic**: Failed deliveries retry with exponential backoff
3. **Dead Letter Queue**: Permanently failed alerts logged for review
4. **Graceful Degradation**: If one channel fails, others continue
5. **Rate Limiting**: Per-user rate limits prevent spam

### Security

1. **Webhook Signature Verification**: Optional for custom webhooks
2. **Rate Limiting**: 10 emails per hour per user
3. **Sensitive Data Masking**: Webhook URLs masked in logs
4. **Authorization**: Only users can access their own alerts
5. **Input Sanitization**: HTML escaping in email templates

---

## FEATURE 3: Collaborative Workspaces & Collections

### Architecture

```
Workspace (team container)
├── WorkspaceMember (with role)
├── Collection (trend grouping)
│   ├── CollectionItem (trend + notes)
│   ├── CollectionComment (collaboration)
│   └── SharedCollection (optional public link)
└── WorkspaceActivityLog (audit trail)
```

### Database Schema

#### `workspaces`
Team workspace container:
- `id`: Unique identifier
- `ownerId`: Workspace creator/owner
- `name`: Display name
- `description`: Optional description
- `isPrivate`: Private or public workspace
- `stripeCustomerId`: For billing
- `createdAt`, `updatedAt`

#### `workspace_members`
User membership in workspace:
- `id`: Unique identifier
- `workspaceId`: Parent workspace
- `userId`: Team member
- `role`: `ADMIN` | `EDITOR` | `MEMBER` | `VIEWER`
- `joinedAt`: Membership start date
- `invitedAt`: Invitation timestamp
- `invitedBy`: Who invited them

#### `collections`
Trend collections/groupings:
- `id`: Unique identifier
- `workspaceId`: Parent workspace
- `creatorId`: Collection owner
- `name`: Display name
- `description`: Optional description
- `isPublic`: Public or private
- `shareToken`: For public sharing
- `itemCount`: Cached item count
- `createdAt`, `updatedAt`

#### `collection_items`
Trends in collection:
- `id`: Unique identifier
- `collectionId`: Parent collection
- `trendId`: The trend reference
- `trendSnapshot`: Trend data at time of add
- `notes`: Custom user notes
- `tags`: Array of tags for organization
- `addedAt`, `updatedAt`

#### `collection_comments`
Collaborative notes/discussion:
- `id`: Unique identifier
- `collectionId`: Parent collection
- `userId`: Comment author
- `text`: Comment content
- `createdAt`, `updatedAt`

#### `workspace_activity_log`
Audit trail of all actions:
- `id`: Unique identifier
- `workspaceId`: Workspace
- `collectionId`: Optional collection
- `action`: `WORKSPACE_CREATED` | `MEMBER_INVITED` | `ITEM_ADDED` | etc.
- `description`: Human-readable description
- `actorId`: Who performed action
- `targetId`: What was affected
- `targetType`: Type of target
- `metadata`: Additional context
- `createdAt`

### Role-Based Access Control (RBAC)

#### Roles & Permissions

| Role | Manage Members | Manage Workspace | Create Collection | Edit/Delete Item | Comment | View Activity |
|------|---|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| EDITOR | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| MEMBER | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| VIEWER | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### API Endpoints

#### Workspaces

##### `GET /api/workspaces`
List all workspaces for current user.

**Response:**
```json
[
  {
    "id": "ws_123",
    "name": "AI Innovation Lab",
    "description": "Tracking AI trends",
    "ownerId": "user_123",
    "isPrivate": true,
    "members": [...],
    "collections": [...]
  }
]
```

##### `POST /api/workspaces`
Create new workspace.

**Request Body:**
```json
{
  "name": "AI Innovation Lab",
  "description": "Track emerging AI trends",
  "isPrivate": true
}
```

##### `GET /api/workspaces/:workspaceId`
Get workspace details.

##### `PUT /api/workspaces/:workspaceId`
Update workspace (admin only).

##### `DELETE /api/workspaces/:workspaceId`
Delete workspace (owner only).

#### Members

##### `GET /api/workspaces/:workspaceId/members`
List workspace members.

**Response:**
```json
[
  {
    "id": "member_123",
    "userId": "user_456",
    "email": "user@example.com",
    "role": "EDITOR",
    "joinedAt": "2024-01-15T10:00:00Z"
  }
]
```

##### `POST /api/workspaces/:workspaceId/members`
Invite new member (admin only).

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "MEMBER",
  "message": "Join our AI trends workspace!"
}
```

##### `PUT /api/workspaces/:workspaceId/members/:memberId`
Change member role (admin only).

##### `DELETE /api/workspaces/:workspaceId/members/:memberId`
Remove member (admin only).

#### Collections

##### `GET /api/collections?workspaceId=ws_123`
List collections in workspace.

##### `POST /api/collections`
Create new collection.

**Request Body:**
```json
{
  "workspaceId": "ws_123",
  "name": "AI Safety Trends",
  "description": "Opportunities in AI safety",
  "isPublic": false
}
```

##### `GET /api/collections/:collectionId`
Get collection details with items.

##### `PUT /api/collections/:collectionId`
Update collection.

##### `DELETE /api/collections/:collectionId`
Delete collection.

#### Collection Items

##### `POST /api/collections/:collectionId/items`
Add trend to collection.

**Request Body:**
```json
{
  "trendId": "trend_123",
  "notes": "Promising market opportunity",
  "tags": ["ai", "safety", "2024"]
}
```

##### `PUT /api/collections/:collectionId/items/:itemId`
Update item notes/tags.

##### `DELETE /api/collections/:collectionId/items/:itemId`
Remove item from collection.

#### Comments

##### `POST /api/collections/:collectionId/comments`
Add comment to collection.

**Request Body:**
```json
{
  "text": "This trend shows high market potential"
}
```

##### `GET /api/collections/:collectionId/comments`
Get all comments for collection.

#### Sharing

##### `POST /api/collections/:collectionId/share-link`
Generate public share link.

**Response:**
```json
{
  "shareLink": "https://app.trendhijacker.com/collections/share/abc123def456"
}
```

##### `GET /api/collections/share/:shareToken`
View public collection (no auth required).

#### Activity Log

##### `GET /api/workspaces/:workspaceId/activity`
Get workspace activity log.

**Query Parameters:**
```
?page=1&limit=20&action=ITEM_ADDED&startDate=...&endDate=...
```

**Response:**
```json
{
  "items": [
    {
      "id": "log_123",
      "action": "ITEM_ADDED",
      "description": "Trend added to collection",
      "actorId": "user_456",
      "actorName": "John Doe",
      "targetId": "trend_789",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### Services

#### `WorkspaceService`
- `createWorkspace(ownerId, data)` - Create workspace
- `getWorkspace(workspaceId, userId)` - Get with permission check
- `getUserWorkspaces(userId)` - List user's workspaces
- `updateWorkspace(workspaceId, userId, data)` - Update
- `deleteWorkspace(workspaceId, userId)` - Delete
- `addMember(workspaceId, userId, role, invitedBy)` - Invite
- `updateMemberRole(workspaceId, userId, role, changedBy)` - Change role
- `removeMember(workspaceId, userId, removedBy)` - Remove
- `getMembers(workspaceId)` - List members
- `checkPermission(workspaceId, userId, permission)` - Verify permission
- `logActivity(params)` - Log action
- `getActivityLog(workspaceId, options)` - Retrieve log

#### `CollectionService`
- `createCollection(workspaceId, creatorId, data)` - Create
- `getCollection(collectionId, userId)` - Get with access check
- `getWorkspaceCollections(workspaceId, userId, options)` - List
- `updateCollection(collectionId, userId, data)` - Update
- `deleteCollection(collectionId, userId)` - Delete
- `addItem(collectionId, userId, data)` - Add trend
- `removeItem(collectionId, itemId, userId)` - Remove trend
- `updateItem(itemId, userId, data)` - Update notes/tags
- `addComment(collectionId, userId, data)` - Comment
- `getComments(collectionId)` - Get comments
- `generateShareLink(collectionId, userId)` - Generate token
- `getPublicCollection(shareToken)` - Public access

### Type Definitions (Zod)

All major operations are validated with Zod schemas:

- `CreateWorkspaceSchema`
- `UpdateWorkspaceSchema`
- `InviteWorkspaceMemberSchema`
- `CreateCollectionSchema`
- `UpdateCollectionSchema`
- `CreateCollectionItemSchema`
- `UpdateCollectionItemSchema`
- `CreateCollectionCommentSchema`
- `ActivityLogQuerySchema`

See `packages/types/src/workspace.types.ts` for details.

### Security

1. **Permission Checks**: All operations verify user permissions
2. **Authorization**: Role-based access control enforced
3. **Data Isolation**: Workspaces isolated per user
4. **Audit Trail**: All actions logged with actor ID
5. **Input Validation**: Zod schemas on all inputs
6. **Rate Limiting**: Applied to API endpoints

### Error Handling

- Proper HTTP status codes (401, 403, 404, 500)
- Descriptive error messages
- Validation error details returned
- Permission denied errors (403) vs. not found (404)
- Graceful degradation

---

## Implementation Checklist

### Database
- [x] Add new tables to Prisma schema
- [x] Create migration script
- [x] Set up indexes for performance
- [ ] Run database migration

### Backend Services
- [x] AlertDeliveryService (Email/Slack/Webhook)
- [x] AlertService (Configuration & Rules)
- [x] WorkspaceService (Team management)
- [x] CollectionService (Trend grouping)
- [x] RBAC permission checking

### API Routes
- [x] Alert configuration routes
- [x] Workspace management routes
- [x] Collection management routes
- [x] Activity log routes
- [x] Public sharing routes

### Type Safety
- [x] Zod schemas for all features
- [x] TypeScript interfaces
- [x] Input validation on all endpoints

### Frontend (TODO)
- [ ] Alert settings component
- [ ] Alert history view
- [ ] Workspace switcher dropdown
- [ ] Collection browser
- [ ] Save-to-collection button
- [ ] Share collection modal
- [ ] Activity feed component
- [ ] Member management UI

### Testing (TODO)
- [ ] Unit tests for services
- [ ] Integration tests for APIs
- [ ] E2E tests for workflows
- [ ] Alert delivery tests (mock)
- [ ] Permission check tests

### Deployment
- [ ] Environment variables documentation
- [ ] Migration scripts
- [ ] Database backup procedures
- [ ] Monitoring and logging

---

## Configuration

### Environment Variables

```env
# Alert System
RESEND_API_KEY=your_resend_key
ALERT_FROM_EMAIL=noreply@trendhijacker.com
WEB_URL=https://app.trendhijacker.com

# Rate Limiting
ALERT_RATE_LIMIT_PER_HOUR=10

# Retry Policy
ALERT_MAX_RETRIES=3
ALERT_RETRY_BACKOFF_BASE=5000  # ms
```

### Feature Flags

Both features are enabled by default. To disable:

```env
FEATURE_MULTI_PLATFORM_ALERTS=true
FEATURE_WORKSPACES=true
```

---

## Performance Considerations

### Alert System
- **Caching**: Recent alert configs cached in memory
- **Async Delivery**: Send alerts asynchronously via job queue
- **Batch Digests**: Group daily/weekly digests for efficiency
- **Index Strategy**: Index on userId, status, createdAt

### Workspaces
- **Collection Counts**: Cached in `itemCount` field
- **Member Queries**: Indexed lookups on workspaceId
- **Activity Logging**: Asynchronous logging to prevent blocking
- **Pagination**: Required for large datasets

### Scalability
- Stateless API design allows horizontal scaling
- Job queue (BullMQ) handles async operations
- Database indexes prevent N+1 queries
- Caching layer for frequently accessed data

---

## Monitoring & Observability

### Metrics to Track
- Alert delivery success rate per channel
- Average delivery latency
- Failed delivery retry rate
- Workspace member activity
- Collection sharing engagement

### Logs
- Alert delivery attempts with status
- Permission denial attempts
- Failed validation attempts
- Async job execution

### Alerts
- Alert delivery failure rate > 5%
- Database query time > 1s
- API response time > 500ms
- Memory usage anomalies

---

## Future Enhancements

1. **Webhooks Signature Verification**: Verify Slack/webhook signatures
2. **Real-time Collaboration**: WebSocket updates for team changes
3. **Trend Analytics**: Analytics on collection performance
4. **Workflow Automation**: IFTTT-style automation
5. **API Keys**: User-managed API keys for programmatic access
6. **Custom Email Templates**: User-defined email designs
7. **Mobile App**: Native iOS/Android with push notifications
8. **Slack Integration**: Commands like `/subscribe-trend`
9. **Teams Support**: Microsoft Teams notifications
10. **Scheduled Reports**: Custom report generation and mailing

---

## Support

For issues, feature requests, or questions:
- GitHub Issues: [link to issues]
- Email: support@trendhijacker.com
- Docs: [link to full documentation]
