# Testing Guide: Audit Logging & Compliance

## Pre-Test Setup

1. **Start the API**
   ```bash
   cd apps/api
   npm install  # Install new dependencies
   npm run dev
   ```

2. **Verify Database** - New tables should be created automatically
   ```sql
   \dt audit_logs
   \dt data_deletion_requests
   \dt exported_data
   \dt retention_policies
   ```

3. **Get Auth Token** - Use existing auth endpoint
   ```bash
   POST /api/auth/login
   { "email": "test@example.com", "password": "password" }
   ```

## Test Suite

### 1. Audit Logging Middleware

**Test 1.1: Verify Action Logging**
```bash
# Create a trend (triggers POST)
POST /api/trends
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "title": "Test Trend",
  "summary": "Test Description",
  "opportunityScore": 0.85,
  "velocityScore": 0.5,
  "problemIntensity": 0.7,
  "noveltyScore": 0.6,
  "discussionCount": 0,
  "sourceCount": 0,
  "status": "emerging",
  "category": "technology"
}

# Verify in audit logs
GET /api/admin/audit-logs?action=create_trend
Authorization: Bearer ADMIN_TOKEN

# Expected: Should show the create action with before/after values
```

**Test 1.2: Update Logging**
```bash
# Update the trend
PUT /api/trends/{TREND_ID}
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "title": "Updated Trend",
  "summary": "Updated Description",
  "opportunityScore": 0.9
}

# Verify in audit logs
GET /api/admin/audit-logs?action=update_trend
```

**Test 1.3: Delete Logging**
```bash
# Delete the trend
DELETE /api/trends/{TREND_ID}
Authorization: Bearer YOUR_TOKEN

# Verify in audit logs
GET /api/admin/audit-logs?action=delete_trend&status=success
```

**Test 1.4: Failed Operations**
```bash
# Try to update non-existent resource
PUT /api/trends/invalid-id
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{ "title": "Test" }

# Should log with status: failed
GET /api/admin/audit-logs?status=failed
```

### 2. Audit Query Functionality

**Test 2.1: Filter by User**
```bash
GET /api/admin/audit-logs?user_id=USER_ID
Authorization: Bearer ADMIN_TOKEN

# Expected: Only logs for that user
```

**Test 2.2: Filter by Date Range**
```bash
GET /api/admin/audit-logs?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z
Authorization: Bearer ADMIN_TOKEN

# Expected: Logs within date range
```

**Test 2.3: Filter by Resource Type**
```bash
GET /api/admin/audit-logs?resource_type=trend
Authorization: Bearer ADMIN_TOKEN

# Expected: Only trend-related operations
```

**Test 2.4: Pagination**
```bash
GET /api/admin/audit-logs?limit=10&offset=0
Authorization: Bearer ADMIN_TOKEN

# Expected: Returns max 10 logs with total count
```

### 3. Statistics

**Test 3.1: Get Audit Statistics**
```bash
GET /api/admin/audit-logs/statistics
Authorization: Bearer ADMIN_TOKEN

# Expected Response:
{
  "success": true,
  "data": {
    "total_logs": 42,
    "successful_actions": 38,
    "failed_actions": 4,
    "unique_users": 5,
    "resource_types": 3,
    "earliest_log": "2024-01-01",
    "latest_log": "2024-01-15"
  }
}
```

### 4. Export Functionality

**Test 4.1: Export to JSON**
```bash
POST /api/admin/audit-logs/export
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "format": "json"
}

# Expected: JSON array of audit logs
```

**Test 4.2: Export to CSV**
```bash
POST /api/admin/audit-logs/export
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "format": "csv"
}

# Expected: CSV file with headers and rows
```

### 5. Compliance Reports

**Test 5.1: Generate GDPR Report**
```bash
GET /api/admin/compliance/reports?type=gdpr&workspace_id=default
Authorization: Bearer ADMIN_TOKEN

# Expected: GDPR compliance data including:
# - Data processing info
# - Retention policies
# - Data subject requests
# - Incident log
```

**Test 5.2: Generate SOC2 Report**
```bash
GET /api/admin/compliance/reports?type=soc2&workspace_id=default
Authorization: Bearer ADMIN_TOKEN

# Expected: SOC2 compliance data
```

**Test 5.3: Export Compliance Report**
```bash
POST /api/admin/compliance/export
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "format": "json",
  "report_type": "gdpr",
  "workspace_id": "default"
}

# Expected: JSON or CSV compliance report
```

### 6. User Data Export (GDPR Article 20)

**Test 6.1: Request Data Export**
```bash
GET /api/user/export-data?format=json
Authorization: Bearer USER_TOKEN

# Expected Response:
{
  "success": true,
  "data": {
    "id": "export-id",
    "exportType": "json",
    "downloadToken": "token-xxx",
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-22T10:30:00Z",
    "downloadUrl": "/api/user/export-data/export-id/download?token=token-xxx"
  }
}
```

**Test 6.2: Check Export Status**
```bash
GET /api/user/export-status/EXPORT_ID
Authorization: Bearer USER_TOKEN

# Expected: Status and progress info
```

**Test 6.3: Download Exported Data**
```bash
GET /api/user/export-data/EXPORT_ID/download?token=TOKEN
Authorization: Bearer USER_TOKEN

# Expected: File download starts
```

**Test 6.4: Expired Token**
```bash
# Wait 7+ days or manually expire token
GET /api/user/export-data/EXPORT_ID/download?token=EXPIRED_TOKEN
Authorization: Bearer USER_TOKEN

# Expected: 410 Gone response
```

### 7. Account Deletion (GDPR Article 17)

**Test 7.1: Request Deletion**
```bash
POST /api/user/delete-account
Authorization: Bearer USER_TOKEN
Content-Type: application/json

{
  "confirm_deletion": true,
  "reason": "No longer needed"
}

# Expected Response:
{
  "success": true,
  "data": {
    "id": "deletion-request-id",
    "status": "processing",
    "requestedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Test 7.2: Check Deletion Status**
```bash
GET /api/user/deletion-status
Authorization: Bearer USER_TOKEN

# Expected: Current deletion status
```

**Test 7.3: Verify Data Deleted**
After deletion completes:
```bash
# User sessions should be deleted
SELECT COUNT(*) FROM user_sessions WHERE user_id = USER_ID;
# Expected: 0

# User should be deleted
SELECT * FROM users WHERE id = USER_ID;
# Expected: No rows

# Audit logs should be anonymized
SELECT user_id, ip_address FROM audit_logs WHERE user_id = USER_ID;
# Expected: NULL values
```

**Test 7.4: Cancel Deletion (Before Processing)**
```bash
POST /api/user/cancel-deletion
Authorization: Bearer USER_TOKEN
Content-Type: application/json

{
  "deletion_request_id": "REQUEST_ID"
}

# Should succeed if status is 'pending'
```

### 8. Privacy Settings

**Test 8.1: Get Privacy Settings**
```bash
GET /api/user/privacy-settings
Authorization: Bearer USER_TOKEN

# Expected Response:
{
  "success": true,
  "data": {
    "data_collection": "all",
    "marketing_emails": false,
    "analytics_tracking": true,
    "third_party_sharing": false
  }
}
```

**Test 8.2: Update Privacy Settings**
```bash
PUT /api/user/privacy-settings
Authorization: Bearer USER_TOKEN
Content-Type: application/json

{
  "data_collection": "minimal",
  "marketing_emails": false,
  "analytics_tracking": false,
  "third_party_sharing": false
}

# Expected: Updated settings
```

### 9. Retention Policies

**Test 9.1: Get Retention Policies**
```bash
GET /api/admin/retention-policies?workspace_id=default
Authorization: Bearer ADMIN_TOKEN

# Expected: List of retention policies
```

**Test 9.2: Update Retention Policy**
```bash
PUT /api/admin/retention-policies/POLICY_ID
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "retention_days": 180,
  "enabled": true
}

# Expected: Updated policy
```

**Test 9.3: Manual Cleanup**
```bash
POST /api/admin/compliance/run-retention
Authorization: Bearer ADMIN_TOKEN

# Expected Response:
{
  "success": true,
  "data": {
    "processed": 3,
    "deleted": 245
  }
}
```

### 10. Edge Cases & Error Handling

**Test 10.1: Invalid Format**
```bash
GET /api/admin/audit-logs/export
POST /api/admin/audit-logs/export
Authorization: Bearer ADMIN_TOKEN

{
  "format": "xml"  # Invalid
}

# Expected: 400 Bad Request
```

**Test 10.2: Unauthorized Access**
```bash
GET /api/admin/audit-logs
# No Authorization header

# Expected: 401 Unauthorized
```

**Test 10.3: Non-Existent Export**
```bash
GET /api/user/export-status/invalid-id
Authorization: Bearer USER_TOKEN

# Expected: 404 Not Found
```

**Test 10.4: Invalid Token**
```bash
GET /api/user/export-data/valid-id/download?token=wrong-token
Authorization: Bearer USER_TOKEN

# Expected: 403 Forbidden
```

## Performance Tests

**Test P1: Large Audit Log Query**
```bash
GET /api/admin/audit-logs?limit=1000&offset=0
Authorization: Bearer ADMIN_TOKEN

# Expected: Response < 2 seconds
```

**Test P2: Statistics on Large Dataset**
```bash
GET /api/admin/audit-logs/statistics
Authorization: Bearer ADMIN_TOKEN

# Expected: Response < 5 seconds
```

**Test P3: Compliance Report Generation**
```bash
GET /api/admin/compliance/reports?type=gdpr&workspace_id=default
Authorization: Bearer ADMIN_TOKEN

# Expected: Response < 10 seconds
```

## Verification Checklist

- [ ] Audit logs created for all mutations
- [ ] IP addresses captured correctly
- [ ] User IDs recorded accurately
- [ ] Before/after values serialized properly
- [ ] Query filters work correctly
- [ ] Pagination returns correct counts
- [ ] CSV export properly escaped
- [ ] Admin reports generate without errors
- [ ] User can export their data
- [ ] Export tokens expire after 7 days
- [ ] Deletion cascade removes all user data
- [ ] Audit logs anonymized after deletion
- [ ] Privacy settings accessible and updatable
- [ ] Retention policies execute successfully
- [ ] Error responses appropriate
- [ ] Unauthorized access prevented
- [ ] Non-blocking middleware (requests complete within 100ms)

## Performance Benchmarks

| Operation | Target | Acceptable Range |
|-----------|--------|------------------|
| Query logs (10k results) | <2s | <5s |
| Export logs (CSV, 10k records) | <3s | <10s |
| Generate GDPR report | <5s | <15s |
| User data export | <2s | <5s |
| Deletion cascade | <3s | <10s |
| Statistics calculation | <2s | <5s |

## Monitoring After Deployment

1. **Check middleware latency**
   - Ensure requests don't slow down significantly
   - Target: < 50ms overhead per request

2. **Monitor audit log growth**
   - Expected: ~100-1000 logs/day depending on traffic
   - Alert: > 10k logs/hour

3. **Track deletion requests**
   - Monitor completion rates
   - Alert on failures

4. **Export usage**
   - Track token usage
   - Monitor download rates

5. **Database indexes**
   - Verify index usage with EXPLAIN ANALYZE
   - Monitor query performance
