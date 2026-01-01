/**
 * Messaging Database Queries
 *
 * Feature: 046-user-messaging-system
 * Task: T006
 *
 * Supabase query helpers for messaging operations.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Conversation,
  ConversationListItem,
  Message,
  MessageWithSender,
  MessageReaction,
  UserInfo,
  FriendInfo,
  BlockedUserInfo,
  SearchableUser,
  MessagingPrivacySettings,
  ParticipantInfo,
  MessagePreview,
  ConversationType,
  ParticipantRole,
} from '@/types/messaging';

// Note: Database types for messaging tables are defined in supabase/migrations/20251213_user_messaging.sql
// After applying the migration, regenerate types with: npx supabase gen types typescript
// For now, we use explicit typing since the tables don't exist in Database types yet.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryResult = any;

/**
 * Helper to get supabase client with any typing for messaging tables
 * Remove this after running migrations and regenerating types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMessagingClient(): any {
  return createClient();
}

// ----- Conversation Queries -----

/**
 * Fetches user's conversations with last message and participants.
 * Returns empty array if messaging tables don't exist yet.
 *
 * Optimized to avoid N+1 queries using database RPC function.
 * Performance: Reduces 1+2N queries to 1 single query.
 */
export async function fetchConversations(
  userId: string,
  includeArchived = false
): Promise<ConversationListItem[]> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase.rpc('get_user_conversations', {
    p_user_id: userId,
    p_include_archived: includeArchived,
  });

  if (error) {
    // Check if error is due to missing table/function (42P01 is PostgreSQL "undefined_table" error)
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Transform RPC results to ConversationListItem format
  return (data as QueryResult[]).map((row) => ({
    conversation: {
      id: row.conv_id,
      type: row.conv_type as ConversationType,
      name: row.conv_name,
      created_by: row.conv_created_by,
      created_at: row.conv_created_at,
      updated_at: row.conv_updated_at,
    },
    role: row.role as ParticipantRole,
    is_muted: row.is_muted,
    is_archived: row.is_archived,
    unread_count: row.unread_count,
    last_read_at: row.last_read_at,
    last_message: row.last_message ?? undefined,
    participants: (row.participants ?? []) as ParticipantInfo[],
  }));
}

/**
 * Fetches participants of a conversation with profile info.
 */
export async function fetchConversationParticipants(
  conversationId: string
): Promise<ParticipantInfo[]> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase
    .from('conversation_participants')
    .select(
      `
      user_id,
      role,
      joined_at,
      profiles!inner (
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq('conversation_id', conversationId);

  if (error) {
    throw new Error(`Failed to fetch participants: ${error.message}`);
  }

  return ((data ?? []) as QueryResult[]).map((row) => {
    const profile = row.profiles as {
      id: string;
      display_name: string;
      avatar_url: string | null;
    };
    return {
      id: profile.id,
      display_name: profile.display_name ?? 'Unknown',
      avatar_url: profile.avatar_url,
      role: row.role as ParticipantRole,
      joined_at: row.joined_at,
    };
  });
}

/**
 * Fetches the last message in a conversation.
 */
export async function fetchLastMessage(
  conversationId: string
): Promise<MessagePreview | null> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase
    .from('messages')
    .select(
      `
      id,
      content,
      message_type,
      sender_id,
      created_at,
      profiles!sender_id (
        display_name
      )
    `
    )
    .eq('conversation_id', conversationId)
    .eq('deletion_state', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch last message: ${error.message}`);
  }

  if (!data) return null;

  const result = data as QueryResult;
  const profile = result.profiles as { display_name: string } | null;

  return {
    id: result.id,
    content: result.content,
    message_type: result.message_type,
    sender_id: result.sender_id,
    sender_name: profile?.display_name ?? null,
    created_at: result.created_at,
  };
}

/**
 * Gets or creates a direct conversation between two users.
 */
export async function getOrCreateDirectConversation(
  userId: string,
  recipientId: string
): Promise<string> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    p_user1: userId,
    p_user2: recipientId,
  });

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data as string;
}

/**
 * Creates a group conversation.
 */
export async function createGroupConversation(
  name: string,
  creatorId: string,
  participantIds: string[]
): Promise<string> {
  const supabase = getMessagingClient();

  // Create the conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert({
      type: 'group' as ConversationType,
      name,
      created_by: creatorId,
    })
    .select('id')
    .single();

  if (convError) {
    throw new Error(`Failed to create group: ${convError.message}`);
  }

  // Add creator as admin
  const participants = [
    { conversation_id: conv.id, user_id: creatorId, role: 'admin' as ParticipantRole },
    ...participantIds.map((id) => ({
      conversation_id: conv.id,
      user_id: id,
      role: 'member' as ParticipantRole,
    })),
  ];

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participants);

  if (partError) {
    throw new Error(`Failed to add participants: ${partError.message}`);
  }

  return conv.id;
}

// ----- Message Queries -----

/**
 * Fetches messages for a conversation with pagination.
 */
export async function fetchMessages(
  conversationId: string,
  limit = 50,
  offset = 0
): Promise<MessageWithSender[]> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase
    .from('messages')
    .select(
      `
      *,
      profiles!sender_id (
        id,
        display_name,
        avatar_url
      ),
      message_reactions (
        id,
        user_id,
        emoji,
        created_at
      )
    `
    )
    .eq('conversation_id', conversationId)
    .neq('deletion_state', 'deleted_for_all')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return (data ?? []).map((row: QueryResult) => {
    const profile = row.profiles as UserInfo | null;
    const reactions = (row.message_reactions ?? []) as MessageReaction[];

    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      content: row.content,
      message_type: row.message_type,
      media_url: row.media_url,
      metadata: row.metadata,
      deletion_state: row.deletion_state,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sender: profile,
      reactions,
    };
  });
}

/**
 * Sends a new message.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string | null,
  messageType: Message['message_type'] = 'text',
  mediaUrl: string | null = null,
  metadata: Record<string, unknown> = {}
): Promise<Message> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      message_type: messageType,
      media_url: mediaUrl,
      metadata,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }

  return data as Message;
}

/**
 * Marks messages as read and resets unread count.
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = getMessagingClient();

  const { error } = await supabase.rpc('reset_unread_count', {
    p_conversation_id: conversationId,
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Failed to mark as read: ${error.message}`);
  }
}

/**
 * Deletes a message (for sender or for all).
 */
export async function deleteMessage(
  messageId: string,
  userId: string,
  deleteForAll: boolean
): Promise<void> {
  const supabase = getMessagingClient();

  if (deleteForAll) {
    // Update the message deletion_state
    const { error } = await supabase
      .from('messages')
      .update({ deletion_state: 'deleted_for_all' })
      .eq('id', messageId)
      .eq('sender_id', userId);

    if (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  } else {
    // Insert into message_deletions for soft delete
    const { error } = await supabase.from('message_deletions').insert({
      message_id: messageId,
      user_id: userId,
    });

    if (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }
}

// ----- Friend Queries -----

/**
 * Fetches user's friends list with profile info.
 */
export async function fetchFriends(userId: string): Promise<FriendInfo[]> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase
    .from('user_friends')
    .select(
      `
      friend_id,
      created_at,
      profiles!friend_id (
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch friends: ${error.message}`);
  }

  return (data ?? []).map((row: QueryResult) => {
    const profile = row.profiles as UserInfo;
    return {
      id: profile.id,
      display_name: profile.display_name ?? 'Unknown',
      avatar_url: profile.avatar_url,
      created_at: row.created_at,
    };
  });
}

/**
 * Adds a friend.
 */
export async function addFriend(
  userId: string,
  friendId: string
): Promise<void> {
  const supabase = getMessagingClient();

  const { error } = await supabase.from('user_friends').insert({
    user_id: userId,
    friend_id: friendId,
  });

  if (error) {
    if (error.code === '23505') {
      // Duplicate key - already friends
      return;
    }
    throw new Error(`Failed to add friend: ${error.message}`);
  }
}

/**
 * Removes a friend.
 */
export async function removeFriend(
  userId: string,
  friendId: string
): Promise<void> {
  const supabase = getMessagingClient();

  const { error } = await supabase
    .from('user_friends')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId);

  if (error) {
    throw new Error(`Failed to remove friend: ${error.message}`);
  }
}

/**
 * Checks if a user is a friend.
 */
export async function isFriend(
  userId: string,
  friendId: string
): Promise<boolean> {
  const supabase = getMessagingClient();

  const { count, error } = await supabase
    .from('user_friends')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('friend_id', friendId);

  if (error) {
    throw new Error(`Failed to check friendship: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

// ----- Block Queries -----

/**
 * Fetches user's blocked list.
 */
export async function fetchBlockedUsers(
  userId: string
): Promise<BlockedUserInfo[]> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase
    .from('user_blocks')
    .select(
      `
      blocked_id,
      created_at,
      profiles!blocked_id (
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch blocked users: ${error.message}`);
  }

  return (data ?? []).map((row: QueryResult) => {
    const profile = row.profiles as UserInfo;
    return {
      id: profile.id,
      display_name: profile.display_name ?? 'Unknown',
      avatar_url: profile.avatar_url,
      blocked_at: row.created_at,
    };
  });
}

/**
 * Blocks a user.
 */
export async function blockUser(
  userId: string,
  blockedId: string
): Promise<void> {
  const supabase = getMessagingClient();

  const { error } = await supabase.from('user_blocks').insert({
    user_id: userId,
    blocked_id: blockedId,
  });

  if (error) {
    if (error.code === '23505') {
      // Already blocked
      return;
    }
    throw new Error(`Failed to block user: ${error.message}`);
  }
}

/**
 * Unblocks a user.
 */
export async function unblockUser(
  userId: string,
  blockedId: string
): Promise<void> {
  const supabase = getMessagingClient();

  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('blocked_id', blockedId);

  if (error) {
    throw new Error(`Failed to unblock user: ${error.message}`);
  }
}

/**
 * Checks if a user is blocked (in either direction).
 */
export async function isBlocked(user1: string, user2: string): Promise<boolean> {
  const supabase = getMessagingClient();

  const { count, error } = await supabase
    .from('user_blocks')
    .select('*', { count: 'exact', head: true })
    .or(`and(user_id.eq.${user1},blocked_id.eq.${user2}),and(user_id.eq.${user2},blocked_id.eq.${user1})`);

  if (error) {
    throw new Error(`Failed to check block status: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

// ----- User Search Queries -----

/**
 * Searches for discoverable users.
 *
 * Optimized to avoid N+1 queries using database RPC function.
 * Performance: Reduces 1+N queries to 1 single query.
 */
export async function searchUsers(
  query: string,
  currentUserId: string,
  limit = 20
): Promise<SearchableUser[]> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase.rpc('search_users_with_block_status', {
    p_query: query,
    p_current_user_id: currentUserId,
    p_limit: limit,
  });

  if (error) {
    // Check if error is due to missing table/function
    if (
      error.code === '42P01' ||
      error.code === '42883' ||
      error.message.includes('does not exist')
    ) {
      return [];
    }
    throw new Error(`Failed to search users: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // RPC function returns data in the correct format already
  return data as SearchableUser[];
}

// ----- Privacy Settings Queries -----

/**
 * Fetches user's messaging privacy settings.
 */
export async function fetchPrivacySettings(
  userId: string
): Promise<MessagingPrivacySettings> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'messaging_privacy, online_status_privacy, discoverable, read_receipts_enabled'
    )
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch privacy settings: ${error.message}`);
  }

  return {
    messaging_privacy: data.messaging_privacy ?? 'everyone',
    online_status_privacy: data.online_status_privacy ?? 'friends_only',
    discoverable: data.discoverable ?? true,
    read_receipts_enabled: data.read_receipts_enabled ?? true,
  };
}

/**
 * Updates user's messaging privacy settings.
 */
export async function updatePrivacySettings(
  userId: string,
  settings: Partial<MessagingPrivacySettings>
): Promise<void> {
  const supabase = getMessagingClient();

  const { error } = await supabase
    .from('profiles')
    .update(settings)
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update privacy settings: ${error.message}`);
  }
}

// ----- Unread Count Queries -----

/**
 * Fetches total unread message count across all conversations.
 * Returns 0 if the messaging tables don't exist yet.
 */
export async function fetchTotalUnreadCount(userId: string): Promise<number> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase
    .from('conversation_participants')
    .select('unread_count')
    .eq('user_id', userId)
    .eq('is_muted', false);

  if (error) {
    // Check if error is due to missing table (42P01 is PostgreSQL "undefined_table" error)
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return 0;
    }
    throw new Error(`Failed to fetch unread count: ${error.message}`);
  }

  return (data ?? []).reduce((sum: number, row: QueryResult) => sum + row.unread_count, 0);
}

// ----- Reaction Queries -----

/**
 * Adds a reaction to a message.
 */
export async function addReaction(
  messageId: string,
  userId: string,
  emoji: MessageReaction['emoji']
): Promise<void> {
  const supabase = getMessagingClient();

  const { error } = await supabase.from('message_reactions').insert({
    message_id: messageId,
    user_id: userId,
    emoji,
  });

  if (error) {
    if (error.code === '23505') {
      // Already reacted with this emoji
      return;
    }
    throw new Error(`Failed to add reaction: ${error.message}`);
  }
}

/**
 * Removes a reaction from a message.
 */
export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: MessageReaction['emoji']
): Promise<void> {
  const supabase = getMessagingClient();

  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  if (error) {
    throw new Error(`Failed to remove reaction: ${error.message}`);
  }
}

// ----- Mute/Archive Queries -----

/**
 * Toggles mute status for a conversation.
 */
export async function toggleMute(
  conversationId: string,
  userId: string,
  muted: boolean
): Promise<void> {
  const supabase = getMessagingClient();

  const { error } = await supabase
    .from('conversation_participants')
    .update({ is_muted: muted })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to toggle mute: ${error.message}`);
  }
}

/**
 * Toggles archive status for a conversation.
 */
export async function toggleArchive(
  conversationId: string,
  userId: string,
  archived: boolean
): Promise<void> {
  const supabase = getMessagingClient();

  const { error } = await supabase
    .from('conversation_participants')
    .update({ is_archived: archived })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to toggle archive: ${error.message}`);
  }
}

// ----- Can Message Check -----

/**
 * Checks if current user can message another user.
 */
export async function canMessageUser(
  senderId: string,
  recipientId: string
): Promise<boolean> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase.rpc('can_message_user', {
    p_sender_id: senderId,
    p_recipient_id: recipientId,
  });

  if (error) {
    throw new Error(`Failed to check messaging permission: ${error.message}`);
  }

  return data as boolean;
}

// ----- Group Management -----

/**
 * Gets the user's role in a conversation.
 */
export async function getUserRole(
  conversationId: string,
  userId: string
): Promise<ParticipantRole | null> {
  const supabase = getMessagingClient();

  const { data, error } = await supabase
    .from('conversation_participants')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as ParticipantRole;
}

/**
 * Adds a participant to a group conversation.
 * Only admins can add participants.
 */
export async function addGroupParticipant(
  conversationId: string,
  adminId: string,
  newUserId: string
): Promise<void> {
  const supabase = getMessagingClient();

  // Verify admin role
  const adminRole = await getUserRole(conversationId, adminId);
  if (adminRole !== 'admin') {
    throw new Error('Only admins can add participants');
  }

  const { error } = await supabase.from('conversation_participants').insert({
    conversation_id: conversationId,
    user_id: newUserId,
    role: 'member' as ParticipantRole,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('User is already a participant');
    }
    throw new Error(`Failed to add participant: ${error.message}`);
  }
}

/**
 * Removes a participant from a group conversation.
 * Only admins can remove participants (except themselves).
 */
export async function removeGroupParticipant(
  conversationId: string,
  adminId: string,
  targetUserId: string
): Promise<void> {
  const supabase = getMessagingClient();

  // Verify admin role (unless removing self)
  if (adminId !== targetUserId) {
    const adminRole = await getUserRole(conversationId, adminId);
    if (adminRole !== 'admin') {
      throw new Error('Only admins can remove participants');
    }
  }

  const { error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', targetUserId);

  if (error) {
    throw new Error(`Failed to remove participant: ${error.message}`);
  }
}

/**
 * Leaves a group conversation.
 * If the leaving user is the only admin, transfers admin to the oldest member.
 */
export async function leaveGroupConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = getMessagingClient();

  // Get current user's role
  const userRole = await getUserRole(conversationId, userId);
  if (!userRole) {
    throw new Error('Not a participant of this conversation');
  }

  if (userRole === 'admin') {
    // Check if there are other admins
    const { data: admins } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('role', 'admin')
      .neq('user_id', userId);

    if (!admins || admins.length === 0) {
      // No other admins - transfer admin to oldest member
      const { data: oldestMember } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('role', 'member')
        .order('joined_at', { ascending: true })
        .limit(1)
        .single();

      if (oldestMember) {
        // Transfer admin role
        const { error: updateError } = await supabase
          .from('conversation_participants')
          .update({ role: 'admin' as ParticipantRole })
          .eq('conversation_id', conversationId)
          .eq('user_id', oldestMember.user_id);

        if (updateError) {
          throw new Error(`Failed to transfer admin: ${updateError.message}`);
        }
      }
    }
  }

  // Remove the user from the conversation
  const { error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to leave conversation: ${error.message}`);
  }
}

/**
 * Updates a group conversation's name.
 * Only admins can update the name.
 */
export async function updateGroupName(
  conversationId: string,
  adminId: string,
  newName: string
): Promise<void> {
  const supabase = getMessagingClient();

  // Verify admin role
  const adminRole = await getUserRole(conversationId, adminId);
  if (adminRole !== 'admin') {
    throw new Error('Only admins can update the group name');
  }

  const { error } = await supabase
    .from('conversations')
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (error) {
    throw new Error(`Failed to update group name: ${error.message}`);
  }
}
