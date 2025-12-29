# API Contract: Helpful Votes

**Feature**: 001-community-shakedowns
**Base Path**: `/api/shakedowns/helpful`

## Endpoints

### POST `/api/shakedowns/helpful`

Mark feedback as helpful (shakedown owner only).

**Request Body**:
```typescript
{
  feedbackId: string;  // UUID
}
```

**Response** (201 Created):
```typescript
{
  success: true;
  feedbackId: string;
  newHelpfulCount: number;
  badgeAwarded?: Badge;  // If author earned a new badge
}
```

**Validation Rules**:
- Only shakedown owner can mark feedback as helpful
- Cannot mark own feedback as helpful
- Cannot vote on same feedback twice

**Side Effects**:
- Increments `helpful_count` on feedback
- Increments `shakedown_helpful_received` on author's profile
- Checks and awards badges at thresholds (10, 50, 100)
- Sends notification to feedback author

**Errors**:
- 400: Already voted or own feedback
- 401: Not authenticated
- 403: Not shakedown owner
- 404: Feedback not found

---

### DELETE `/api/shakedowns/helpful`

Remove helpful vote.

**Request Body**:
```typescript
{
  feedbackId: string;
}
```

**Response** (200 OK):
```typescript
{
  success: true;
  feedbackId: string;
  newHelpfulCount: number;
}
```

**Errors**:
- 400: No vote to remove
- 401: Not authenticated
- 403: Not the voter
- 404: Feedback not found

---

### GET `/api/shakedowns/helpful/[shakedownId]`

Get user's helpful votes for a shakedown.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shakedownId` | string | Yes | Shakedown UUID |

**Response** (200 OK):
```typescript
{
  votes: string[];  // Array of feedback IDs user marked helpful
}
```

**Errors**:
- 401: Not authenticated
- 404: Shakedown not found

---

## Types

```typescript
interface HelpfulVote {
  id: string;
  feedbackId: string;
  voterId: string;
  createdAt: string;
}

interface Badge {
  id: string;
  type: BadgeType;
  awardedAt: string;
}

type BadgeType = 'shakedown_helper' | 'trail_expert' | 'community_legend';
```

## Badge Thresholds

| Badge | Threshold | Description |
|-------|-----------|-------------|
| `shakedown_helper` | 10 helpful votes | First tier recognition |
| `trail_expert` | 50 helpful votes | Experienced contributor |
| `community_legend` | 100 helpful votes | Top community member |
