# API Contracts: User Messaging System

**Feature**: 046-user-messaging-system
**Date**: 2025-12-12

## Overview

This document defines the API contracts for the messaging system. Most operations use Supabase client directly with RLS policies. API routes are used for complex operations requiring server-side logic.

## Supabase Client Operations (Direct)

### Conversations

#### List User's Conversations
```typescript
// hooks/messaging/useConversations.ts
const { data } = await supabase
  .from('conversation_participants')
  .select(`
    conversation:conversations(
      id,
      type,
      name,
      created_at,
      updated_at
    ),
    role,
    is_muted,
    is_archived,
    unread_count,
    last_read_at
  `)
  .eq('user_id', userId)
  .eq('is_archived', false)
  .order('conversation(updated_at)', { ascending: false });

// Response shape
interface ConversationListItem {
  conversation: {
    id: string;
    type: 'direct' | 'group';
    name: string | null;
    created_at: string;
    updated_at: string;
  };
  role: 'member' | 'admin';
  is_muted: boolean;
  is_archived: boolean;
  unread_count: number;
  last_read_at: string | null;
}
```

#### Get Conversation with Participants
```typescript
const { data } = await supabase
  .from('conversations')
  .select(`
    *,
    participants:conversation_participants(
      user:profiles(id, display_name, avatar_url),
      role,
      joined_at
    )
  `)
  .eq('id', conversationId)
  .single();
```

#### Create Direct Conversation
```typescript
// Check if conversation already exists between two users
const { data: existing } = await supabase
  .rpc('find_direct_conversation', {
    user_a: currentUserId,
    user_b: otherUserId
  });

if (!existing) {
  // Create new conversation
  const { data: conv } = await supabase
    .from('conversations')
    .insert({ type: 'direct', created_by: currentUserId })
    .select()
    .single();

  // Add both participants
  await supabase.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: currentUserId },
    { conversation_id: conv.id, user_id: otherUserId }
  ]);
}
```

#### Create Group Conversation
```typescript
const { data: conv } = await supabase
  .from('conversations')
  .insert({
    type: 'group',
    name: groupName,
    created_by: currentUserId
  })
  .select()
  .single();

// Add creator as admin
await supabase.from('conversation_participants').insert(
  [currentUserId, ...participantIds].map((uid, i) => ({
    conversation_id: conv.id,
    user_id: uid,
    role: i === 0 ? 'admin' : 'member'
  }))
);
```

### Messages

#### List Messages in Conversation
```typescript
const { data } = await supabase
  .from('messages')
  .select(`
    *,
    sender:profiles(id, display_name, avatar_url),
    reactions:message_reactions(emoji, user_id)
  `)
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

// Note: RLS policy handles deletion filtering
```

#### Send Message
```typescript
const { data } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: currentUserId,
    content: messageContent,
    message_type: 'text',
    metadata: {}
  })
  .select()
  .single();

// Update conversation.updated_at
await supabase
  .from('conversations')
  .update({ updated_at: new Date().toISOString() })
  .eq('id', conversationId);
```

#### Delete Message
```typescript
// Delete for me only
await supabase
  .from('message_deletions')
  .insert({
    message_id: messageId,
    user_id: currentUserId
  });

// Delete for everyone (only sender can do this)
await supabase
  .from('messages')
  .update({ deletion_state: 'deleted_for_all' })
  .eq('id', messageId)
  .eq('sender_id', currentUserId);  // RLS enforces this
```

### Reactions

#### Add Reaction
```typescript
await supabase
  .from('message_reactions')
  .upsert({
    message_id: messageId,
    user_id: currentUserId,
    emoji: '👍'
  });
```

#### Remove Reaction
```typescript
await supabase
  .from('message_reactions')
  .delete()
  .eq('message_id', messageId)
  .eq('user_id', currentUserId)
  .eq('emoji', emoji);
```

### Friends

#### Add Friend
```typescript
await supabase
  .from('user_friends')
  .insert({
    user_id: currentUserId,
    friend_id: friendId
  });
```

#### Remove Friend
```typescript
await supabase
  .from('user_friends')
  .delete()
  .eq('user_id', currentUserId)
  .eq('friend_id', friendId);
```

#### List Friends
```typescript
const { data } = await supabase
  .from('user_friends')
  .select(`
    friend:profiles!friend_id(
      id,
      display_name,
      avatar_url
    ),
    created_at
  `)
  .eq('user_id', currentUserId)
  .order('friend(display_name)');
```

### Blocking

#### Block User
```typescript
await supabase
  .from('user_blocks')
  .insert({
    user_id: currentUserId,
    blocked_id: blockedUserId
  });
```

#### Unblock User
```typescript
await supabase
  .from('user_blocks')
  .delete()
  .eq('user_id', currentUserId)
  .eq('blocked_id', blockedUserId);
```

#### List Blocked Users
```typescript
const { data } = await supabase
  .from('user_blocks')
  .select(`
    blocked:profiles!blocked_id(
      id,
      display_name,
      avatar_url
    ),
    created_at
  `)
  .eq('user_id', currentUserId);
```

### Privacy Settings

#### Update Privacy Settings
```typescript
await supabase
  .from('profiles')
  .update({
    messaging_privacy: 'friends_only',
    online_status_privacy: 'nobody',
    discoverable: false,
    read_receipts_enabled: true
  })
  .eq('id', currentUserId);
```

## API Routes (Server-Side)

### POST /api/messaging/conversations/start

**Purpose**: Start a conversation with privacy checks

```typescript
// Request
interface StartConversationRequest {
  recipientId: string;
  initialMessage?: string;
}

// Response
interface StartConversationResponse {
  success: boolean;
  conversationId?: string;
  error?: 'blocked' | 'privacy_restricted' | 'not_found';
}

// Logic:
// 1. Check if recipient exists
// 2. Check if either user blocked the other
// 3. Check recipient's messaging_privacy setting
// 4. Check if current user is in recipient's friends (if friends_only)
// 5. Create or find existing conversation
// 6. Optionally send initial message
```

### GET /api/messaging/users/search

**Purpose**: Search discoverable users

```typescript
// Request
interface UserSearchRequest {
  query: string;
  limit?: number;  // default 20
}

// Response
interface UserSearchResponse {
  users: Array<{
    id: string;
    display_name: string;
    avatar_url: string | null;
    can_message: boolean;  // Based on privacy settings
  }>;
}

// Logic:
// 1. Search profiles where discoverable = true
// 2. Exclude blocked users (in either direction)
// 3. Check messaging permission for each result
// 4. Return with can_message flag
```

### POST /api/messaging/messages/search

**Purpose**: Full-text search across user's messages

```typescript
// Request
interface MessageSearchRequest {
  query: string;
  conversationId?: string;  // Optional: limit to specific conversation
  limit?: number;  // default 50
}

// Response
interface MessageSearchResponse {
  results: Array<{
    message: {
      id: string;
      content: string;
      created_at: string;
    };
    conversation: {
      id: string;
      name: string | null;
      type: 'direct' | 'group';
    };
    highlight: string;  // Excerpt with matches highlighted
  }>;
}

// Logic:
// 1. Use PostgreSQL full-text search
// 2. Filter to user's conversations only
// 3. Return with relevance ranking
```

### POST /api/messaging/reports

**Purpose**: Submit user/content report

```typescript
// Request
interface ReportRequest {
  reportedUserId: string;
  messageId?: string;
  reason: 'spam' | 'harassment' | 'inappropriate_content' | 'other';
  details?: string;
}

// Response
interface ReportResponse {
  success: boolean;
  reportId: string;
}
```

### GET /api/messaging/unread-count

**Purpose**: Get total unread count for badge

```typescript
// Response
interface UnreadCountResponse {
  totalUnread: number;
}

// Logic: Sum unread_count from conversation_participants
```

## Real-time Subscriptions

### Message Updates
```typescript
supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Handle INSERT, UPDATE, DELETE
  })
  .subscribe();
```

### Typing Indicators (Broadcast)
```typescript
// Send typing status
const channel = supabase.channel(`typing:${conversationId}`);

channel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { userId: currentUserId, isTyping: true }
});

// Receive typing status
channel
  .on('broadcast', { event: 'typing' }, ({ payload }) => {
    // payload: { userId, isTyping }
  })
  .subscribe();
```

### Presence (Online Status)
```typescript
const presenceChannel = supabase.channel('user-presence');

presenceChannel
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    // state: { [presenceKey]: [{ user_id, online_at }] }
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        user_id: currentUserId,
        online_at: new Date().toISOString()
      });
    }
  });
```

### Unread Count Updates
```typescript
supabase
  .channel('unread-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'conversation_participants',
    filter: `user_id=eq.${currentUserId}`
  }, (payload) => {
    // Recalculate total unread
  })
  .subscribe();
```

## TypeScript Types

```typescript
// types/messaging.ts

export type MessageType =
  | 'text'
  | 'image'
  | 'voice'
  | 'location'
  | 'gear_reference'
  | 'gear_trade'
  | 'trip_invitation';

export type MessageDeletionState =
  | 'active'
  | 'deleted_for_sender'
  | 'deleted_for_all';

export type MessagingPrivacy = 'everyone' | 'friends_only' | 'nobody';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  role: 'member' | 'admin';
  joined_at: string;
  is_muted: boolean;
  is_archived: boolean;
  unread_count: number;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: MessageType;
  media_url: string | null;
  metadata: Record<string, unknown>;
  deletion_state: MessageDeletionState;
  created_at: string;
  updated_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface UserFriend {
  user_id: string;
  friend_id: string;
  created_at: string;
}

export interface UserBlock {
  user_id: string;
  blocked_id: string;
  created_at: string;
}

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  message_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

// Metadata types for specialized messages
export interface ImageMetadata {
  width: number;
  height: number;
  thumbnail_url: string;
}

export interface VoiceMetadata {
  duration_seconds: number;
  waveform: number[];
}

export interface LocationMetadata {
  latitude: number;
  longitude: number;
  place_name: string;
}

export interface GearReferenceMetadata {
  gear_item_id: string;
  name: string;
  image_url: string;
}

export interface GearTradeMetadata {
  offered_items: Array<{ id: string; name: string }>;
  wanted_items: Array<{ id: string; name: string }>;
  conditions: string;
  status: 'open' | 'accepted' | 'declined';
}

export interface TripInvitationMetadata {
  dates: { start: string; end: string };
  location: { name: string; lat?: number; lng?: number };
  activity_type: string;
  gear_suggestions: string[];
  rsvp_status: Record<string, 'going' | 'maybe' | 'not_going'>;
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `blocked` | One user has blocked the other |
| `privacy_restricted` | Recipient's privacy settings don't allow messaging |
| `not_found` | User or conversation not found |
| `not_participant` | User is not a participant in the conversation |
| `not_admin` | User doesn't have admin rights (group operations) |
| `group_full` | Group has reached 50 participant limit |
| `invalid_message_type` | Unknown message type |
| `media_upload_failed` | Cloudinary upload failed |
