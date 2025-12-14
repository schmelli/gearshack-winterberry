# Data Model: Shared Loadout Enhancement

**Feature**: 048-shared-loadout-enhancement
**Date**: 2025-12-14

## Entity Relationship Diagram

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│      profiles       │     │      loadout_shares      │     │   loadout_comments  │
│     (existing)      │     │       (existing)         │     │     (existing)      │
├─────────────────────┤     ├──────────────────────────┤     ├─────────────────────┤
│ id (PK)             │◄────┤ owner_id (FK)            │     │ id (PK)             │
│ display_name        │     │ share_token (PK)         │◄────┤ share_token (FK)    │
│ avatar_url          │     │ loadout_id (FK)          │     │ item_id             │
│ trail_name          │     │ allow_comments           │     │ author              │
│ bio                 │     │ payload (JSONB)          │     │ message             │
│ messaging_privacy   │     │ created_at               │     │ created_at          │
│ ...                 │     └──────────────────────────┘     └─────────────────────┘
└─────────────────────┘              │                                  │
        │                            │                                  │
        │                            │                                  │
        ▼                            ▼                                  ▼
┌─────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│     gear_items      │     │   notifications (NEW)    │     │  (TRIGGER)          │
│     (extended)      │     │                          │     │ notify_loadout_     │
├─────────────────────┤     ├──────────────────────────┤     │ owner() creates     │
│ id (PK)             │     │ id (PK)                  │     │ notification on     │
│ user_id (FK)        │     │ user_id (FK)→profiles    │     │ comment insert      │
│ name                │     │ type                     │     └─────────────────────┘
│ brand               │     │ reference_type           │
│ status              │     │ reference_id             │
│ ...existing...      │     │ message                  │
│                     │     │ is_read                  │
│ source_share_token* │─────┤ created_at               │
│ (NEW, nullable FK)  │     └──────────────────────────┘
└─────────────────────┘

* = New column added to existing table
```

## Schema Changes

### 1. gear_items (Extended)

**Purpose**: Add source tracking for wishlist items imported from shared loadouts

```sql
-- Add source reference column to existing gear_items table
ALTER TABLE gear_items ADD COLUMN IF NOT EXISTS
  source_share_token TEXT REFERENCES loadout_shares(share_token) ON DELETE SET NULL;

-- Index for querying items by source
CREATE INDEX IF NOT EXISTS idx_gear_items_source_share ON gear_items(source_share_token)
  WHERE source_share_token IS NOT NULL;
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| source_share_token | TEXT | YES | NULL | FK to loadout_shares for wishlist items imported from shared loadouts |

**Constraints**:
- Foreign key to `loadout_shares.share_token` with ON DELETE SET NULL
- Only populated for items with `status = 'wishlist'` added from shared loadouts

### 2. notifications (New Table)

**Purpose**: Store user notifications including comment alerts

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'loadout_comment',
    'message_received',
    'friend_request',
    'gear_trade',
    'system'
  )),
  reference_type TEXT, -- 'loadout_comment', 'message', 'user', etc.
  reference_id TEXT,   -- UUID or token of the referenced entity
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user's unread notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Index for user's all notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| user_id | UUID | NO | - | FK to profiles, notification recipient |
| type | TEXT | NO | - | Notification category |
| reference_type | TEXT | YES | NULL | Type of referenced entity |
| reference_id | TEXT | YES | NULL | ID/token of referenced entity |
| message | TEXT | NO | - | Human-readable notification text |
| is_read | BOOLEAN | NO | false | Read status |
| created_at | TIMESTAMPTZ | NO | NOW() | When created |

### 3. Comment Notification Trigger

**Purpose**: Automatically create notification when comment is posted

```sql
-- Function to notify loadout owner on comment
CREATE OR REPLACE FUNCTION notify_loadout_owner_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_loadout_name TEXT;
BEGIN
  -- Get owner ID and loadout name from the share
  SELECT owner_id, (payload->>'loadout'->>'name')::TEXT
  INTO v_owner_id, v_loadout_name
  FROM loadout_shares
  WHERE share_token = NEW.share_token;

  -- Only notify if owner exists
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, reference_type, reference_id, message)
    VALUES (
      v_owner_id,
      'loadout_comment',
      'loadout_comment',
      NEW.id::TEXT,
      COALESCE(NEW.author, 'Someone') || ' commented on your loadout'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on comment insert
DROP TRIGGER IF EXISTS on_loadout_comment_notify ON loadout_comments;
CREATE TRIGGER on_loadout_comment_notify
AFTER INSERT ON loadout_comments
FOR EACH ROW EXECUTE FUNCTION notify_loadout_owner_on_comment();
```

## TypeScript Types

### Extended SharedLoadoutPayload

```typescript
// types/sharing.ts - Extended payload with additional fields for GearCard

export interface SharedLoadoutPayload {
  loadout: {
    id: string;
    name: string;
    description: string | null;
    tripDate: string | null;
    activityTypes: ActivityType[];
    seasons: Season[];
  };
  items: SharedGearItem[];
}

export interface SharedGearItem {
  id: string;
  name: string;
  brand: string | null;
  primaryImageUrl: string | null;
  categoryId: string | null;
  weightGrams: number | null;
  isWorn: boolean;
  isConsumable: boolean;
  // New fields for GearCard rendering
  description: string | null;
  nobgImages: NobgImages | null;
}

// Owner profile data joined from profiles table
export interface SharedLoadoutOwner {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  trailName: string | null;
  bio: string | null;
  locationName: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  website: string | null;
  messagingPrivacy: 'everyone' | 'friends_only' | 'nobody';
}

// Full shared loadout with owner
export interface SharedLoadoutWithOwner {
  shareToken: string;
  payload: SharedLoadoutPayload;
  allowComments: boolean;
  createdAt: string;
  owner: SharedLoadoutOwner | null;
}
```

### Notification Type

```typescript
// types/notifications.ts - New notification types

export type NotificationType =
  | 'loadout_comment'
  | 'message_received'
  | 'friend_request'
  | 'gear_trade'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  referenceType: string | null;
  referenceId: string | null;
  message: string;
  isRead: boolean;
  createdAt: Date;
}
```

### Wishlist Item Creation

```typescript
// When adding to wishlist from shared loadout
export interface WishlistItemFromShare {
  // Copied from shared item
  name: string;
  brand: string | null;
  primaryImageUrl: string | null;
  categoryId: string | null;
  weightGrams: number | null;
  description: string | null;
  // Set automatically
  status: 'wishlist';
  sourceShareToken: string;
}
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update (mark read) their own notifications
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Only triggers/functions can insert notifications
CREATE POLICY "System inserts notifications"
  ON notifications FOR INSERT
  WITH CHECK (false); -- Blocked for regular users, function uses SECURITY DEFINER
```

## Validation Rules

1. **source_share_token**: Can only be set when `status = 'wishlist'`
2. **notifications.type**: Must be one of the allowed enum values
3. **notifications.reference_id**: Should be a valid ID/token (not enforced by FK for flexibility)
4. **Comment author**: Validated at application level (trimmed, reasonable length)

## Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| gear_items | source_share_token (partial) | Find items imported from specific share |
| notifications | (user_id, is_read, created_at DESC) | Unread notifications for user |
| notifications | (user_id, created_at DESC) | All notifications for user |

## Migration Order

1. Add `source_share_token` column to `gear_items`
2. Create `notifications` table
3. Create notification trigger function
4. Create trigger on `loadout_comments`
5. Add RLS policies to `notifications`
