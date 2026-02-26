# Research: Social Graph (Friends + Follow System)

**Feature**: 001-social-graph | **Date**: 2025-12-28 | **Plan**: [plan.md](./plan.md)

## Summary

This document resolves the 5 Phase 0 research topics identified in the implementation plan. All solutions leverage existing GearShack patterns and infrastructure.

---

## 1. Message Exchange Verification

**Question**: Best pattern to check if two users have exchanged messages (prerequisite for friend requests)

### Research Findings

The existing messaging system (`supabase/migrations/20251213_user_messaging.sql`) provides:
- `conversations` table with `type` = `'direct'` for 1:1 conversations
- `messages` table with `sender_id` foreign key
- `get_or_create_direct_conversation` RPC function

### Recommended Solution

Create an RPC function `has_message_exchange` that checks:
1. A direct conversation exists between the two users
2. Both users have sent at least one message in that conversation

```sql
CREATE OR REPLACE FUNCTION has_message_exchange(p_user1 UUID, p_user2 UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_conversation_id UUID;
  v_user1_sent BOOLEAN;
  v_user2_sent BOOLEAN;
BEGIN
  -- Find direct conversation between users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = p_user1
  JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_user2
  WHERE c.type = 'direct'
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if both users have sent at least one message
  SELECT EXISTS(
    SELECT 1 FROM messages WHERE conversation_id = v_conversation_id AND sender_id = p_user1
  ) INTO v_user1_sent;

  SELECT EXISTS(
    SELECT 1 FROM messages WHERE conversation_id = v_conversation_id AND sender_id = p_user2
  ) INTO v_user2_sent;

  RETURN v_user1_sent AND v_user2_sent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Decision

**Adopted**: RPC function approach. Efficient single-call verification with proper indexes already in place on `messages(conversation_id, sender_id)`.

---

## 2. Friend Request Expiration

**Question**: PostgreSQL strategy for 30-day auto-expiration of friend requests

### Research Findings

The codebase has an established pattern in `supabase/migrations/20250127_data_retention_cron.sql`:
- `cleanup_expired_conversation_memory` function deletes records older than N days
- Uses `pg_cron` extension (requires Supabase Pro) or Edge Function fallback
- `INTERVAL` arithmetic for date calculations

### Recommended Solution

1. Add `expires_at` column to `friend_requests` table (computed: `created_at + INTERVAL '30 days'`)
2. Create cleanup function for expired requests
3. Schedule via `pg_cron` or Supabase scheduled Edge Function

```sql
-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_friend_requests()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM friend_requests
  WHERE status = 'pending'
    AND created_at < now() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule (if pg_cron available)
-- SELECT cron.schedule('cleanup-friend-requests', '0 3 * * *', $$SELECT cleanup_expired_friend_requests()$$);
```

### Decision

**Adopted**: Cleanup function with optional `pg_cron`. Add `expires_at` as computed column for query efficiency. Edge Function fallback for Supabase Free tier.

---

## 3. Activity Feed Aggregation

**Question**: Efficient real-time feed for friends' activities

### Research Findings

The presence system (`hooks/messaging/usePresenceStatus.ts`) demonstrates:
- Supabase Realtime channel subscription pattern
- `presenceState` for sync events
- `join`/`leave` events for incremental updates

Notifications table (`20251214_create_notifications_table.sql`) shows:
- `reference_type` and `reference_id` pattern for polymorphic references
- Already has `friend_request` type

### Recommended Solution

**Option A: Dedicated Activity Table** (Recommended)
Create `friend_activities` table that stores denormalized activity events. Subscribe via Realtime.

**Option B: View-Based Feed**
Create a PostgreSQL view joining activities from multiple tables, filtered by friendships.

### Architecture Decision

**Adopted Option A**: Dedicated `friend_activities` table

Rationale:
- Better performance (no complex joins in real-time)
- Cleaner Realtime subscriptions (single table)
- Easier pagination and caching
- Triggers on source tables populate activities

```sql
CREATE TABLE friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'new_loadout', 'loadout_shared', 'marketplace_listing', 'gear_added'
  )),
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for feed queries (friends' activities)
CREATE INDEX idx_friend_activities_user_time ON friend_activities(user_id, created_at DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE friend_activities;
```

Client-side: Subscribe with filter on `user_id IN (SELECT friend_id FROM friendships WHERE user_id = current_user)`.

### Decision

**Adopted**: Dedicated `friend_activities` table with Realtime subscription and trigger-based population.

---

## 4. Rate Limiting Pattern

**Question**: Supabase approach for 20 friend requests per 24 hours

### Research Findings

Excellent existing pattern in `supabase/migrations/20250125_rate_limit_tracking.sql`:
- `ai_rate_limits` table with `user_id`, `endpoint`, `count`, `window_start`
- `check_and_increment_rate_limit` RPC function with **advisory locks** for race condition prevention
- Returns JSON with `exceeded`, `count`, `limit`, `resets_at`
- Cleanup function for expired windows

### Recommended Solution

Reuse the exact same pattern:

```sql
-- Call from client before sending friend request
SELECT check_and_increment_rate_limit(
  p_user_id := auth.uid(),
  p_endpoint := 'friend_request',
  p_limit := 20,
  p_window_hours := 24
);

-- Response: { "exceeded": false, "count": 5, "limit": 20, "resets_at": "2025-12-29T00:00:00Z" }
```

### Decision

**Adopted**: Reuse existing `check_and_increment_rate_limit` function. Add `'friend_request'` as new endpoint type. No schema changes needed.

---

## 5. Follower Count for VIPs

**Question**: Efficient count query without exposing follower list

### Research Findings

The `user_friends` table (one-way follow model) with RLS:
- `friends_select_own` policy allows seeing own friends and who added you
- `friend_id` column represents the followed user

### Recommended Solution

Create an RPC function that returns only the count, bypassing the RLS select policy:

```sql
CREATE OR REPLACE FUNCTION get_follower_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- For VIP accounts only (check profile)
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND account_type = 'vip'
  ) THEN
    RETURN NULL; -- Non-VIPs don't expose follower count
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM user_follows
  WHERE followed_id = p_user_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Alternative: Add a `follower_count` column to `profiles` with trigger to update on follow/unfollow. Better for high-traffic VIPs.

### Decision

**Adopted**: RPC function for MVP. Add denormalized `follower_count` column if performance becomes an issue (>10k followers per VIP).

---

## Summary of Decisions

| Topic | Solution | Existing Pattern |
|-------|----------|------------------|
| Message exchange | RPC `has_message_exchange` | Messaging queries |
| Friend request expiration | Cleanup function + pg_cron | Data retention cron |
| Activity feed | Dedicated `friend_activities` table | Realtime presence |
| Rate limiting | Reuse `check_and_increment_rate_limit` | AI rate limits |
| Follower count | RPC `get_follower_count` | N/A (new) |

## Next Steps

1. Proceed to `data-model.md` with full entity definitions
2. Include RPC functions in migration scripts
3. Define API contracts in `contracts/social-graph.openapi.yaml`
