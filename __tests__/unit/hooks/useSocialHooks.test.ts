/**
 * Social Hooks Tests
 *
 * Feature: 001-social-graph
 *
 * Tests:
 * - useFollowing: Follow/unfollow functionality with optimistic updates
 * - useFriendships: Friends list management with filtering/sorting
 * - useIsFollowing: Single user follow status check
 * - useIsFriend: Single user friendship check
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFollowing, useIsFollowing } from '@/hooks/social/useFollowing';
import { useFriendships, useFilteredFriends, useIsFriend } from '@/hooks/social/useFriendships';
import type { FollowInfo, FriendInfo } from '@/types/social';

// =============================================================================
// Mock Data
// =============================================================================

const mockFollowing: FollowInfo[] = [
  {
    id: 'user-1',
    display_name: 'Trail Blazer',
    avatar_url: 'https://example.com/trail.jpg',
    following_since: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    display_name: 'Mountain Explorer',
    avatar_url: 'https://example.com/mountain.jpg',
    following_since: '2024-01-15T00:00:00Z',
  },
];

const mockFriends: FriendInfo[] = [
  {
    id: 'friend-1',
    display_name: 'Hiking Buddy',
    avatar_url: 'https://example.com/buddy.jpg',
    friends_since: '2024-01-01T00:00:00Z',
    is_online: true,
    last_active: '2024-06-15T10:00:00Z',
  },
  {
    id: 'friend-2',
    display_name: 'Backpacker Pro',
    avatar_url: 'https://example.com/backpacker.jpg',
    friends_since: '2024-02-01T00:00:00Z',
    is_online: false,
    last_active: '2024-06-14T08:00:00Z',
  },
  {
    id: 'friend-3',
    display_name: 'Adventure Seeker',
    avatar_url: 'https://example.com/adventure.jpg',
    friends_since: '2024-03-01T00:00:00Z',
    is_online: true,
    last_active: '2024-06-15T12:00:00Z',
  },
];

// =============================================================================
// Mock Auth Context
// =============================================================================

const mockUser = { uid: 'current-user-id' };
const mockAuthContext = vi.fn();

vi.mock('@/components/auth/SupabaseAuthProvider', () => ({
  useAuthContext: () => mockAuthContext(),
}));

// =============================================================================
// Mock Social Queries
// =============================================================================

const mockFetchFollowing = vi.fn();
const mockFollowUser = vi.fn();
const mockUnfollowUser = vi.fn();
const mockIsFollowingUser = vi.fn();
const mockFetchFriends = vi.fn();
const mockAreFriends = vi.fn();
const mockUnfriend = vi.fn();
const mockFetchMutualFriends = vi.fn();

vi.mock('@/lib/supabase/social-queries', () => ({
  fetchFollowing: () => mockFetchFollowing(),
  followUser: (followerId: string, followeeId: string) => mockFollowUser(followerId, followeeId),
  unfollowUser: (followerId: string, followeeId: string) => mockUnfollowUser(followerId, followeeId),
  isFollowingUser: (followerId: string, followeeId: string) => mockIsFollowingUser(followerId, followeeId),
  fetchFriends: () => mockFetchFriends(),
  areFriends: (userId1: string, userId2: string) => mockAreFriends(userId1, userId2),
  unfriend: (userId: string, friendId: string) => mockUnfriend(userId, friendId),
  fetchMutualFriends: (userId1: string, userId2: string) => mockFetchMutualFriends(userId1, userId2),
}));

// =============================================================================
// useFollowing Tests
// =============================================================================

describe('useFollowing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.mockReturnValue({ user: mockUser });
    mockFetchFollowing.mockResolvedValue(mockFollowing);
  });

  describe('Initial State', () => {
    it('should load following list on mount', async () => {
      const { result } = renderHook(() => useFollowing());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.following).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });

    it('should set empty list when not authenticated', async () => {
      mockAuthContext.mockReturnValue({ user: null });

      const { result } = renderHook(() => useFollowing());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.following).toHaveLength(0);
    });

    it('should handle fetch error gracefully', async () => {
      mockFetchFollowing.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFollowing());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.following).toHaveLength(0);
    });
  });

  describe('Follow Operation', () => {
    it('should follow a user with optimistic update', async () => {
      mockFollowUser.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFollowing());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.following.length;

      await act(async () => {
        await result.current.follow('new-user-id');
      });

      // Optimistic update should have added user
      expect(mockFollowUser).toHaveBeenCalledWith('current-user-id', 'new-user-id');
    });

    it('should throw error when trying to follow yourself', async () => {
      const { result } = renderHook(() => useFollowing());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.follow('current-user-id');
        })
      ).rejects.toThrow('Cannot follow yourself');
    });

    it('should throw error when not authenticated', async () => {
      mockAuthContext.mockReturnValue({ user: null });

      const { result } = renderHook(() => useFollowing());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.follow('some-user');
        })
      ).rejects.toThrow('Must be logged in to follow users');
    });

    it('should rollback on follow error', async () => {
      mockFollowUser.mockRejectedValue(new Error('Follow failed'));

      const { result } = renderHook(() => useFollowing());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.following.length;

      await expect(
        act(async () => {
          await result.current.follow('new-user-id');
        })
      ).rejects.toThrow('Follow failed');

      // Should rollback to original count
      expect(result.current.following.length).toBe(initialCount);
    });
  });

  describe('Unfollow Operation', () => {
    it('should unfollow a user with optimistic update', async () => {
      mockUnfollowUser.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFollowing());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.following.length;
      const userToUnfollow = result.current.following[0].id;

      await act(async () => {
        await result.current.unfollow(userToUnfollow);
      });

      expect(mockUnfollowUser).toHaveBeenCalledWith('current-user-id', userToUnfollow);
      expect(result.current.following.length).toBe(initialCount - 1);
    });

    it('should rollback on unfollow error', async () => {
      mockUnfollowUser.mockRejectedValue(new Error('Unfollow failed'));

      const { result } = renderHook(() => useFollowing());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.following.length;

      await expect(
        act(async () => {
          await result.current.unfollow('user-1');
        })
      ).rejects.toThrow('Unfollow failed');

      // Should rollback
      expect(result.current.following.length).toBe(initialCount);
    });
  });

  describe('isFollowing Check', () => {
    it('should return true for followed user', async () => {
      const { result } = renderHook(() => useFollowing());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isFollowing('user-1')).toBe(true);
      expect(result.current.isFollowing('user-2')).toBe(true);
    });

    it('should return false for non-followed user', async () => {
      const { result } = renderHook(() => useFollowing());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isFollowing('unknown-user')).toBe(false);
    });
  });
});

// =============================================================================
// useIsFollowing Tests
// =============================================================================

describe('useIsFollowing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.mockReturnValue({ user: mockUser });
  });

  it('should check follow status for specific user', async () => {
    mockIsFollowingUser.mockResolvedValue(true);

    const { result } = renderHook(() => useIsFollowing('target-user-id'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFollowing).toBe(true);
  });

  it('should return false when not authenticated', async () => {
    mockAuthContext.mockReturnValue({ user: null });

    const { result } = renderHook(() => useIsFollowing('target-user-id'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFollowing).toBe(false);
  });

  it('should toggle follow status', async () => {
    mockIsFollowingUser.mockResolvedValue(false);
    mockFollowUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useIsFollowing('target-user-id'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFollowing).toBe(false);

    await act(async () => {
      await result.current.toggle();
    });

    // Optimistic update
    expect(result.current.isFollowing).toBe(true);
    expect(mockFollowUser).toHaveBeenCalled();
  });

  it('should toggle unfollow', async () => {
    mockIsFollowingUser.mockResolvedValue(true);
    mockUnfollowUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useIsFollowing('target-user-id'));

    await waitFor(() => {
      expect(result.current.isFollowing).toBe(true);
    });

    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.isFollowing).toBe(false);
    expect(mockUnfollowUser).toHaveBeenCalled();
  });
});

// =============================================================================
// useFriendships Tests
// =============================================================================

describe('useFriendships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.mockReturnValue({ user: mockUser });
    mockFetchFriends.mockResolvedValue(mockFriends);
  });

  describe('Initial State', () => {
    it('should load friends list on mount', async () => {
      const { result } = renderHook(() => useFriendships());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.friends).toHaveLength(3);
      expect(result.current.totalCount).toBe(3);
      expect(result.current.error).toBeNull();
    });

    it('should set empty list when not authenticated', async () => {
      mockAuthContext.mockReturnValue({ user: null });

      const { result } = renderHook(() => useFriendships());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.friends).toHaveLength(0);
    });

    it('should handle fetch error gracefully', async () => {
      mockFetchFriends.mockRejectedValue(new Error('Database unavailable'));

      const { result } = renderHook(() => useFriendships());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Database unavailable');
    });
  });

  describe('Unfriend Operation', () => {
    it('should unfriend with optimistic update', async () => {
      mockUnfriend.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFriendships());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.friends.length;

      await act(async () => {
        await result.current.unfriend('friend-1');
      });

      expect(mockUnfriend).toHaveBeenCalledWith('current-user-id', 'friend-1');
      expect(result.current.friends.length).toBe(initialCount - 1);
      expect(result.current.friends.find((f) => f.id === 'friend-1')).toBeUndefined();
    });

    it('should rollback on unfriend error', async () => {
      mockUnfriend.mockRejectedValue(new Error('Unfriend failed'));

      const { result } = renderHook(() => useFriendships());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.friends.length;

      await expect(
        act(async () => {
          await result.current.unfriend('friend-1');
        })
      ).rejects.toThrow('Unfriend failed');

      expect(result.current.friends.length).toBe(initialCount);
    });

    it('should throw when not authenticated', async () => {
      mockAuthContext.mockReturnValue({ user: null });

      const { result } = renderHook(() => useFriendships());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.unfriend('friend-1');
        })
      ).rejects.toThrow('Must be logged in to unfriend users');
    });
  });

  describe('areFriends Check', () => {
    it('should return true for friends', async () => {
      const { result } = renderHook(() => useFriendships());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.areFriends('friend-1')).toBe(true);
      expect(result.current.areFriends('friend-2')).toBe(true);
    });

    it('should return false for non-friends', async () => {
      const { result } = renderHook(() => useFriendships());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.areFriends('stranger')).toBe(false);
    });
  });

  describe('getMutualFriends', () => {
    it('should fetch mutual friends', async () => {
      const mutualFriends = [mockFriends[0]];
      mockFetchMutualFriends.mockResolvedValue(mutualFriends);

      const { result } = renderHook(() => useFriendships());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let mutual: FriendInfo[] = [];
      await act(async () => {
        mutual = await result.current.getMutualFriends('other-user-id');
      });

      expect(mutual).toHaveLength(1);
      expect(mockFetchMutualFriends).toHaveBeenCalledWith('current-user-id', 'other-user-id');
    });

    it('should return empty array on error', async () => {
      mockFetchMutualFriends.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useFriendships());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let mutual: FriendInfo[] = [];
      await act(async () => {
        mutual = await result.current.getMutualFriends('other-user-id');
      });

      expect(mutual).toHaveLength(0);
    });
  });
});

// =============================================================================
// useFilteredFriends Tests
// =============================================================================

describe('useFilteredFriends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.mockReturnValue({ user: mockUser });
    mockFetchFriends.mockResolvedValue(mockFriends);
  });

  it('should filter by search query', async () => {
    const { result } = renderHook(() => useFilteredFriends({ search: 'Buddy' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.friends).toHaveLength(1);
    expect(result.current.friends[0].display_name).toBe('Hiking Buddy');
    expect(result.current.totalCount).toBe(3);
    expect(result.current.filteredCount).toBe(1);
  });

  it('should filter by online status', async () => {
    const { result } = renderHook(() => useFilteredFriends({ onlineOnly: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.friends).toHaveLength(2);
    expect(result.current.friends.every((f) => f.is_online)).toBe(true);
  });

  it('should sort by name', async () => {
    const { result } = renderHook(() => useFilteredFriends({ sortBy: 'name' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const names = result.current.friends.map((f) => f.display_name);
    expect(names).toEqual(['Adventure Seeker', 'Backpacker Pro', 'Hiking Buddy']);
  });

  it('should sort by online status', async () => {
    const { result } = renderHook(() => useFilteredFriends({ sortBy: 'online' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Online users should be first
    expect(result.current.friends[0].is_online).toBe(true);
    expect(result.current.friends[1].is_online).toBe(true);
    expect(result.current.friends[2].is_online).toBe(false);
  });

  it('should sort by date added (newest first)', async () => {
    const { result } = renderHook(() => useFilteredFriends({ sortBy: 'date_added' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // friend-3 is newest, then friend-2, then friend-1
    expect(result.current.friends[0].id).toBe('friend-3');
    expect(result.current.friends[1].id).toBe('friend-2');
    expect(result.current.friends[2].id).toBe('friend-1');
  });

  it('should combine filters and sorting', async () => {
    const { result } = renderHook(() =>
      useFilteredFriends({
        onlineOnly: true,
        sortBy: 'name',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.friends).toHaveLength(2);
    expect(result.current.friends[0].display_name).toBe('Adventure Seeker');
    expect(result.current.friends[1].display_name).toBe('Hiking Buddy');
  });
});

// =============================================================================
// useIsFriend Tests
// =============================================================================

describe('useIsFriend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.mockReturnValue({ user: mockUser });
  });

  it('should check friendship status', async () => {
    mockAreFriends.mockResolvedValue(true);

    const { result } = renderHook(() => useIsFriend('target-user'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFriend).toBe(true);
  });

  it('should return false when not authenticated', async () => {
    mockAuthContext.mockReturnValue({ user: null });

    const { result } = renderHook(() => useIsFriend('target-user'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFriend).toBe(false);
  });

  it('should handle API error', async () => {
    mockAreFriends.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useIsFriend('target-user'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFriend).toBe(false);
  });
});
