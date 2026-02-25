# API Contract: Memory Deletion Endpoint

**Endpoint**: `DELETE /api/mastra/memory`
**Version**: 1.0.0
**Created**: 2025-12-20

---

## Overview

Implements GDPR Article 17 Right to Erasure by deleting all conversation memory and related data for the authenticated user.

---

## Request

### HTTP Method
`DELETE`

### URL
```
/api/mastra/memory
```

### Headers

| Header | Required | Value | Description |
|--------|----------|-------|-------------|
| `Content-Type` | Yes | `application/json` | Request body format |
| `Authorization` | Yes | `Bearer <token>` | Supabase Auth JWT |

### Authentication

**Required**: Yes

Uses existing Supabase authentication. The JWT token must be valid and contain a `user_id` claim.

**Unauthorized Response**:
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication required"
}
```
Status: `401 Unauthorized`

---

### Request Body Schema

```typescript
interface MemoryDeletionRequest {
  confirmDeletion: boolean;     // Must be true to proceed
  reason?: string;              // Optional reason for audit trail
}
```

### Example Request

```json
{
  "confirmDeletion": true,
  "reason": "User requested data deletion via settings page"
}
```

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| `confirmDeletion` | Required, must be `true` | "Deletion confirmation required" |
| `reason` | Optional, max 500 chars | "Reason must be 500 characters or less" |

---

## Response

### Success Response

**Status**: `202 Accepted`

**Content-Type**: `application/json`

```typescript
interface MemoryDeletionResponse {
  deletionId: string;                       // UUID tracking this deletion request
  status: 'pending' | 'processing';         // Current status
  estimatedCompletionTime: string;          // ISO 8601 timestamp
  scopeOfDeletion: {
    conversationMemory: boolean;            // Will delete conversation_memory records
    workflowHistory: boolean;               // Will delete workflow_executions records
    rateLimitTracking: boolean;             // Will delete rate_limit_tracking records
    structuredLogs: boolean;                // Will anonymize userId in logs
  };
  slaGuarantee: string;                     // "Completed within 24 hours"
}
```

### Example Success Response

```json
{
  "deletionId": "770e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "estimatedCompletionTime": "2025-12-21T14:30:00Z",
  "scopeOfDeletion": {
    "conversationMemory": true,
    "workflowHistory": true,
    "rateLimitTracking": true,
    "structuredLogs": true
  },
  "slaGuarantee": "Completed within 24 hours"
}
```

---

## Deletion Process

### Timeline

1. **Request Received** (T+0s): API endpoint creates `gdpr_deletion_records` entry with `status='pending'`
2. **Background Job Starts** (T+0-60s): Deletion worker picks up the request, updates `status='processing'`
3. **Data Deletion** (T+1m-24h): Deletes records from all tables:
   - `conversation_memory` (all user messages)
   - `workflow_executions` (all user workflows)
   - `rate_limit_tracking` (all user rate limit data)
   - Anonymizes `userId` in structured logs (preserves anonymous metrics)
4. **Completion** (T<24h): Updates `status='completed'`, sets `completed_at` timestamp

**SLA**: Deletion completes within **24 hours** of request.

---

### Deletion Scope

| Data Type | Action | Details |
|-----------|--------|---------|
| **Conversation Memory** | DELETE | All records in `conversation_memory` where `user_id` matches |
| **Workflow History** | DELETE | All records in `workflow_executions` where `user_id` matches |
| **Rate Limit Tracking** | DELETE | All records in `rate_limit_tracking` where `user_id` matches |
| **Structured Logs** | ANONYMIZE | Replace `userId` field with `<deleted-user>` in JSON logs |
| **Metrics** | PRESERVE | Anonymous metrics (counts, latencies) remain intact |
| **User Account** | PRESERVE | Supabase `auth.users` record NOT deleted (user can still log in) |

**Note**: This endpoint only deletes Mastra-related data. User account deletion is handled separately via Supabase Auth.

---

## Checking Deletion Status

### GET Request

```
GET /api/mastra/memory/deletion-status/:deletionId
```

**Response**:
```json
{
  "deletionId": "770e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "requestedAt": "2025-12-20T14:30:00Z",
  "completedAt": "2025-12-20T14:35:22Z",
  "recordsDeleted": 1247,
  "errorMessage": null
}
```

---

## Error Responses

### 400 Bad Request

**Missing confirmation**:
```json
{
  "error": "ValidationError",
  "message": "Deletion confirmation required",
  "field": "confirmDeletion"
}
```

### 401 Unauthorized

**Missing or invalid auth token**:
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication required"
}
```

### 409 Conflict

**Deletion already in progress**:
```json
{
  "error": "DeletionInProgress",
  "message": "A deletion request is already being processed for this user",
  "existingDeletionId": "770e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "estimatedCompletionTime": "2025-12-21T14:30:00Z"
}
```

### 500 Internal Server Error

**Background job failed to start**:
```json
{
  "error": "DeletionFailed",
  "message": "Failed to initiate deletion process. Please try again or contact support.",
  "details": "Database connection timeout"
}
```

---

## Observability

### Structured Logging

**Deletion Request Log** (JSON format):
```json
{
  "timestamp": "2025-12-20T14:30:00.123Z",
  "level": "info",
  "service": "mastra-memory-deletion",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "deletion_requested",
  "metadata": {
    "deletionId": "770e8400-e29b-41d4-a716-446655440000",
    "reason": "User requested data deletion via settings page",
    "estimatedCompletionTime": "2025-12-21T14:30:00Z"
  }
}
```

**Deletion Completed Log**:
```json
{
  "timestamp": "2025-12-20T14:35:22.456Z",
  "level": "info",
  "service": "mastra-memory-deletion",
  "userId": "<deleted-user>",  // Anonymized after deletion
  "event": "deletion_completed",
  "metadata": {
    "deletionId": "770e8400-e29b-41d4-a716-446655440000",
    "recordsDeleted": 1247,
    "durationMs": 322456
  }
}
```

### Metrics Exported

**Prometheus Format** (via `/api/mastra/metrics`):
```
mastra_memory_deletions_total{status="requested"} 45
mastra_memory_deletions_total{status="completed"} 42
mastra_memory_deletions_total{status="failed"} 3
mastra_memory_deletion_duration_ms{quantile="0.5"} 120000
mastra_memory_deletion_duration_ms{quantile="0.95"} 3600000
mastra_memory_deletion_duration_ms{quantile="0.99"} 14400000
mastra_memory_deletion_records_deleted{quantile="0.5"} 500
mastra_memory_deletion_records_deleted{quantile="0.95"} 5000
```

---

## Frontend Integration

### Settings Page Example

```typescript
import { useState } from 'react';
import { toast } from 'sonner';

export function DeleteMemoryButton() {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteMemory() {
    if (!confirm('This will permanently delete all your AI conversation history. Continue?')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/mastra/memory', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          confirmDeletion: true,
          reason: 'User initiated via settings',
        }),
      });

      if (!response.ok) {
        throw new Error('Deletion failed');
      }

      const result = await response.json();

      toast.success(
        `Deletion request submitted. Your data will be removed within 24 hours.`,
        { description: `Deletion ID: ${result.deletionId}` }
      );
    } catch (error) {
      toast.error('Failed to delete memory. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDeleteMemory}
      disabled={isDeleting}
      className="bg-destructive text-destructive-foreground"
    >
      {isDeleting ? 'Deleting...' : 'Delete All AI Memory'}
    </button>
  );
}
```

---

## Compliance Notes

### GDPR Article 17 Right to Erasure

This endpoint implements the GDPR requirement for users to request deletion of their personal data.

**Covered**:
- ✅ User-initiated deletion request
- ✅ Deletion within reasonable timeframe (24 hours)
- ✅ Confirmation of deletion status
- ✅ Audit trail of deletion requests

**Not Covered** (handled separately):
- Account deletion (via Supabase Auth)
- Gear inventory deletion (separate feature)
- Loadout data deletion (separate feature)

### Data Minimization

After deletion, only the following data is retained:
- Anonymous metrics (no userId)
- Aggregated statistics (no personally identifiable information)
- Audit trail in `gdpr_deletion_records` (for compliance proof)

---

## Security Considerations

1. **Authentication**: Deletion only affects the authenticated user's data
2. **Confirmation Required**: `confirmDeletion: true` prevents accidental deletions
3. **Audit Trail**: All deletion requests logged for compliance verification
4. **Irreversible**: No recovery mechanism after deletion completes
5. **Rate Limiting**: Not applicable (users can only delete their own data once)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-20 | Initial contract definition |
