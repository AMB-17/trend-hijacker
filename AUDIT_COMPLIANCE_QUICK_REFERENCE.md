# Quick Reference: Audit & Compliance API

## Admin Endpoints

### Query Audit Logs
```bash
GET /api/admin/audit-logs?user_id=USER_ID&action=create_trend&limit=50&offset=0
```

### Export Audit Logs
```bash
POST /api/admin/audit-logs/export
Content-Type: application/json

{
  "format": "csv",
  "user_id": "optional-user-id",
  "action": "optional-action",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z"
}
```

### Get Audit Statistics
```bash
GET /api/admin/audit-logs/statistics
```

### Delete Old Logs
```bash
DELETE /api/admin/audit-logs/old?days=90
```

### Get Compliance Report
```bash
GET /api/admin/compliance/reports?type=gdpr&workspace_id=WORKSPACE_ID

# Types: gdpr, soc2, hipaa
```

### Export Compliance Report
```bash
POST /api/admin/compliance/export
Content-Type: application/json

{
  "format": "json",
  "report_type": "gdpr",
  "workspace_id": "WORKSPACE_ID"
}
```

### Manage Retention Policies
```bash
# Get policies
GET /api/admin/retention-policies?workspace_id=WORKSPACE_ID

# Update policy
PUT /api/admin/retention-policies/POLICY_ID
Content-Type: application/json

{
  "retention_days": 180,
  "enabled": true,
  "archive_location": "s3://archive/2024/"
}

# Run policies
POST /api/admin/compliance/run-retention
```

## User Endpoints

### Export Personal Data
```bash
GET /api/user/export-data?format=json
# Returns: { id, downloadToken, expiresAt, downloadUrl }
```

### Download Exported Data
```bash
GET /api/user/export-data/EXPORT_ID/download?token=TOKEN
# Returns: Streamed file
```

### Check Export Status
```bash
GET /api/user/export-status/EXPORT_ID
# Returns: { status, createdAt, expiresAt, downloadedAt }
```

### Request Account Deletion
```bash
POST /api/user/delete-account
Content-Type: application/json

{
  "confirm_deletion": true,
  "reason": "optional reason"
}
# Returns: { id, status, requestedAt }
```

### Check Deletion Status
```bash
GET /api/user/deletion-status
# Returns: { hasRequest, status, requestedAt, completedAt }
```

### Cancel Deletion
```bash
POST /api/user/cancel-deletion
Content-Type: application/json

{
  "deletion_request_id": "REQUEST_ID"
}
```

### Privacy Settings
```bash
# Get settings
GET /api/user/privacy-settings

# Update settings
PUT /api/user/privacy-settings
Content-Type: application/json

{
  "data_collection": "minimal",
  "marketing_emails": false,
  "analytics_tracking": true,
  "third_party_sharing": false
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    /* endpoint-specific data */
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Audit Log Entry Example
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "action": "create_trend",
  "resourceType": "trend",
  "resourceId": "trend-456",
  "beforeValue": null,
  "afterValue": {
    "title": "New Trend",
    "summary": "Description",
    "opportunityScore": 0.85
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "status": "success",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Query Examples

### Get all failed operations in last 7 days
```bash
GET /api/admin/audit-logs?status=failed&start_date=2024-01-08T00:00:00Z
```

### Get all deletions by a user
```bash
GET /api/admin/audit-logs?user_id=USER_ID&action=delete_trend
```

### Export all audit logs for compliance
```bash
POST /api/admin/audit-logs/export
{
  "format": "csv",
  "start_date": "2024-01-01T00:00:00Z"
}
```

### Generate SOC2 report
```bash
GET /api/admin/compliance/reports?type=soc2&workspace_id=WORKSPACE_ID
```

## Common Filter Values

### Actions
- `create_trend`
- `create_alert`
- `update_trend`
- `update_alert`
- `delete_trend`
- `delete_alert`
- `update_user`
- `delete_user`

### Resource Types
- `trend`
- `alert`
- `user`
- `workspace`
- `collection`

### Status
- `success` - Operation completed successfully
- `failed` - Operation failed

### Data Types (Retention)
- `audit_logs` - Default 365 days
- `auth_logs` - Default 90 days
- `error_logs` - Default 30 days

### Export Formats
- `json` - Structured format
- `csv` - Spreadsheet format

### Report Types
- `gdpr` - GDPR compliance report
- `soc2` - SOC2 compliance report
- `hipaa` - HIPAA compliance report

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid request (bad format) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (invalid token) |
| 404 | Not found (resource doesn't exist) |
| 409 | Conflict (deletion already in progress) |
| 410 | Gone (download link expired) |
| 500 | Internal server error |

## Rate Limits

- Admin endpoints: 100 requests/minute
- User endpoints: 100 requests/minute
- Export endpoints: 10 requests/minute
- Large exports may timeout - use pagination

## Authentication

All endpoints require authentication:
```bash
Authorization: Bearer JWT_TOKEN
```

The `userId` is extracted from the JWT token for user endpoints.

## Compliance References

### GDPR
- Article 15: Right of access
- Article 17: Right to erasure
- Article 20: Right to data portability
- Article 5: Lawfulness of processing
- Article 32: Security of processing

### SOC2
- CC6.1: Audit logs and monitoring
- CC7.2: System monitoring
- A1.1: Communication of objectives

### HIPAA
- 45 CFR 164.312(a)(2)(i): Audit controls
- 45 CFR 164.312(b): Audit logs
- 45 CFR 164.308(a)(7): Backup and recovery

## Performance Tips

1. **Pagination**: Use limit/offset for large result sets
2. **Filtering**: Always filter by date range when possible
3. **Exports**: Export to CSV for large datasets
4. **Retention**: Run retention cleanup during off-hours
5. **Archives**: Archive old logs to S3/cold storage

## Monitoring

### Alerts to Configure
- Failed deletion requests
- Export downloads after expiration
- Unusual audit log volumes (> 10k/hour)
- Rapid cascading deletes
- Failed operations by action type

### Key Metrics
- Total audit logs
- Success rate (%)
- Average log age
- Active deletion requests
- Export download rate
