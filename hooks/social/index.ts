/**
 * Social Hooks - Barrel Export
 *
 * Feature: 001-social-graph
 * Re-exports all social-related hooks
 */

// Following system
export { useFollowing } from './useFollowing';
export { useFollowers } from './useFollowers';

// Friend requests
export { useFriendRequests } from './useFriendRequests';

// Friendships
export { useFriendships } from './useFriendships';
export { useMutualFriends } from './useMutualFriends';

// Activity feed
export { useFriendActivity } from './useFriendActivity';

// Privacy settings
export { useSocialPrivacy } from './useSocialPrivacy';

// Online status
export { useOnlineStatus } from './useOnlineStatus';
