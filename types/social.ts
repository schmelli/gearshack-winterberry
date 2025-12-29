/**
 * Social Graph Types
 *
 * Feature: 001-social-graph
 * Type definitions for friends, following, and social features
 */

// ===== Enums =====
export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type ActivityType =
  | 'new_loadout'
  | 'loadout_shared'
  | 'marketplace_listing'
  | 'gear_added'
  | 'friend_added'
  | 'profile_updated';
export type ActivityVisibility = 'public' | 'friends' | 'private';
export type PrivacyPreset = 'only_me' | 'friends_only' | 'everyone' | 'custom';
export type AccountType = 'standard' | 'vip' | 'merchant';
export type OnlineStatus = 'online' | 'away' | 'invisible' | 'offline';

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
  last_active?: string;
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
  error?:
    | 'rate_limit_exceeded'
    | 'no_message_exchange'
    | 'already_friends'
    | 'request_already_sent'
    | 'request_pending_from_them';
  request_id?: string;
  resets_at?: string;
}

export interface RespondToFriendRequestResponse {
  success: boolean;
  error?: 'request_not_found';
  accepted?: boolean;
}

export interface CanSendFriendRequestResponse {
  canSend: boolean;
  reason:
    | 'eligible'
    | 'no_message_exchange'
    | 'blocked'
    | 'already_friends'
    | 'request_pending'
    | 'rate_limited';
}

// ===== Hook Return Types =====
export interface UseFriendRequestsReturn {
  pendingIncoming: FriendRequestWithProfile[];
  pendingOutgoing: FriendRequestWithProfile[];
  isLoading: boolean;
  error: string | null;
  sendRequest: (
    recipientId: string,
    message?: string
  ) => Promise<SendFriendRequestResponse>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  canSendRequest: (recipientId: string) => Promise<CanSendFriendRequestResponse>;
  refresh: () => Promise<void>;
}

export interface UseFriendshipsReturn {
  friends: FriendInfo[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  unfriend: (friendId: string) => Promise<void>;
  areFriends: (userId: string) => boolean;
  getMutualFriends: (userId: string) => Promise<FriendInfo[]>;
  refresh: () => Promise<void>;
}

export interface UseFollowingReturn {
  following: FollowInfo[];
  isLoading: boolean;
  error: string | null;
  follow: (userId: string) => Promise<void>;
  unfollow: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  refresh: () => Promise<void>;
}

export interface UseFollowersReturn {
  followerCount: number | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseFriendActivityReturn {
  activities: FriendActivityWithProfile[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export interface UseMutualFriendsReturn {
  mutualFriends: FriendInfo[];
  count: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseSocialPrivacyReturn {
  settings: SocialPrivacySettings | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<SocialPrivacySettings>) => Promise<void>;
  applyPreset: (preset: Exclude<PrivacyPreset, 'custom'>) => Promise<void>;
}

export interface UseOnlineStatusReturn {
  isOnline: boolean;
  status: OnlineStatus;
  lastActive: string | null;
  onlineUsers: Map<string, boolean>;
  lastActiveMap: Map<string, string>;
  isUserOnline: (userId: string) => boolean;
  getUserLastActive: (userId: string) => string | null;
  setStatus: (status: OnlineStatus) => Promise<void>;
  isRealtimeConnected: boolean;
}

// ===== Filter and Sort Options =====
export type FriendsListSortBy = 'name' | 'recent' | 'online' | 'date_added';

export interface FriendsListFilters {
  search?: string;
  sortBy?: FriendsListSortBy;
  onlineOnly?: boolean;
}

export type ActivityTypeFilter =
  | 'all'
  | 'new_loadout'
  | 'loadout_shared'
  | 'marketplace_listing'
  | 'gear_added'
  | 'friend_added';
