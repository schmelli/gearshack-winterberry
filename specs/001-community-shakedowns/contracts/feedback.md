# API Contract: Shakedown Feedback

**Feature**: 001-community-shakedowns
**Base Path**: `/api/shakedowns/feedback`

## Endpoints

### POST `/api/shakedowns/feedback`

Add feedback to a shakedown.

**Request Body**:
```typescript
{
  shakedownId: string;        // UUID
  content: string;            // 1-2000 chars, markdown supported
  parentId?: string;          // For replies (max depth 3)
  gearItemId?: string;        // For item-specific feedback
}
```

**Response** (201 Created):
```typescript
{
  feedback: FeedbackWithAuthor;
}
```

**Validation Rules**:
- `content`: Required, 1-2000 characters
- `parentId`: If provided, must be valid feedback on same shakedown
- `gearItemId`: If provided, must be valid gear item in shakedown's loadout
- Reply depth: If `parentId` provided, resulting depth must be ≤ 3

**Errors**:
- 400: Invalid input or depth exceeded
- 401: Not authenticated
- 403: Shakedown is completed/archived (no new feedback allowed)
- 404: Shakedown, parent, or gear item not found
- 429: Rate limit exceeded (50/day)

---

### GET `/api/shakedowns/feedback/[id]`

Get single feedback with replies.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Feedback UUID |

**Response** (200 OK):
```typescript
{
  feedback: FeedbackWithAuthor;
  replies: FeedbackWithAuthor[];
}
```

**Errors**:
- 401: Not authenticated
- 404: Feedback not found or hidden

---

### PATCH `/api/shakedowns/feedback/[id]`

Edit feedback (author only, within 30-minute window).

**Request Body**:
```typescript
{
  content: string;  // 1-2000 chars
}
```

**Response** (200 OK):
```typescript
{
  feedback: FeedbackWithAuthor;
}
```

**Errors**:
- 400: Invalid content or edit window expired
- 401: Not authenticated
- 403: Not author
- 404: Not found

---

### DELETE `/api/shakedowns/feedback/[id]`

Delete feedback (soft-delete, author only).

**Response** (204 No Content)

**Errors**:
- 401: Not authenticated
- 403: Not author
- 404: Not found

---

### POST `/api/shakedowns/feedback/[id]/report`

Report feedback as spam/inappropriate.

**Request Body**:
```typescript
{
  reason: 'spam' | 'harassment' | 'off_topic' | 'other';
  details?: string;  // Max 500 chars
}
```

**Response** (201 Created):
```typescript
{
  reportId: string;
  message: string;  // "Report submitted. Content hidden pending review."
}
```

**Side Effects**:
- Feedback immediately soft-hidden (`is_hidden = true`)
- Notification sent to admins
- Reporter notified of resolution within 24h

**Errors**:
- 400: Invalid reason or already reported by user
- 401: Not authenticated
- 404: Feedback not found

---

## Types

```typescript
interface ShakedownFeedback {
  id: string;
  shakedownId: string;
  authorId: string;
  parentId: string | null;
  gearItemId: string | null;
  content: string;
  contentHtml: string | null;
  depth: 1 | 2 | 3;
  helpfulCount: number;
  isHidden: boolean;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackWithAuthor extends ShakedownFeedback {
  authorName: string;
  authorAvatar: string | null;
  authorReputation: number;
  gearItemName: string | null;  // If item-specific
}

// For building reply tree on client
interface FeedbackNode extends FeedbackWithAuthor {
  children: FeedbackNode[];
}
```

## Rate Limits

| Action | Limit | Window |
|--------|-------|--------|
| Create feedback | 50 | 24 hours |
| Edit feedback | 10 | 1 hour |
| Report feedback | 5 | 1 hour |

## Constants

```typescript
const FEEDBACK_CONSTANTS = {
  MAX_CONTENT_LENGTH: 2000,
  MAX_REPLY_DEPTH: 3,
  EDIT_WINDOW_MINUTES: 30,
  DAILY_FEEDBACK_LIMIT: 50,
};
```
