# Research: User Messaging System

**Feature**: 046-user-messaging-system
**Date**: 2025-12-12

## Research Areas

### 1. Supabase Realtime for Messaging

**Decision**: Use Supabase Realtime Channels with `postgres_changes` for message delivery

**Rationale**:
- Already proven in the codebase via `VirtualGearShakedown.tsx` for live comments
- Native PostgreSQL integration eliminates need for additional infrastructure
- Supports filtered subscriptions (per-conversation channels)
- Built-in reconnection and offline handling
- RLS policies apply to realtime subscriptions

**Alternatives Considered**:
- Socket.io: Would require separate server infrastructure, additional dependency
- Pusher/Ably: External service cost, data leaves Supabase ecosystem
- Polling: Unacceptable latency for chat, excessive database load

**Implementation Pattern** (from existing codebase):
```typescript
supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: '*',  // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`,
  }, handleMessageChange)
  .subscribe();
```

### 2. Typing Indicators Architecture

**Decision**: Use Supabase Realtime Broadcast (ephemeral) for typing indicators

**Rationale**:
- Typing state is ephemeral - no persistence needed
- Broadcast channels are lightweight and don't hit database
- Auto-cleanup when user disconnects
- Lower latency than `postgres_changes`

**Alternatives Considered**:
- Database table: Unnecessary writes, storage overhead for temporary state
- Redis: Additional infrastructure, overkill for this use case
- localStorage sync: Doesn't work across devices/tabs

**Implementation Pattern**:
```typescript
// Broadcast typing state
supabase.channel(`typing:${conversationId}`).send({
  type: 'broadcast',
  event: 'typing',
  payload: { userId, isTyping: true }
});

// Listen for typing
supabase.channel(`typing:${conversationId}`)
  .on('broadcast', { event: 'typing' }, handleTyping)
  .subscribe();
```

### 3. Message Deletion Strategy

**Decision**: Soft delete with `deletion_state` enum column

**Rationale**:
- Supports both "delete for me" and "delete for everyone" (per spec clarification)
- Preserves conversation context and audit trail
- Enables "message deleted" placeholder display
- Compliant with potential legal data retention requirements

**Alternatives Considered**:
- Hard delete: Loses audit trail, breaks conversation threading
- Separate deleted_messages table: Adds complexity, harder queries
- JSON column: Less queryable, harder to index

**Schema**:
```sql
CREATE TYPE message_deletion_state AS ENUM (
  'active',
  'deleted_for_sender',
  'deleted_for_all'
);

-- Per-user soft delete tracking
CREATE TABLE message_deletions (
  message_id UUID REFERENCES messages(id),
  user_id UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);
```

### 4. Presence and Online Status

**Decision**: Use Supabase Realtime Presence for online status tracking

**Rationale**:
- Native Supabase feature designed for this exact use case
- Automatic cleanup when users disconnect
- Supports "last seen" timestamps
- Respects privacy settings via client-side filtering

**Alternatives Considered**:
- Database polling: High load, stale data, latency
- Heartbeat table: Unnecessary writes, cleanup complexity
- Third-party presence service: Additional cost, complexity

**Implementation Pattern**:
```typescript
const presenceChannel = supabase.channel('online-users')
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    // Filter based on privacy settings
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        user_id: userId,
        online_at: new Date().toISOString()
      });
    }
  });
```

### 5. Message Search Implementation

**Decision**: PostgreSQL full-text search with GIN index

**Rationale**:
- Native PostgreSQL feature, no additional service
- Supports relevance ranking
- Works with existing Supabase setup
- Scalable for moderate message volumes

**Alternatives Considered**:
- Elasticsearch: Overkill for this scale, additional infrastructure
- Meilisearch: Additional service to maintain
- LIKE queries: Poor performance at scale, no relevance ranking

**Schema**:
```sql
-- Add tsvector column for full-text search
ALTER TABLE messages ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX messages_search_idx ON messages USING GIN (search_vector);

-- Search query
SELECT * FROM messages
WHERE search_vector @@ plainto_tsquery('english', $1)
  AND conversation_id IN (SELECT id FROM conversation_participants WHERE user_id = $2)
ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC;
```

### 6. Media Storage for Messaging

**Decision**: Cloudinary for images, Cloudinary for voice messages

**Rationale**:
- Already integrated in the codebase via `next-cloudinary`
- Unsigned upload preset exists
- Automatic format optimization and CDN delivery
- Supports audio file uploads

**Alternatives Considered**:
- Supabase Storage: Would work, but Cloudinary already integrated
- Firebase Storage: Legacy, being deprecated in this codebase
- S3 direct: Additional configuration, no CDN built-in

**Voice Message Specifics**:
- Format: WebM (native browser recording) or MP3 (fallback)
- Max duration: 5 minutes (per spec)
- Max size: ~10MB for 5min at reasonable quality
- Upload as `resource_type: 'video'` (Cloudinary uses this for audio)

### 7. Push Notification Strategy

**Decision**: Web Push API with service worker (deferred to Phase 2+)

**Rationale**:
- Native browser API, no third-party service required
- Works across modern browsers
- Can be implemented incrementally
- Supabase doesn't have built-in push notifications

**Scope for MVP**:
- In-app badge counter (immediate - via realtime)
- Browser tab notification (immediate - via document.title)
- Full push notifications (Phase 2 - requires service worker)

**Alternatives Considered**:
- Firebase Cloud Messaging: Adds Firebase dependency back
- OneSignal/Pusher Beams: External service cost
- Email notifications: Already possible via Supabase Auth triggers

### 8. Friends List - One-Way Follow Model

**Decision**: Simple junction table with unidirectional relationships (per spec clarification)

**Rationale**:
- User A can add User B without B's consent or knowledge
- Simpler than friend request/accept flow
- Similar to Twitter/Instagram follow model
- Privacy settings control who can message based on friend status

**Schema**:
```sql
CREATE TABLE user_friends (
  user_id UUID REFERENCES profiles(id),
  friend_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

-- "Is B a friend of A?" query
SELECT EXISTS(
  SELECT 1 FROM user_friends
  WHERE user_id = $1 AND friend_id = $2
);
```

### 9. Privacy Settings Storage

**Decision**: Extend existing `profiles` table with privacy columns

**Rationale**:
- Keeps user data co-located
- Simple queries for privacy checks
- No additional table joins needed
- Default values applied at database level

**Schema Addition**:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  messaging_privacy TEXT DEFAULT 'everyone'
    CHECK (messaging_privacy IN ('everyone', 'friends_only', 'nobody')),
  online_status_privacy TEXT DEFAULT 'friends_only'
    CHECK (online_status_privacy IN ('everyone', 'friends_only', 'nobody')),
  discoverable BOOLEAN DEFAULT true,
  read_receipts_enabled BOOLEAN DEFAULT true;
```

### 10. Conversation Model

**Decision**: Single `conversations` table with `type` column (direct/group)

**Rationale**:
- Unified model simplifies queries and UI logic
- Participants table handles both DMs and groups
- Easy to add conversation types later
- Supports group admin roles via participant table

**Schema**:
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  name TEXT,  -- NULL for direct, required for group
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  unread_count INT DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);
```

## Technology Decisions Summary

| Area | Decision | Key Benefit |
|------|----------|-------------|
| Real-time messages | Supabase postgres_changes | Already proven, native integration |
| Typing indicators | Supabase Broadcast | Ephemeral, low latency |
| Presence/online | Supabase Presence | Built for this purpose |
| Message search | PostgreSQL full-text | No additional service |
| Media storage | Cloudinary | Already integrated |
| Push notifications | Web Push API (deferred) | No external service |
| Friend model | One-way follow | Per spec clarification |
| Privacy storage | profiles table extension | Co-located, simple queries |
| Conversation model | Unified with type column | Flexible, simple queries |

## Unresolved Items

None - all technical decisions made based on existing codebase patterns and spec clarifications.

## References

- Existing realtime: `components/loadouts/VirtualGearShakedown.tsx`
- Existing Cloudinary: `hooks/useCloudinaryUpload.ts`
- Existing auth: `hooks/useSupabaseAuth.ts`
- Supabase Realtime docs: https://supabase.com/docs/guides/realtime
- Supabase Presence: https://supabase.com/docs/guides/realtime/presence
