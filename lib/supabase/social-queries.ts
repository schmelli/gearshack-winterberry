/**
 * Social Graph Database Queries
 *
 * Feature: 001-social-graph
 * Tasks: T014-T019
 *
 * Supabase query helpers for social features:
 * - Following/Followers
 * - Friend requests
 * - Friendships
 * - Activity feed
 * - Privacy settings
 */

import { createClient } from '@/lib/supabase/client';
import type {
  FriendRequest,
  FriendRequestWithProfile,
  FriendInfo,
  FollowInfo,
  FriendActivityWithProfile,
  SocialPrivacySettings,
  SendFriendRequestResponse,
  RespondToFriendRequestResponse,
  CanSendFriendRequestResponse,
  ActivityType,
} from '@/types/social';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryResult = any;

/**
 * Helper to get supabase client with any typing for social tables
 * Remove this after running migrations and regenerating types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSocialClient(): any {
  return createClient();
}

// =============================================================================
// FOLLOWING QUERIES (T015)
// =============================================================================

/**
 * Fetches list of users the current user is following.
 */
export async function fetchFollowing(userId: string): Promise<FollowInfo[]> {
  const supabase = getSocialClient();

  const { data, error } = await supabase
    .from('user_follows')
    .select(
      `
      followed_id,
      created_at,
      profiles!followed_id (
        id,
        display_name,
        avatar_url,
        account_type
      )
    `
    )
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw new Error(`Failed to fetch following: ${error.message}`);
  }

  return ((data ?? []) as QueryResult[]).map((row) => {
    const profile = row.profiles as {
      id: string;
      display_name: string;
      avatar_url: string | null;
      account_type: string;
    };
    return {
      id: profile.id,
      display_name: profile.display_name ?? 'Unknown',
      avatar_url: profile.avatar_url,
      following_since: row.created_at,
      is_vip: profile.account_type === 'vip',
    };
  });
}

/**
 * Fetches list of users following the current user (for VIP accounts).
 * Returns null for non-VIP users.
 */
export async function fetchFollowers(userId: string): Promise<FollowInfo[] | null> {
  const supabase = getSocialClient();

  // First check if user is VIP
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', userId)
    .single();

  if (profile?.account_type !== 'vip') {
    return null; // Non-VIP users don't have access to follower list
  }

  const { data, error } = await supabase
    .from('user_follows')
    .select(
      `
      follower_id,
      created_at,
      profiles!follower_id (
        id,
        display_name,
        avatar_url,
        account_type
      )
    `
    )
    .eq('followed_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw new Error(`Failed to fetch followers: ${error.message}`);
  }

  return ((data ?? []) as QueryResult[]).map((row) => {
    const followerProfile = row.profiles as {
      id: string;
      display_name: string;
      avatar_url: string | null;
      account_type: string;
    };
    return {
      id: followerProfile.id,
      display_name: followerProfile.display_name ?? 'Unknown',
      avatar_url: followerProfile.avatar_url,
      following_since: row.created_at,
      is_vip: followerProfile.account_type === 'vip',
    };
  });
}

/**
 * Follows a user (one-click, no approval needed).
 */
export async function followUser(followerId: string, followedId: string): Promise<void> {
  const supabase = getSocialClient();

  const { error } = await supabase.from('user_follows').insert({
    follower_id: followerId,
    followed_id: followedId,
  });

  if (error) {
    if (error.code === '23505') {
      // Already following - no-op
      return;
    }
    if (error.code === '23514') {
      throw new Error('Cannot follow yourself');
    }
    throw new Error(`Failed to follow user: ${error.message}`);
  }
}

/**
 * Unfollows a user.
 */
export async function unfollowUser(followerId: string, followedId: string): Promise<void> {
  const supabase = getSocialClient();

  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('followed_id', followedId);

  if (error) {
    throw new Error(`Failed to unfollow user: ${error.message}`);
  }
}

/**
 * Checks if a user is following another user.
 */
export async function isFollowingUser(
  followerId: string,
  followedId: string
): Promise<boolean> {
  const supabase = getSocialClient();

  const { count, error } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', followerId)
    .eq('followed_id', followedId);

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return false;
    }
    throw new Error(`Failed to check follow status: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Gets follower count for a user (VIP only).
 */
export async function getFollowerCount(userId: string): Promise<number | null> {
  const supabase = getSocialClient();

  const { data, error } = await supabase.rpc('get_follower_count', {
    p_user_id: userId,
  });

  if (error) {
    if (error.code === '42883') {
      // Function doesn't exist yet
      return null;
    }
    throw new Error(`Failed to get follower count: ${error.message}`);
  }

  return data as number | null;
}

// =============================================================================
// FRIEND REQUESTS QUERIES (T016)
// =============================================================================

/**
 * Fetches pending friend requests (both incoming and outgoing).
 */
export async function fetchFriendRequests(userId: string): Promise<{
  incoming: FriendRequestWithProfile[];
  outgoing: FriendRequestWithProfile[];
}> {
  const supabase = getSocialClient();

  // Fetch incoming requests
  const { data: incomingData, error: incomingError } = await supabase
    .from('friend_requests')
    .select(
      `
      *,
      sender:profiles!sender_id (
        id,
        display_name,
        avatar_url
      ),
      recipient:profiles!recipient_id (
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (incomingError && incomingError.code !== '42P01') {
    throw new Error(`Failed to fetch incoming requests: ${incomingError.message}`);
  }

  // Fetch outgoing requests
  const { data: outgoingData, error: outgoingError } = await supabase
    .from('friend_requests')
    .select(
      `
      *,
      sender:profiles!sender_id (
        id,
        display_name,
        avatar_url
      ),
      recipient:profiles!recipient_id (
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (outgoingError && outgoingError.code !== '42P01') {
    throw new Error(`Failed to fetch outgoing requests: ${outgoingError.message}`);
  }

  const transformRequest = (row: QueryResult): FriendRequestWithProfile => ({
    id: row.id,
    sender_id: row.sender_id,
    recipient_id: row.recipient_id,
    status: row.status,
    message: row.message,
    created_at: row.created_at,
    responded_at: row.responded_at,
    expires_at: row.expires_at,
    sender: row.sender,
    recipient: row.recipient,
  });

  return {
    incoming: ((incomingData ?? []) as QueryResult[]).map(transformRequest),
    outgoing: ((outgoingData ?? []) as QueryResult[]).map(transformRequest),
  };
}

/**
 * Sends a friend request using the RPC function.
 */
export async function sendFriendRequest(
  recipientId: string,
  message?: string
): Promise<SendFriendRequestResponse> {
  const supabase = getSocialClient();

  const { data, error } = await supabase.rpc('send_friend_request', {
    p_recipient_id: recipientId,
    p_message: message ?? null,
  });

  if (error) {
    throw new Error(`Failed to send friend request: ${error.message}`);
  }

  return data as SendFriendRequestResponse;
}

/**
 * Responds to a friend request (accept/decline) using the RPC function.
 */
export async function respondToFriendRequest(
  requestId: string,
  accept: boolean
): Promise<RespondToFriendRequestResponse> {
  const supabase = getSocialClient();

  const { data, error } = await supabase.rpc('respond_to_friend_request', {
    p_request_id: requestId,
    p_accept: accept,
  });

  if (error) {
    throw new Error(`Failed to respond to friend request: ${error.message}`);
  }

  return data as RespondToFriendRequestResponse;
}

/**
 * Cancels a pending outgoing friend request.
 */
export async function cancelFriendRequest(requestId: string, senderId: string): Promise<void> {
  const supabase = getSocialClient();

  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId)
    .eq('sender_id', senderId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(`Failed to cancel friend request: ${error.message}`);
  }
}

/**
 * Checks if current user can send a friend request.
 */
export async function canSendFriendRequest(
  targetUserId: string
): Promise<CanSendFriendRequestResponse> {
  const supabase = getSocialClient();

  const { data, error } = await supabase.rpc('can_send_friend_request', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(`Failed to check friend request eligibility: ${error.message}`);
  }

  return data as CanSendFriendRequestResponse;
}

// =============================================================================
// FRIENDSHIPS QUERIES (T017)
// =============================================================================

/**
 * Fetches user's friends list with profile info.
 */
export async function fetchFriends(userId: string): Promise<FriendInfo[]> {
  const supabase = getSocialClient();

  // Friends can be on either side of the friendship due to canonical ordering
  const { data, error } = await supabase
    .from('friendships')
    .select(
      `
      id,
      user_id,
      friend_id,
      created_at
    `
    )
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw new Error(`Failed to fetch friends: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get the friend IDs (the other user in each friendship)
  const friendIds = (data as QueryResult[]).map((row) =>
    row.user_id === userId ? row.friend_id : row.user_id
  );

  // Fetch profiles for all friends (exclude VIP service accounts from friend lists)
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, online_status, last_active_at, account_type')
    .in('id', friendIds)
    .neq('account_type', 'vip');

  if (profileError) {
    throw new Error(`Failed to fetch friend profiles: ${profileError.message}`);
  }

  // Create a map of profile data
  const profileMap = new Map(
    ((profiles ?? []) as QueryResult[]).map((p) => [p.id, p])
  );

  // Map the created_at from friendships to friends
  const friendshipMap = new Map(
    (data as QueryResult[]).map((row) => [
      row.user_id === userId ? row.friend_id : row.user_id,
      row.created_at,
    ])
  );

  return friendIds.map((friendId) => {
    const profile = profileMap.get(friendId);
    return {
      id: friendId,
      display_name: profile?.display_name ?? 'Unknown',
      avatar_url: profile?.avatar_url ?? null,
      friends_since: friendshipMap.get(friendId) ?? '',
      is_online: profile?.online_status === 'online',
      last_active: profile?.last_active_at ?? undefined,
    };
  });
}

/**
 * Checks if two users are friends using the RPC function.
 */
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const supabase = getSocialClient();

  const { data, error } = await supabase.rpc('are_friends', {
    p_user1: userId1,
    p_user2: userId2,
  });

  if (error) {
    if (error.code === '42883') {
      // Function doesn't exist yet
      return false;
    }
    throw new Error(`Failed to check friendship: ${error.message}`);
  }

  return data as boolean;
}

/**
 * Removes a friend (silently - no notification to the other user).
 */
export async function unfriend(userId: string, friendId: string): Promise<void> {
  const supabase = getSocialClient();

  // Use RPC function to safely handle unfriend with canonical ordering
  const { error } = await supabase.rpc('unfriend_user', {
    p_friend_id: friendId,
  });

  if (error) {
    throw new Error(`Failed to unfriend: ${error.message}`);
  }
}

/**
 * Fetches mutual friends between two users using the RPC function.
 *
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @param limit - Maximum number of results to return (default: 100)
 */
export async function fetchMutualFriends(
  userId1: string,
  userId2: string,
  limit = 100
): Promise<FriendInfo[]> {
  const supabase = getSocialClient();

  const { data, error } = await supabase.rpc('get_mutual_friends', {
    p_user1: userId1,
    p_user2: userId2,
  });

  if (error) {
    if (error.code === '42883') {
      // Function doesn't exist yet
      return [];
    }
    throw new Error(`Failed to fetch mutual friends: ${error.message}`);
  }

  // Apply client-side limit (IMPROVED: configurable limit)
  const results = ((data ?? []) as QueryResult[]).map((row) => ({
    id: row.user_id,
    display_name: row.display_name ?? 'Unknown',
    avatar_url: row.avatar_url,
    friends_since: '', // Not available from this RPC
  }));

  return results.slice(0, limit);
}

/**
 * Gets mutual friends count between two users.
 */
export async function getMutualFriendsCount(
  userId1: string,
  userId2: string
): Promise<number> {
  const mutualFriends = await fetchMutualFriends(userId1, userId2);
  return mutualFriends.length;
}

// =============================================================================
// FRIEND ACTIVITIES QUERIES (T018)
// =============================================================================

/**
 * Fetches activity feed from friends with pagination.
 */
export async function fetchFriendActivities(
  limit = 20,
  offset = 0,
  activityTypeFilter?: ActivityType
): Promise<FriendActivityWithProfile[]> {
  const supabase = getSocialClient();

  // Use server-side filtering to avoid unnecessary data transfer (FIXED: moved filtering to server)
  const { data, error } = await supabase.rpc('get_friend_activity_feed_filtered', {
    p_limit: limit,
    p_offset: offset,
    p_activity_type: activityTypeFilter ?? null,
  });

  if (error) {
    if (error.code === '42883') {
      // Function doesn't exist yet, fall back to unfiltered version
      const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_friend_activity_feed', {
        p_limit: limit,
        p_offset: offset,
      });

      if (fallbackError) {
        if (fallbackError.code === '42883') {
          return [];
        }
        throw new Error(`Failed to fetch friend activities: ${fallbackError.message}`);
      }

      let activities = ((fallbackData ?? []) as QueryResult[]).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        display_name: row.display_name ?? 'Unknown',
        avatar_url: row.avatar_url,
        activity_type: row.activity_type as ActivityType,
        reference_type: row.reference_type,
        reference_id: row.reference_id,
        metadata: row.metadata ?? {},
        visibility: row.visibility,
        created_at: row.created_at,
      }));

      // Client-side filter only for fallback
      if (activityTypeFilter) {
        activities = activities.filter((a) => a.activity_type === activityTypeFilter);
      }

      return activities;
    }
    throw new Error(`Failed to fetch friend activities: ${error.message}`);
  }

  return ((data ?? []) as QueryResult[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name ?? 'Unknown',
    avatar_url: row.avatar_url,
    activity_type: row.activity_type as ActivityType,
    reference_type: row.reference_type,
    reference_id: row.reference_id,
    metadata: row.metadata ?? {},
    visibility: row.visibility,
    created_at: row.created_at,
  }));
}

/**
 * Creates an activity entry (called when user performs an action).
 */
export async function createActivity(
  userId: string,
  activityType: ActivityType,
  referenceType: string,
  referenceId: string,
  metadata: Record<string, unknown> = {},
  visibility: 'public' | 'friends' | 'private' = 'friends'
): Promise<void> {
  const supabase = getSocialClient();

  const { error } = await supabase.from('friend_activities').insert({
    user_id: userId,
    activity_type: activityType,
    reference_type: referenceType,
    reference_id: referenceId,
    metadata,
    visibility,
  });

  if (error) {
    throw new Error(`Failed to create activity: ${error.message}`);
  }
}

/**
 * Deletes a user's activity (for privacy).
 */
export async function deleteActivity(activityId: string, userId: string): Promise<void> {
  const supabase = getSocialClient();

  const { error } = await supabase
    .from('friend_activities')
    .delete()
    .eq('id', activityId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete activity: ${error.message}`);
  }
}

// =============================================================================
// PRIVACY SETTINGS QUERIES (T019)
// =============================================================================

/**
 * Fetches user's social privacy settings.
 */
export async function fetchSocialPrivacySettings(
  userId: string
): Promise<SocialPrivacySettings | null> {
  const supabase = getSocialClient();

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'privacy_preset, messaging_privacy, online_status_privacy, discoverable'
    )
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No profile found
    }
    throw new Error(`Failed to fetch privacy settings: ${error.message}`);
  }

  return {
    privacy_preset: data.privacy_preset ?? 'everyone',
    messaging_privacy: data.messaging_privacy ?? 'everyone',
    online_status_privacy: data.online_status_privacy ?? 'friends_only',
    activity_feed_privacy: 'friends_only', // Default - could be added to profiles table
    discoverable: data.discoverable ?? true,
  };
}

/**
 * Updates user's social privacy settings.
 */
export async function updateSocialPrivacySettings(
  userId: string,
  settings: Partial<SocialPrivacySettings>
): Promise<void> {
  const supabase = getSocialClient();

  // Map our settings to profile columns
  const updateData: Record<string, unknown> = {};

  if (settings.privacy_preset !== undefined) {
    updateData.privacy_preset = settings.privacy_preset;
  }
  if (settings.messaging_privacy !== undefined) {
    updateData.messaging_privacy = settings.messaging_privacy;
  }
  if (settings.online_status_privacy !== undefined) {
    updateData.online_status_privacy = settings.online_status_privacy;
  }
  if (settings.discoverable !== undefined) {
    updateData.discoverable = settings.discoverable;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update privacy settings: ${error.message}`);
  }
}

/**
 * Applies a privacy preset (updates multiple settings at once).
 */
export async function applyPrivacyPreset(
  userId: string,
  preset: 'only_me' | 'friends_only' | 'everyone'
): Promise<void> {
  const presetSettings: Record<string, Partial<SocialPrivacySettings>> = {
    only_me: {
      privacy_preset: 'only_me',
      messaging_privacy: 'nobody',
      online_status_privacy: 'nobody',
      activity_feed_privacy: 'nobody',
      discoverable: false,
    },
    friends_only: {
      privacy_preset: 'friends_only',
      messaging_privacy: 'friends_only',
      online_status_privacy: 'friends_only',
      activity_feed_privacy: 'friends_only',
      discoverable: true,
    },
    everyone: {
      privacy_preset: 'everyone',
      messaging_privacy: 'everyone',
      online_status_privacy: 'everyone',
      activity_feed_privacy: 'friends_only',
      discoverable: true,
    },
  };

  await updateSocialPrivacySettings(userId, presetSettings[preset]);
}

// =============================================================================
// ONLINE STATUS QUERIES
// =============================================================================

/**
 * Updates user's online status.
 */
export async function updateOnlineStatus(
  userId: string,
  status: 'online' | 'away' | 'invisible' | 'offline'
): Promise<void> {
  const supabase = getSocialClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      online_status: status,
      last_active_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update online status: ${error.message}`);
  }
}

/**
 * Gets online status for multiple users (batch query for efficiency).
 */
export async function getOnlineStatuses(
  userIds: string[]
): Promise<Map<string, { status: string; lastActive: string | null }>> {
  const supabase = getSocialClient();

  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, online_status, last_active_at')
    .in('id', userIds);

  if (error) {
    throw new Error(`Failed to fetch online statuses: ${error.message}`);
  }

  const statusMap = new Map<string, { status: string; lastActive: string | null }>();

  for (const row of (data ?? []) as QueryResult[]) {
    statusMap.set(row.id, {
      status: row.online_status ?? 'offline',
      lastActive: row.last_active_at ?? null,
    });
  }

  return statusMap;
}

// =============================================================================
// REALTIME SUBSCRIPTION HELPERS
// =============================================================================

/**
 * Profile cache for real-time subscriptions to avoid N+1 queries.
 * TTL: 5 minutes
 */
const profileCache = new Map<string, {
  profile: { display_name: string; avatar_url: string | null };
  timestamp: number;
}>();

const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Cleans up expired entries from the profile cache (FIXED: prevents memory leak).
 * Should be called periodically or when cache grows too large.
 */
function cleanupProfileCache(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];

  // Identify expired entries
  profileCache.forEach((value, key) => {
    if (now - value.timestamp >= PROFILE_CACHE_TTL) {
      expiredKeys.push(key);
    }
  });

  // Remove expired entries
  expiredKeys.forEach((key) => profileCache.delete(key));
}

/**
 * Fetches profile with caching to reduce N+1 queries.
 */
async function getCachedProfile(
  userId: string,
  supabase: QueryResult
): Promise<{ display_name: string; avatar_url: string | null }> {
  const now = Date.now();
  const cached = profileCache.get(userId);

  // Return cached if valid
  if (cached && now - cached.timestamp < PROFILE_CACHE_TTL) {
    return cached.profile;
  }

  // Periodically cleanup expired entries (every 100 cache misses)
  if (Math.random() < 0.01) {
    cleanupProfileCache();
  }

  // Fetch fresh profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .single();

  const profileData = {
    display_name: profile?.display_name ?? 'Unknown',
    avatar_url: profile?.avatar_url ?? null,
  };

  // Update cache
  profileCache.set(userId, {
    profile: profileData,
    timestamp: now,
  });

  return profileData;
}

/**
 * Creates a Realtime subscription for friend activities.
 * Returns an unsubscribe function.
 *
 * IMPROVED: Uses profile caching to avoid N+1 queries when multiple
 * friends are active simultaneously.
 */
export function subscribeToFriendActivities(
  userId: string,
  onActivity: (activity: FriendActivityWithProfile) => void
): () => void {
  const supabase = getSocialClient();

  const channel = supabase
    .channel(`friend_activities:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'friend_activities',
      },
      async (payload: QueryResult) => {
        // Fetch profile with caching (FIXED: reduces N+1 queries)
        const profile = await getCachedProfile(payload.new.user_id, supabase);

        const activity: FriendActivityWithProfile = {
          id: payload.new.id,
          user_id: payload.new.user_id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          activity_type: payload.new.activity_type,
          reference_type: payload.new.reference_type,
          reference_id: payload.new.reference_id,
          metadata: payload.new.metadata ?? {},
          visibility: payload.new.visibility,
          created_at: payload.new.created_at,
        };

        onActivity(activity);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Creates a Realtime subscription for friend request updates.
 * Returns an unsubscribe function.
 */
export function subscribeToFriendRequests(
  userId: string,
  onRequest: (request: FriendRequest, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
): () => void {
  const supabase = getSocialClient();

  const channel = supabase
    .channel(`friend_requests:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload: QueryResult) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const request = (eventType === 'DELETE' ? payload.old : payload.new) as FriendRequest;
        onRequest(request, eventType);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
