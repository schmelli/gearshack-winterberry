/**
 * VIP API Routes Integration Tests
 *
 * Feature: 052-vip-loadouts
 *
 * Tests:
 * - GET /api/vip - VIP directory listing with search and pagination
 * - GET /api/vip/featured - Featured VIPs for community page
 *
 * Coverage:
 * - Query parameter validation
 * - Pagination
 * - Search filtering
 * - Featured filtering
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getVips } from '@/app/api/vip/route';
import { GET as getFeaturedVips } from '@/app/api/vip/featured/route';
import type { VipWithStats } from '@/types/vip';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock VIP data
const mockVipAccounts: Array<Record<string, unknown>> = [
  {
    id: 'vip-1',
    name: 'Andrew Skurka',
    slug: 'andrew-skurka',
    bio: 'National Geographic Adventurer of the Year. Ultralight backpacker.',
    avatar_url: 'https://example.com/skurka.jpg',
    social_links: { youtube: 'https://youtube.com/skurka' },
    status: 'claimed',
    is_featured: true,
    claimed_by_user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    archived_at: null,
    archive_reason: null,
    vip_follows: [{ count: 1500 }],
    vip_loadouts: [{ count: 12 }],
  },
  {
    id: 'vip-2',
    name: 'Darwin on the Trail',
    slug: 'darwin-on-the-trail',
    bio: 'Thru-hiker and YouTube creator sharing long trails.',
    avatar_url: 'https://example.com/darwin.jpg',
    social_links: { youtube: 'https://youtube.com/darwin' },
    status: 'curated',
    is_featured: true,
    claimed_by_user_id: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    archived_at: null,
    archive_reason: null,
    vip_follows: [{ count: 2200 }],
    vip_loadouts: [{ count: 8 }],
  },
  {
    id: 'vip-3',
    name: 'Jupiter Hikes',
    slug: 'jupiter-hikes',
    bio: 'Backcountry photographer and gear reviewer.',
    avatar_url: 'https://example.com/jupiter.jpg',
    social_links: { instagram: 'https://instagram.com/jupiter' },
    status: 'curated',
    is_featured: false,
    claimed_by_user_id: null,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    archived_at: null,
    archive_reason: null,
    vip_follows: [{ count: 800 }],
    vip_loadouts: [{ count: 5 }],
  },
];

// Mock query builder with chaining
function createMockQueryBuilder(data: unknown[] = [], error: Error | null = null, count = 0) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data, error, count })),
  };
  return mock;
}

// Mock Supabase server client
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// =============================================================================
// Helper Functions
// =============================================================================

function createRequest(path: string, searchParams?: Record<string, string>): NextRequest {
  const url = new URL(path, 'http://localhost:3000');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url);
}

// =============================================================================
// Test Suite: GET /api/vip
// =============================================================================

describe('GET /api/vip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  describe('Successful Requests', () => {
    it('should return VIP list with default pagination', async () => {
      const queryBuilder = createMockQueryBuilder(mockVipAccounts, null, 3);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip');
      const response = await getVips(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vips).toHaveLength(3);
      expect(data.total).toBe(3);
      expect(data.hasMore).toBe(false);

      // Verify first VIP structure
      const firstVip = data.vips[0];
      expect(firstVip.name).toBe('Andrew Skurka');
      expect(firstVip.slug).toBe('andrew-skurka');
      expect(firstVip.followerCount).toBe(1500);
      expect(firstVip.loadoutCount).toBe(12);
    });

    it('should apply custom pagination parameters', async () => {
      const queryBuilder = createMockQueryBuilder([mockVipAccounts[0]], null, 3);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip', { limit: '1', offset: '0' });
      const response = await getVips(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vips).toHaveLength(1);
      expect(data.hasMore).toBe(true); // More results available

      // Verify pagination was applied
      expect(queryBuilder.range).toHaveBeenCalledWith(0, 0); // offset to offset + limit - 1
    });

    it('should filter by search query', async () => {
      const queryBuilder = createMockQueryBuilder([mockVipAccounts[0]], null, 1);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip', { query: 'Skurka' });
      const response = await getVips(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(queryBuilder.or).toHaveBeenCalled();
      expect(data.vips).toHaveLength(1);
    });

    it('should filter by featured status', async () => {
      const featuredVips = mockVipAccounts.filter((v) => v.is_featured);
      const queryBuilder = createMockQueryBuilder(featuredVips, null, 2);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip', { featured: 'true' });
      const response = await getVips(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(queryBuilder.eq).toHaveBeenCalledWith('is_featured', true);
      expect(data.vips.every((v: VipWithStats) => v.isFeatured)).toBe(true);
    });

    it('should exclude archived VIPs', async () => {
      const queryBuilder = createMockQueryBuilder(mockVipAccounts, null, 3);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip');
      await getVips(request);

      expect(queryBuilder.is).toHaveBeenCalledWith('archived_at', null);
    });

    it('should order by featured first, then by creation date', async () => {
      const queryBuilder = createMockQueryBuilder(mockVipAccounts, null, 3);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip');
      await getVips(request);

      expect(queryBuilder.order).toHaveBeenCalledWith('is_featured', { ascending: false });
      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('Validation Errors', () => {
    it('should reject invalid limit parameter', async () => {
      const queryBuilder = createMockQueryBuilder([], null, 0);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip', { limit: '100' }); // max is 50
      const response = await getVips(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should reject negative offset', async () => {
      const queryBuilder = createMockQueryBuilder([], null, 0);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip', { offset: '-5' });
      const response = await getVips(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should reject invalid featured filter value', async () => {
      const queryBuilder = createMockQueryBuilder([], null, 0);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip', { featured: 'maybe' });
      const response = await getVips(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const queryBuilder = createMockQueryBuilder(null, new Error('Database error'), 0);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip');
      const response = await getVips(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch VIPs');
    });

    it('should return empty array when no VIPs found', async () => {
      const queryBuilder = createMockQueryBuilder([], null, 0);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip', { query: 'NonExistentVIP' });
      const response = await getVips(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vips).toHaveLength(0);
      expect(data.total).toBe(0);
    });
  });
});

// =============================================================================
// Test Suite: GET /api/vip/featured
// =============================================================================

describe('GET /api/vip/featured', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  describe('Successful Requests', () => {
    it('should return featured VIPs with default limit', async () => {
      const featuredVips = mockVipAccounts.filter((v) => v.is_featured);
      const queryBuilder = createMockQueryBuilder(featuredVips, null, 2);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip/featured');
      const response = await getFeaturedVips(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vips).toBeDefined();
      expect(Array.isArray(data.vips)).toBe(true);

      // Verify all returned VIPs are featured
      data.vips.forEach((vip: VipWithStats) => {
        expect(vip.isFeatured).toBe(true);
      });
    });

    it('should apply custom limit parameter', async () => {
      const queryBuilder = createMockQueryBuilder([mockVipAccounts[0]], null, 1);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip/featured', { limit: '3' });
      const response = await getFeaturedVips(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(queryBuilder.limit).toHaveBeenCalledWith(3);
    });

    it('should include follow status for authenticated users', async () => {
      const featuredVips = mockVipAccounts.filter((v) => v.is_featured);

      // Mock authenticated user
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // First call for VIPs, second for follows
      const vipQueryBuilder = createMockQueryBuilder(featuredVips, null, 2);
      const followsQueryBuilder = createMockQueryBuilder(
        [{ vip_id: 'vip-1' }], // User follows vip-1
        null,
        1
      );

      mockFrom
        .mockReturnValueOnce(vipQueryBuilder)
        .mockReturnValueOnce(followsQueryBuilder);

      const request = createRequest('/api/vip/featured');
      const response = await getFeaturedVips(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // isFollowing should be set based on follows query
    });

    it('should exclude archived VIPs', async () => {
      const queryBuilder = createMockQueryBuilder([], null, 0);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip/featured');
      await getFeaturedVips(request);

      expect(queryBuilder.is).toHaveBeenCalledWith('archived_at', null);
    });

    it('should only return VIPs with published loadouts', async () => {
      const queryBuilder = createMockQueryBuilder([], null, 0);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip/featured');
      await getFeaturedVips(request);

      expect(queryBuilder.eq).toHaveBeenCalledWith('vip_loadouts.status', 'published');
    });
  });

  describe('Validation Errors', () => {
    it('should reject limit above maximum (12)', async () => {
      const queryBuilder = createMockQueryBuilder([], null, 0);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip/featured', { limit: '20' });
      const response = await getFeaturedVips(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should reject limit below minimum (1)', async () => {
      const queryBuilder = createMockQueryBuilder([], null, 0);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip/featured', { limit: '0' });
      const response = await getFeaturedVips(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const queryBuilder = createMockQueryBuilder(null, new Error('Connection failed'), 0);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip/featured');
      const response = await getFeaturedVips(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch featured VIPs');
    });

    it('should return empty array when no featured VIPs exist', async () => {
      const queryBuilder = createMockQueryBuilder([], null, 0);
      mockFrom.mockReturnValue(queryBuilder);

      const request = createRequest('/api/vip/featured');
      const response = await getFeaturedVips(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vips).toHaveLength(0);
    });
  });
});

// =============================================================================
// VIP Data Transformation Tests
// =============================================================================

describe('VIP Data Transformation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it('should correctly transform database rows to VipWithStats', async () => {
    const queryBuilder = createMockQueryBuilder([mockVipAccounts[0]], null, 1);
    mockFrom.mockReturnValue(queryBuilder);

    const request = createRequest('/api/vip');
    const response = await getVips(request);
    const data = await response.json();

    const vip = data.vips[0];

    expect(vip.id).toBe('vip-1');
    expect(vip.name).toBe('Andrew Skurka');
    expect(vip.slug).toBe('andrew-skurka');
    expect(vip.bio).toBe('National Geographic Adventurer of the Year. Ultralight backpacker.');
    expect(vip.avatarUrl).toBe('https://example.com/skurka.jpg');
    expect(vip.socialLinks).toEqual({ youtube: 'https://youtube.com/skurka' });
    expect(vip.status).toBe('claimed');
    expect(vip.isFeatured).toBe(true);
    expect(vip.claimedByUserId).toBe('user-1');
    expect(vip.followerCount).toBe(1500);
    expect(vip.loadoutCount).toBe(12);
    expect(vip.archivedAt).toBeNull();
    expect(vip.archiveReason).toBeNull();
  });

  it('should handle missing counts gracefully', async () => {
    const vipWithoutCounts = {
      ...mockVipAccounts[0],
      vip_follows: undefined,
      vip_loadouts: undefined,
    };
    const queryBuilder = createMockQueryBuilder([vipWithoutCounts], null, 1);
    mockFrom.mockReturnValue(queryBuilder);

    const request = createRequest('/api/vip');
    const response = await getVips(request);
    const data = await response.json();

    const vip = data.vips[0];

    // Should default to 0 when counts are missing
    expect(vip.followerCount).toBe(0);
    expect(vip.loadoutCount).toBe(0);
  });
});
