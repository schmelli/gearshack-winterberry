# API Contract: Shakedown Bookmarks

**Feature**: 001-community-shakedowns
**Base Path**: `/api/shakedowns/bookmarks`

## Endpoints

### GET `/api/shakedowns/bookmarks`

Get user's bookmarked shakedowns.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | `created_at` of last bookmark |
| `limit` | number | No | Items per page (default: 20) |

**Response** (200 OK):
```typescript
{
  bookmarks: BookmarkWithShakedown[];
  hasMore: boolean;
  nextCursor: string | null;
}
```

**Errors**:
- 401: Not authenticated

---

### POST `/api/shakedowns/bookmarks`

Bookmark a shakedown.

**Request Body**:
```typescript
{
  shakedownId: string;
  note?: string;  // Max 200 chars
}
```

**Response** (201 Created):
```typescript
{
  bookmark: Bookmark;
}
```

**Errors**:
- 400: Already bookmarked
- 401: Not authenticated
- 403: No access to shakedown (privacy)
- 404: Shakedown not found

---

### PATCH `/api/shakedowns/bookmarks/[id]`

Update bookmark note.

**Request Body**:
```typescript
{
  note: string | null;  // Max 200 chars, null to remove
}
```

**Response** (200 OK):
```typescript
{
  bookmark: Bookmark;
}
```

**Errors**:
- 400: Invalid note
- 401: Not authenticated
- 403: Not owner
- 404: Bookmark not found

---

### DELETE `/api/shakedowns/bookmarks/[id]`

Remove bookmark.

**Response** (204 No Content)

**Errors**:
- 401: Not authenticated
- 403: Not owner
- 404: Bookmark not found

---

## Types

```typescript
interface Bookmark {
  id: string;
  userId: string;
  shakedownId: string;
  note: string | null;
  createdAt: string;
}

interface BookmarkWithShakedown extends Bookmark {
  shakedown: ShakedownWithAuthor;
}
```
