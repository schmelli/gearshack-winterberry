# Data Model: User Messaging System

**Feature**: 046-user-messaging-system
**Date**: 2025-12-12

## Entity Relationship Diagram

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│    profiles     │     │      conversations       │     │    messages     │
│  (existing)     │     │                          │     │                 │
├─────────────────┤     ├──────────────────────────┤     ├─────────────────┤
│ id (PK)         │◄────┤ created_by (FK)          │     │ id (PK)         │
│ email           │     │ id (PK)                  │◄────┤ conversation_id │
│ display_name    │     │ type (direct|group)      │     │ sender_id (FK)──┼──►profiles
│ avatar_url      │     │ name                     │     │ content         │
│ ...existing...  │     │ created_at               │     │ message_type    │
│                 │     │ updated_at               │     │ media_url       │
│ messaging_priv* │     └──────────────────────────┘     │ metadata        │
│ online_priv*    │              │                       │ deletion_state  │
│ discoverable*   │              │                       │ created_at      │
│ read_receipts*  │              ▼                       │ updated_at      │
└─────────────────┘     ┌──────────────────────────┐     └─────────────────┘
        │               │ conversation_participants │              │
        │               ├──────────────────────────┤              │
        └──────────────►│ conversation_id (PK, FK) │              │
                        │ user_id (PK, FK)         │              │
                        │ role (member|admin)      │              │
                        │ joined_at                │              │
                        │ is_muted                 │              │
                        │ is_archived              │              ▼
                        │ unread_count             │     ┌─────────────────┐
                        │ last_read_at             │     │message_reactions│
                        └──────────────────────────┘     ├─────────────────┤
                                                         │ message_id (FK) │
┌─────────────────┐     ┌──────────────────────────┐     │ user_id (FK)    │
│  user_friends   │     │    message_deletions     │     │ emoji           │
├─────────────────┤     ├──────────────────────────┤     │ created_at      │
│ user_id (PK,FK) │     │ message_id (PK, FK)      │     └─────────────────┘
│ friend_id(PK,FK)│     │ user_id (PK, FK)         │
│ created_at      │     │ deleted_at               │
└─────────────────┘     └──────────────────────────┘

┌─────────────────┐     ┌──────────────────────────┐
│  user_blocks    │     │      user_reports        │
├─────────────────┤     ├──────────────────────────┤
│ user_id (PK,FK) │     │ id (PK)                  │
│ blocked_id(PK)  │     │ reporter_id (FK)         │
│ created_at      │     │ reported_user_id (FK)    │
└─────────────────┘     │ message_id (FK, nullable)│
                        │ reason                   │
                        │ details                  │
                        │ status                   │
                        │ created_at               │
                        └──────────────────────────┘

* = New columns added to existing profiles table
```

## Table Definitions

### 1. profiles (Extended)

**Purpose**: Extend existing user profiles with messaging privacy settings

```sql
-- Add messaging-related columns to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  messaging_privacy TEXT DEFAULT 'everyone'
    CHECK (messaging_privacy IN ('everyone', 'friends_only', 'nobody')),
  online_status_privacy TEXT DEFAULT 'friends_only'
    CHECK (online_status_privacy IN ('everyone', 'friends_only', 'nobody')),
  discoverable BOOLEAN DEFAULT true,
  read_receipts_enabled BOOLEAN DEFAULT true;
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| messaging_privacy | TEXT | NO | 'everyone' | Who can message: everyone/friends_only/nobody |
| online_status_privacy | TEXT | NO | 'friends_only' | Who sees online status |
| discoverable | BOOLEAN | NO | true | Appears in user search |
| read_receipts_enabled | BOOLEAN | NO | true | Share read status with senders |

### 2. conversations

**Purpose**: Messaging threads (1:1 or group)

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  name TEXT,  -- Required for group, NULL for direct
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for recent conversations
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| type | TEXT | NO | - | 'direct' or 'group' |
| name | TEXT | YES | NULL | Group name (NULL for direct) |
| created_by | UUID | YES | - | User who created (NULL if deleted) |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last activity timestamp |

**Constraints**:
- Group conversations MUST have a name
- Direct conversations MUST have exactly 2 participants

### 3. conversation_participants

**Purpose**: Junction table linking users to conversations with per-user settings

```sql
CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  unread_count INT DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

-- Index for user's conversations
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conv_participants_archived ON conversation_participants(user_id, is_archived);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| conversation_id | UUID | NO | - | FK to conversations |
| user_id | UUID | NO | - | FK to profiles |
| role | TEXT | NO | 'member' | 'member' or 'admin' (for groups) |
| joined_at | TIMESTAMPTZ | NO | NOW() | When user joined |
| is_muted | BOOLEAN | NO | false | Notifications muted |
| is_archived | BOOLEAN | NO | false | Hidden from main list |
| unread_count | INT | NO | 0 | Unread messages in this conversation |
| last_read_at | TIMESTAMPTZ | YES | NULL | Last read timestamp |

### 4. messages

**Purpose**: Individual messages within conversations

```sql
CREATE TYPE message_type AS ENUM (
  'text',
  'image',
  'voice',
  'location',
  'gear_reference',
  'gear_trade',
  'trip_invitation'
);

CREATE TYPE message_deletion_state AS ENUM (
  'active',
  'deleted_for_sender',
  'deleted_for_all'
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT,
  message_type message_type NOT NULL DEFAULT 'text',
  media_url TEXT,
  metadata JSONB DEFAULT '{}',
  deletion_state message_deletion_state DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Full-text search vector
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(content, ''))
  ) STORED
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| conversation_id | UUID | NO | - | FK to conversations |
| sender_id | UUID | YES | - | FK to profiles (NULL if user deleted) |
| content | TEXT | YES | NULL | Message text content |
| message_type | ENUM | NO | 'text' | Type of message |
| media_url | TEXT | YES | NULL | Cloudinary URL for media |
| metadata | JSONB | NO | '{}' | Type-specific data (see below) |
| deletion_state | ENUM | NO | 'active' | Deletion status |
| created_at | TIMESTAMPTZ | NO | NOW() | When sent |
| updated_at | TIMESTAMPTZ | NO | NOW() | When modified |
| search_vector | tsvector | - | GENERATED | Full-text search index |

**Metadata by message_type**:

```typescript
// text - no metadata needed

// image
{ width: number, height: number, thumbnail_url: string }

// voice
{ duration_seconds: number, waveform: number[] }

// location
{ latitude: number, longitude: number, place_name: string }

// gear_reference
{ gear_item_id: string, name: string, image_url: string }

// gear_trade
{
  offered_items: { id: string, name: string }[],
  wanted_items: { id: string, name: string }[],
  conditions: string,
  status: 'open' | 'accepted' | 'declined'
}

// trip_invitation
{
  dates: { start: string, end: string },
  location: { name: string, lat?: number, lng?: number },
  activity_type: string,
  gear_suggestions: string[],
  rsvp_status: { [userId: string]: 'going' | 'maybe' | 'not_going' }
}
```

### 5. message_deletions

**Purpose**: Track per-user "delete for me" operations

```sql
CREATE TABLE message_deletions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| message_id | UUID | NO | - | FK to messages |
| user_id | UUID | NO | - | FK to profiles |
| deleted_at | TIMESTAMPTZ | NO | NOW() | When deleted |

### 6. message_reactions

**Purpose**: Emoji reactions on messages

```sql
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '❤️', '😂', '😮', '😢')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON message_reactions(message_id);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| message_id | UUID | NO | - | FK to messages |
| user_id | UUID | NO | - | FK to profiles |
| emoji | TEXT | NO | - | Reaction emoji (limited set) |
| created_at | TIMESTAMPTZ | NO | NOW() | When reacted |

### 7. user_friends

**Purpose**: One-way friend/follow relationships

```sql
CREATE TABLE user_friends (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id != friend_id)  -- Can't friend yourself
);

CREATE INDEX idx_friends_friend ON user_friends(friend_id);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| user_id | UUID | NO | - | User who added the friend |
| friend_id | UUID | NO | - | User being added as friend |
| created_at | TIMESTAMPTZ | NO | NOW() | When added |

### 8. user_blocks

**Purpose**: Block relationships preventing all contact

```sql
CREATE TABLE user_blocks (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, blocked_id),
  CHECK (user_id != blocked_id)  -- Can't block yourself
);

CREATE INDEX idx_blocks_blocked ON user_blocks(blocked_id);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| user_id | UUID | NO | - | User doing the blocking |
| blocked_id | UUID | NO | - | User being blocked |
| created_at | TIMESTAMPTZ | NO | NOW() | When blocked |

### 9. user_reports

**Purpose**: Content/user reports for moderation

```sql
CREATE TYPE report_reason AS ENUM (
  'spam',
  'harassment',
  'inappropriate_content',
  'other'
);

CREATE TYPE report_status AS ENUM (
  'pending',
  'reviewed',
  'resolved',
  'dismissed'
);

CREATE TABLE user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reason report_reason NOT NULL,
  details TEXT,
  status report_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON user_reports(status, created_at DESC);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| reporter_id | UUID | NO | - | User making report |
| reported_user_id | UUID | NO | - | User being reported |
| message_id | UUID | YES | NULL | Specific message (optional) |
| reason | ENUM | NO | - | Report category |
| details | TEXT | YES | NULL | Additional context |
| status | ENUM | NO | 'pending' | Moderation status |
| created_at | TIMESTAMPTZ | NO | NOW() | When reported |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last status change |

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all messaging tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Conversations: Only participants can view
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Messages: Only conversation participants can view (excluding deleted)
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
    AND deletion_state != 'deleted_for_all'
    AND id NOT IN (
      SELECT message_id FROM message_deletions
      WHERE user_id = auth.uid()
    )
  );

-- Messages: Users can send to conversations they're in
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Friends: Users manage their own friends
CREATE POLICY "Users manage own friends"
  ON user_friends FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Blocks: Users manage their own blocks
CREATE POLICY "Users manage own blocks"
  ON user_blocks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

## State Transitions

### Message Deletion States

```
                    ┌─────────────┐
                    │   active    │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               │               ▼
┌──────────────────┐       │    ┌──────────────────┐
│deleted_for_sender│       │    │ deleted_for_all  │
└──────────────────┘       │    └──────────────────┘
                           │
                           ▼
              (message_deletions table
               for per-user soft delete)
```

### Report Status Flow

```
pending → reviewed → resolved
              │
              └──→ dismissed
```

## Validation Rules

1. **Direct conversations**: Must have exactly 2 participants
2. **Group conversations**: Must have 2-50 participants, must have a name
3. **Group admins**: At least one admin must exist; creator starts as admin
4. **Message content**: Required for text type, optional for others
5. **Media URL**: Required for image, voice types
6. **Reactions**: Limited to predefined emoji set
7. **Self-actions prohibited**: Cannot friend/block yourself
8. **Privacy enforcement**: Messaging blocked if recipient's settings don't allow

## Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| conversations | updated_at DESC | Recent conversations |
| conversation_participants | user_id | User's conversations |
| conversation_participants | (user_id, is_archived) | Active conversations |
| messages | (conversation_id, created_at DESC) | Conversation history |
| messages | sender_id | User's sent messages |
| messages | search_vector (GIN) | Full-text search |
| message_reactions | message_id | Reactions on message |
| user_friends | friend_id | Who has friended user |
| user_blocks | blocked_id | Who has blocked user |
| user_reports | (status, created_at DESC) | Moderation queue |
