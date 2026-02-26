# API Contract: Shakedowns

**Feature**: 001-community-shakedowns
**Base Path**: `/api/shakedowns`

## Endpoints

### GET `/api/shakedowns`

List shakedowns with filtering and pagination.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | `created_at` of last item for pagination |
| `limit` | number | No | Items per page (default: 20, max: 50) |
| `status` | `open` \| `completed` \| `archived` | No | Filter by status |
| `experience` | `beginner` \| `intermediate` \| `experienced` \| `expert` | No | Filter by experience level |
| `season` | string | No | Filter by season (from loadout) |
| `tripType` | string | No | Filter by trip type (from loadout) |
| `search` | string | No | Search trip name and gear items |
| `sort` | `recent` \| `popular` \| `unanswered` | No | Sort order (default: recent) |
| `friendsFirst` | boolean | No | Prioritize friends' shakedowns |

**Response** (200 OK):
```typescript
{
  shakedowns: ShakedownWithAuthor[];
  hasMore: boolean;
  nextCursor: string | null;
}
```

**Errors**:
- 401: Not authenticated
- 500: Database error

---

### POST `/api/shakedowns`

Create a new shakedown request.

**Request Body**:
```typescript
{
  loadoutId: string;          // UUID of existing loadout
  tripName: string;           // 1-100 chars
  tripStartDate: string;      // ISO date
  tripEndDate: string;        // ISO date
  experienceLevel: ExperienceLevel;
  concerns?: string;          // Optional, max 1000 chars
  privacy: 'public' | 'friends_only' | 'private';  // Default: friends_only
}
```

**Response** (201 Created):
```typescript
{
  shakedown: Shakedown;
  shareUrl?: string;  // Only if privacy = 'public'
}
```

**Errors**:
- 400: Invalid input (Zod validation)
- 401: Not authenticated
- 404: Loadout not found or not owned by user
- 429: Rate limit exceeded

---

### GET `/api/shakedowns/[id]`

Get shakedown details with loadout and feedback.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Shakedown UUID |

**Response** (200 OK):
```typescript
{
  shakedown: ShakedownWithAuthor;
  loadout: LoadoutWithItems;
  feedback: FeedbackWithAuthor[];
  isOwner: boolean;
  isBookmarked: boolean;
  userVotes: string[];  // Feedback IDs user marked helpful
}
```

**Errors**:
- 401: Not authenticated
- 403: Access denied (privacy restriction)
- 404: Shakedown not found

---

### PATCH `/api/shakedowns/[id]`

Update shakedown (owner only).

**Request Body**:
```typescript
{
  tripName?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  experienceLevel?: ExperienceLevel;
  concerns?: string;
  privacy?: ShakedownPrivacy;
}
```

**Response** (200 OK):
```typescript
{
  shakedown: Shakedown;
}
```

**Errors**:
- 400: Invalid input
- 401: Not authenticated
- 403: Not owner
- 404: Not found

---

### DELETE `/api/shakedowns/[id]`

Delete shakedown (soft-delete, owner only).

**Response** (204 No Content)

**Errors**:
- 401: Not authenticated
- 403: Not owner
- 404: Not found

---

### POST `/api/shakedowns/[id]/complete`

Mark shakedown as complete.

**Request Body**:
```typescript
{
  helpfulFeedbackIds?: string[];  // Optional: mark these as helpful
}
```

**Response** (200 OK):
```typescript
{
  shakedown: Shakedown;
  badgesAwarded?: Badge[];  // If any contributors earned badges
}
```

**Errors**:
- 400: Already completed/archived
- 401: Not authenticated
- 403: Not owner
- 404: Not found

---

### POST `/api/shakedowns/[id]/reopen`

Reopen a completed shakedown (before archive).

**Response** (200 OK):
```typescript
{
  shakedown: Shakedown;
}
```

**Errors**:
- 400: Already archived (cannot reopen)
- 401: Not authenticated
- 403: Not owner
- 404: Not found

---

## Types

```typescript
interface Shakedown {
  id: string;
  ownerId: string;
  loadoutId: string;
  tripName: string;
  tripStartDate: string;
  tripEndDate: string;
  experienceLevel: ExperienceLevel;
  concerns: string | null;
  privacy: ShakedownPrivacy;
  shareToken: string | null;
  status: ShakedownStatus;
  feedbackCount: number;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
}

interface ShakedownWithAuthor extends Shakedown {
  authorName: string;
  authorAvatar: string | null;
  loadoutName: string;
  totalWeightGrams: number;
  itemCount: number;
}

type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced' | 'expert';
type ShakedownPrivacy = 'public' | 'friends_only' | 'private';
type ShakedownStatus = 'open' | 'completed' | 'archived';
```
