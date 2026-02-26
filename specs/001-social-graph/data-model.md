# Data Model: Social Graph (Friends + Follow System)

**Feature**: 001-social-graph | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)

## Overview

This document defines the complete data model for the Social Graph feature, including new tables, modifications to existing tables, RPC functions, and TypeScript types.

---

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│  profiles   │────1:N──│  friend_requests │──N:1────│  profiles   │
│             │         │  (pending)       │         │             │
│  id (PK)    │         │  sender_id (FK)  │         │  id (PK)    │
│  privacy_   │         │  recipient_id(FK)│         │             │
│  preset     │         │  status          │         │             │
└─────────────┘         │  expires_at      │         └─────────────┘
       │                └──────────────────┘                │
       │                                                    │
       │                ┌──────────────────┐                │
       └────────N:M─────│   friendships    │────N:M─────────┘
                        │   (confirmed)    │
                        │  user_id (FK)    │
                        │  friend_id (FK)  │
                        │  created_at      │
                        └──────────────────┘
       │
       │                ┌──────────────────┐                │
       └────────1:N─────│   user_follows   │────N:1─────────┘
                        │   (one-way)      │
                        │  follower_id(FK) │
                        │  followed_id(FK) │
                        │  created_at      │
                        └──────────────────┘
       │
       │                ┌──────────────────┐
       └────────1:N─────│friend_activities │
                        │  user_id (FK)    │
                        │  activity_type   │
                        │  reference_*     │
                        └──────────────────┘
```

---

## New Tables

### 1. friend_requests

Stores pending friend requests with automatic expiration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `sender_id` | UUID | FK → profiles(id), NOT NULL | User sending the request |
| `recipient_id` | UUID | FK → profiles(id), NOT NULL | User receiving the request |
| `status` | friend_request_status | NOT NULL, DEFAULT 'pending' | Request status |
| `message` | TEXT | NULL, MAX 500 chars | Optional personal message |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When request was sent |
| `responded_at` | TIMESTAMPTZ | NULL | When request was accepted/declined |
| `expires_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() + 30 days | Auto-expiration timestamp |

**Enum: friend_request_status**
```sql
CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
```

**Constraints**
- `UNIQUE(sender_id, recipient_id)` - One pending request per pair
- `CHECK(sender_id != recipient_id)` - Cannot send request to self
- `CHECK(char_length(message) <= 500)` - Message length limit

**Indexes**
- `idx_friend_requests_recipient_pending` ON (recipient_id, status) WHERE status = 'pending'
- `idx_friend_requests_sender` ON (sender_id)
- `idx_friend_requests_expires` ON (expires_at) WHERE status = 'pending'

---

### 2. friendships

Stores confirmed bidirectional friendships. Each friendship is stored once (user_id < friend_id).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `user_id` | UUID | FK → profiles(id), NOT NULL | First user (lower UUID) |
| `friend_id` | UUID | FK → profiles(id), NOT NULL | Second user (higher UUID) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When friendship was established |

**Constraints**
- `UNIQUE(user_id, friend_id)` - One friendship record per pair
- `CHECK(user_id < friend_id)` - Ensures canonical ordering (prevents duplicates)

**Indexes**
- `idx_friendships_user` ON (user_id)
- `idx_friendships_friend` ON (friend_id)

**Note**: The `user_id < friend_id` constraint ensures each friendship is stored exactly once. Queries must check both directions.

---

### 3. user_follows

Stores unidirectional follow relationships. Migrated from existing `user_friends` table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `follower_id` | UUID | FK → profiles(id), NOT NULL | User doing the following |
| `followed_id` | UUID | FK → profiles(id), NOT NULL | User being followed |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When follow occurred |

**Primary Key**: `(follower_id, followed_id)`

**Constraints**
- `CHECK(follower_id != followed_id)` - Cannot follow self

**Indexes**
- `idx_user_follows_followed` ON (followed_id) - For follower count queries

---

### 4. friend_activities

Stores denormalized activity events for efficient feed queries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `user_id` | UUID | FK → profiles(id), NOT NULL | User who performed activity |
| `activity_type` | activity_type | NOT NULL | Type of activity |
| `reference_type` | TEXT | NOT NULL | Entity type (loadout, gear_item, etc.) |
| `reference_id` | UUID | NOT NULL | ID of referenced entity |
| `metadata` | JSONB | DEFAULT '{}' | Additional activity data |
| `visibility` | activity_visibility | NOT NULL, DEFAULT 'friends' | Who can see this |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When activity occurred |

**Enum: activity_type**
```sql
CREATE TYPE activity_type AS ENUM (
  'new_loadout',
  'loadout_shared',
  'marketplace_listing',
  'gear_added',
  'friend_added',
  'profile_updated'
);
```

**Enum: activity_visibility**
```sql
CREATE TYPE activity_visibility AS ENUM ('public', 'friends', 'private');
```

**Indexes**
- `idx_friend_activities_user_time` ON (user_id, created_at DESC)
- `idx_friend_activities_time` ON (created_at DESC) - For global feed (if needed)

**Realtime**: Enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE friend_activities;`

---

## Modified Tables

### profiles (additions)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `privacy_preset` | privacy_preset | DEFAULT 'everyone' | Privacy template |
| `follower_count` | INTEGER | DEFAULT 0 | Denormalized count (VIP only) |
| `account_type` | account_type | DEFAULT 'standard' | User account tier |

**Enum: privacy_preset**
```sql
CREATE TYPE privacy_preset AS ENUM ('only_me', 'friends_only', 'everyone', 'custom');
```

**Enum: account_type** (if not exists)
```sql
CREATE TYPE account_type AS ENUM ('standard', 'vip', 'merchant');
```

---

### notifications (type additions)

Add new notification types to the existing CHECK constraint:

```sql
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'loadout_comment',
    'message_received',
    'friend_request',
    'friend_request_accepted',
    'new_follower',
    'friend_activity',
    'gear_trade',
    'system',
    'gear_enrichment'
  ));
```

---

## RPC Functions

### 1. has_message_exchange

Checks if two users have exchanged messages (prerequisite for friend requests).

```sql
CREATE OR REPLACE FUNCTION has_message_exchange(p_user1 UUID, p_user2 UUID)
RETURNS BOOLEAN AS $$
-- See research.md for full implementation
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. send_friend_request

Sends a friend request with rate limiting and prerequisite checks.

```sql
CREATE OR REPLACE FUNCTION send_friend_request(
  p_recipient_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_rate_check JSON;
  v_has_exchange BOOLEAN;
  v_request_id UUID;
BEGIN
  -- Rate limit check (20/24h)
  SELECT check_and_increment_rate_limit(v_sender_id, 'friend_request', 20, 24) INTO v_rate_check;
  IF (v_rate_check->>'exceeded')::BOOLEAN THEN
    RETURN json_build_object('success', false, 'error', 'rate_limit_exceeded', 'resets_at', v_rate_check->>'resets_at');
  END IF;

  -- Check message exchange prerequisite
  SELECT has_message_exchange(v_sender_id, p_recipient_id) INTO v_has_exchange;
  IF NOT v_has_exchange THEN
    RETURN json_build_object('success', false, 'error', 'no_message_exchange');
  END IF;

  -- Check not already friends
  IF EXISTS (SELECT 1 FROM friendships WHERE
    (user_id = LEAST(v_sender_id, p_recipient_id) AND friend_id = GREATEST(v_sender_id, p_recipient_id))) THEN
    RETURN json_build_object('success', false, 'error', 'already_friends');
  END IF;

  -- Check no pending request exists
  IF EXISTS (SELECT 1 FROM friend_requests WHERE sender_id = v_sender_id AND recipient_id = p_recipient_id AND status = 'pending') THEN
    RETURN json_build_object('success', false, 'error', 'request_already_sent');
  END IF;

  -- Create request
  INSERT INTO friend_requests (sender_id, recipient_id, message)
  VALUES (v_sender_id, p_recipient_id, p_message)
  RETURNING id INTO v_request_id;

  -- Create notification for recipient
  INSERT INTO notifications (user_id, type, reference_type, reference_id, message)
  VALUES (p_recipient_id, 'friend_request', 'friend_request', v_request_id::TEXT, 'You have a new friend request');

  RETURN json_build_object('success', true, 'request_id', v_request_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. respond_to_friend_request

Accepts or declines a friend request.

```sql
CREATE OR REPLACE FUNCTION respond_to_friend_request(
  p_request_id UUID,
  p_accept BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request RECORD;
BEGIN
  -- Get request (must be recipient)
  SELECT * INTO v_request FROM friend_requests
  WHERE id = p_request_id AND recipient_id = v_user_id AND status = 'pending';

  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'request_not_found');
  END IF;

  IF p_accept THEN
    -- Update request status
    UPDATE friend_requests SET status = 'accepted', responded_at = NOW() WHERE id = p_request_id;

    -- Create friendship (canonical ordering)
    INSERT INTO friendships (user_id, friend_id)
    VALUES (LEAST(v_request.sender_id, v_user_id), GREATEST(v_request.sender_id, v_user_id));

    -- Notify sender
    INSERT INTO notifications (user_id, type, reference_type, reference_id, message)
    VALUES (v_request.sender_id, 'friend_request_accepted', 'profile', v_user_id::TEXT, 'Your friend request was accepted');

    -- Create activity events for both users
    INSERT INTO friend_activities (user_id, activity_type, reference_type, reference_id, visibility)
    VALUES
      (v_user_id, 'friend_added', 'profile', v_request.sender_id, 'friends'),
      (v_request.sender_id, 'friend_added', 'profile', v_user_id, 'friends');
  ELSE
    UPDATE friend_requests SET status = 'declined', responded_at = NOW() WHERE id = p_request_id;
  END IF;

  RETURN json_build_object('success', true, 'accepted', p_accept);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. are_friends

Checks if two users are friends.

```sql
CREATE OR REPLACE FUNCTION are_friends(p_user1 UUID, p_user2 UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE user_id = LEAST(p_user1, p_user2)
      AND friend_id = GREATEST(p_user1, p_user2)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 5. get_mutual_friends

Returns mutual friends between two users.

```sql
CREATE OR REPLACE FUNCTION get_mutual_friends(p_user1 UUID, p_user2 UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user1_friends AS (
    SELECT CASE WHEN f.user_id = p_user1 THEN f.friend_id ELSE f.user_id END AS fid
    FROM friendships f
    WHERE f.user_id = p_user1 OR f.friend_id = p_user1
  ),
  user2_friends AS (
    SELECT CASE WHEN f.user_id = p_user2 THEN f.friend_id ELSE f.user_id END AS fid
    FROM friendships f
    WHERE f.user_id = p_user2 OR f.friend_id = p_user2
  )
  SELECT p.id, p.display_name, p.avatar_url
  FROM user1_friends u1
  JOIN user2_friends u2 ON u1.fid = u2.fid
  JOIN profiles p ON p.id = u1.fid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 6. get_friend_activity_feed

Returns paginated activity feed from friends.

```sql
CREATE OR REPLACE FUNCTION get_friend_activity_feed(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  activity_type activity_type,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    fa.id,
    fa.user_id,
    p.display_name,
    p.avatar_url,
    fa.activity_type,
    fa.reference_type,
    fa.reference_id,
    fa.metadata,
    fa.created_at
  FROM friend_activities fa
  JOIN profiles p ON p.id = fa.user_id
  WHERE fa.user_id IN (
    -- Get all friend IDs
    SELECT CASE WHEN f.user_id = v_user_id THEN f.friend_id ELSE f.user_id END
    FROM friendships f
    WHERE f.user_id = v_user_id OR f.friend_id = v_user_id
  )
  AND (fa.visibility = 'public' OR fa.visibility = 'friends')
  ORDER BY fa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

---

## TypeScript Types

```typescript
// types/social.ts

// ===== Enums =====
export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type ActivityType = 'new_loadout' | 'loadout_shared' | 'marketplace_listing' | 'gear_added' | 'friend_added' | 'profile_updated';
export type ActivityVisibility = 'public' | 'friends' | 'private';
export type PrivacyPreset = 'only_me' | 'friends_only' | 'everyone' | 'custom';
export type AccountType = 'standard' | 'vip' | 'merchant';

// ===== Friend Requests =====
export interface FriendRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: FriendRequestStatus;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
}

export interface FriendRequestWithProfile extends FriendRequest {
  sender: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  recipient: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

// ===== Friendships =====
export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
}

export interface FriendInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
  friends_since: string;
  is_online?: boolean;
  mutual_friends_count?: number;
}

// ===== Following =====
export interface UserFollow {
  follower_id: string;
  followed_id: string;
  created_at: string;
}

export interface FollowInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
  following_since: string;
  is_vip?: boolean;
}

// ===== Activity Feed =====
export interface FriendActivity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  reference_type: string;
  reference_id: string;
  metadata: Record<string, unknown>;
  visibility: ActivityVisibility;
  created_at: string;
}

export interface FriendActivityWithProfile extends FriendActivity {
  display_name: string;
  avatar_url: string | null;
}

// ===== Privacy Settings =====
export interface SocialPrivacySettings {
  privacy_preset: PrivacyPreset;
  messaging_privacy: 'everyone' | 'friends_only' | 'nobody';
  online_status_privacy: 'everyone' | 'friends_only' | 'nobody';
  activity_feed_privacy: 'everyone' | 'friends_only' | 'nobody';
  discoverable: boolean;
}

// ===== API Responses =====
export interface SendFriendRequestResponse {
  success: boolean;
  error?: 'rate_limit_exceeded' | 'no_message_exchange' | 'already_friends' | 'request_already_sent';
  request_id?: string;
  resets_at?: string;
}

export interface RespondToFriendRequestResponse {
  success: boolean;
  error?: 'request_not_found';
  accepted?: boolean;
}

// ===== Hook Return Types =====
export interface UseFriendRequestsReturn {
  pendingIncoming: FriendRequestWithProfile[];
  pendingOutgoing: FriendRequestWithProfile[];
  isLoading: boolean;
  error: string | null;
  sendRequest: (recipientId: string, message?: string) => Promise<SendFriendRequestResponse>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  canSendRequest: (recipientId: string) => Promise<boolean>;
}

export interface UseFriendshipsReturn {
  friends: FriendInfo[];
  isLoading: boolean;
  error: string | null;
  unfriend: (friendId: string) => Promise<void>;
  areFriends: (userId: string) => boolean;
  getMutualFriends: (userId: string) => Promise<FriendInfo[]>;
}

export interface UseFollowingReturn {
  following: FollowInfo[];
  isLoading: boolean;
  error: string | null;
  follow: (userId: string) => Promise<void>;
  unfollow: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
}

export interface UseFriendActivityReturn {
  activities: FriendActivityWithProfile[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

---

## Row Level Security Policies

### friend_requests

```sql
-- Users can view requests where they are sender or recipient
CREATE POLICY "friend_requests_select_own" ON friend_requests FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can insert requests (additional checks in RPC)
CREATE POLICY "friend_requests_insert_sender" ON friend_requests FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Recipients can update request status
CREATE POLICY "friend_requests_update_recipient" ON friend_requests FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Senders can delete (cancel) pending requests
CREATE POLICY "friend_requests_delete_sender" ON friend_requests FOR DELETE
  USING (sender_id = auth.uid() AND status = 'pending');
```

### friendships

```sql
-- Users can view their own friendships
CREATE POLICY "friendships_select_own" ON friendships FOR SELECT
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Friendships are created via RPC only
CREATE POLICY "friendships_insert_service" ON friendships FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can delete friendships they're part of
CREATE POLICY "friendships_delete_own" ON friendships FOR DELETE
  USING (user_id = auth.uid() OR friend_id = auth.uid());
```

### user_follows

```sql
-- Users can see who they follow and who follows them
CREATE POLICY "user_follows_select_own" ON user_follows FOR SELECT
  USING (follower_id = auth.uid() OR followed_id = auth.uid());

-- Users can follow others
CREATE POLICY "user_follows_insert_own" ON user_follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

-- Users can unfollow
CREATE POLICY "user_follows_delete_own" ON user_follows FOR DELETE
  USING (follower_id = auth.uid());
```

### friend_activities

```sql
-- Users can view activities based on visibility and friendship
CREATE POLICY "friend_activities_select" ON friend_activities FOR SELECT
  USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (visibility = 'friends' AND are_friends(user_id, auth.uid()))
  );

-- Activities are created via triggers/RPC only
CREATE POLICY "friend_activities_insert_service" ON friend_activities FOR INSERT
  TO service_role
  WITH CHECK (true);
```

---

## Migration Order

1. Create enums (`friend_request_status`, `activity_type`, `activity_visibility`, `privacy_preset`, `account_type`)
2. Create `friend_requests` table with indexes and RLS
3. Create `friendships` table with indexes and RLS
4. Migrate `user_friends` → `user_follows` (rename + schema update)
5. Create `friend_activities` table with indexes and RLS
6. Add columns to `profiles` table
7. Update `notifications` type constraint
8. Create RPC functions
9. Create activity triggers on source tables
10. Enable Realtime on `friend_activities`

---

## Next Steps

- Generate `contracts/social-graph.openapi.yaml` with API endpoints
- Generate `quickstart.md` with setup instructions
