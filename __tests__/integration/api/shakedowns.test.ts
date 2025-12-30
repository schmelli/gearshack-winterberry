/**
 * Shakedowns API Integration Tests
 *
 * Tests for the community shakedowns API endpoints:
 * GET /api/shakedowns - List shakedowns with pagination/filters
 * POST /api/shakedowns - Create a new shakedown request
 *
 * Feature: 001-community-shakedowns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/shakedowns/route';
import type { ShakedownWithAuthor, ExperienceLevel } from '@/types/shakedown';

// =============================================================================
// Mock Setup
// =============================================================================

const mockAuthUser = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  email: 'hiker@gearshack.com',
};

const mockLoadout = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Same as mockAuthUser
  name: 'PCT Section A Loadout',
};

const mockShakedownRows = [
  {
    id: 'shakedown-001',
    owner_id: 'hiker-uuid-001',
    loadout_id: 'loadout-uuid-001',
    trip_name: 'PCT Section A - Campo to Warner Springs',
    trip_start_date: '2024-04-15',
    trip_end_date: '2024-04-22',
    experience_level: 'intermediate' as ExperienceLevel,
    concerns: 'Worried about water carry capacity',
    privacy: 'public',
    status: 'open',
    feedback_count: 5,
    helpful_count: 3,
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
    // Author info from view
    author_name: 'Mountain Hiker',
    author_avatar: 'https://example.com/avatar1.jpg',
    // Loadout info from view
    loadout_name: 'PCT Section A Loadout',
    total_weight_grams: 8500,
    item_count: 28,
  },
  {
    id: 'shakedown-002',
    owner_id: 'friend-uuid-001',
    loadout_id: 'loadout-uuid-002',
    trip_name: 'JMT Through-Hike',
    trip_start_date: '2024-07-01',
    trip_end_date: '2024-07-21',
    experience_level: 'beginner' as ExperienceLevel,
    concerns: 'First long trail, need all the help',
    privacy: 'friends_only',
    status: 'open',
    feedback_count: 0,
    helpful_count: 0,
    created_at: '2024-02-15T14:30:00Z',
    updated_at: '2024-02-15T14:30:00Z',
    author_name: 'Beginner Backpacker',
    author_avatar: null,
    loadout_name: 'JMT Summer Gear',
    total_weight_grams: 12000,
    item_count: 35,
  },
  {
    id: 'shakedown-003',
    owner_id: 'expert-uuid-001',
    loadout_id: 'loadout-uuid-003',
    trip_name: 'Winter Traverse - High Sierra',
    trip_start_date: '2024-12-01',
    trip_end_date: '2024-12-07',
    experience_level: 'expert' as ExperienceLevel,
    concerns: null,
    privacy: 'public',
    status: 'completed',
    feedback_count: 12,
    helpful_count: 8,
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-10T08:00:00Z',
    author_name: 'Expert Mountaineer',
    author_avatar: 'https://example.com/avatar3.jpg',
    loadout_name: 'Winter Mountaineering Kit',
    total_weight_grams: 15000,
    item_count: 42,
  },
];

const mockCreatedShakedown = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  owner_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  loadout_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  trip_name: 'Colorado Trail Week 1',
  trip_start_date: '2024-06-15',
  trip_end_date: '2024-06-22',
  experience_level: 'intermediate',
  concerns: 'Bear canister recommendations?',
  privacy: 'public',
  share_token: 'abc123xyz',
  status: 'open',
  feedback_count: 0,
  helpful_count: 0,
  is_hidden: false,
  created_at: '2024-03-15T12:00:00Z',
  updated_at: '2024-03-15T12:00:00Z',
  completed_at: null,
  archived_at: null,
};

// Mock query builder factory
function createMockQueryBuilder(
  data: unknown[] = [],
  error: Error | null = null,
  count = 0
) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    insert: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data, error, count })),
  };
  return mock;
}

// Mock Supabase client - defined as module-level to avoid hoisting issues
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => mockFrom(table),
  }),
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('GET /api/shakedowns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: mockAuthUser },
      error: null,
    });
  });

  // ===========================================================================
  // Basic Listing
  // ===========================================================================

  describe('Basic Listing', () => {
    it('should return paginated shakedowns', async () => {
      const queryBuilder = createMockQueryBuilder(mockShakedownRows);
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest('http://localhost:3000/api/shakedowns');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.shakedowns).toBeDefined();
      expect(Array.isArray(data.shakedowns)).toBe(true);
      expect(data.hasMore).toBeDefined();
    });

    it('should transform snake_case to camelCase', async () => {
      const queryBuilder = createMockQueryBuilder([mockShakedownRows[0]]);
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest('http://localhost:3000/api/shakedowns');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const shakedown = data.shakedowns[0] as ShakedownWithAuthor;
      expect(shakedown.ownerId).toBe('hiker-uuid-001');
      expect(shakedown.loadoutId).toBe('loadout-uuid-001');
      expect(shakedown.tripName).toBe('PCT Section A - Campo to Warner Springs');
      expect(shakedown.tripStartDate).toBe('2024-04-15');
      expect(shakedown.experienceLevel).toBe('intermediate');
      expect(shakedown.feedbackCount).toBe(5);
      expect(shakedown.authorName).toBe('Mountain Hiker');
      expect(shakedown.loadoutName).toBe('PCT Section A Loadout');
      expect(shakedown.totalWeightGrams).toBe(8500);
      expect(shakedown.itemCount).toBe(28);
    });

    it('should work without authentication', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      const queryBuilder = createMockQueryBuilder(mockShakedownRows);
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest('http://localhost:3000/api/shakedowns');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // Query Parameter Validation
  // ===========================================================================

  describe('Query Parameter Validation', () => {
    it('should reject invalid limit parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?limit=100'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should reject invalid status parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?status=invalid'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should reject invalid experienceLevel parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?experienceLevel=godmode'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should accept valid query parameters', async () => {
      const queryBuilder = createMockQueryBuilder(mockShakedownRows);
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?limit=20&status=open&experienceLevel=beginner&sort=recent'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // Filtering
  // ===========================================================================

  describe('Filtering', () => {
    it('should filter by status', async () => {
      const queryBuilder = createMockQueryBuilder(
        mockShakedownRows.filter((s) => s.status === 'open')
      );
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?status=open'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'open');
    });

    it('should filter by experience level', async () => {
      const queryBuilder = createMockQueryBuilder(
        mockShakedownRows.filter((s) => s.experience_level === 'beginner')
      );
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?experienceLevel=beginner'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(queryBuilder.eq).toHaveBeenCalledWith('experience_level', 'beginner');
    });

    it('should support text search on trip name', async () => {
      const queryBuilder = createMockQueryBuilder(
        mockShakedownRows.filter((s) => s.trip_name.includes('PCT'))
      );
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?search=PCT'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(queryBuilder.ilike).toHaveBeenCalledWith('trip_name', '%PCT%');
    });
  });

  // ===========================================================================
  // Sorting
  // ===========================================================================

  describe('Sorting', () => {
    it('should sort by recent (default)', async () => {
      const queryBuilder = createMockQueryBuilder(mockShakedownRows);
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest('http://localhost:3000/api/shakedowns');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should sort by popular', async () => {
      const queryBuilder = createMockQueryBuilder(mockShakedownRows);
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?sort=popular'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(queryBuilder.order).toHaveBeenCalledWith('feedback_count', {
        ascending: false,
      });
    });

    it('should sort by unanswered (oldest first with no feedback)', async () => {
      const queryBuilder = createMockQueryBuilder(
        mockShakedownRows.filter((s) => s.feedback_count === 0)
      );
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?sort=unanswered'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(queryBuilder.eq).toHaveBeenCalledWith('feedback_count', 0);
      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', {
        ascending: true,
      });
    });
  });

  // ===========================================================================
  // Pagination
  // ===========================================================================

  describe('Pagination', () => {
    it('should return hasMore=true when more results exist', async () => {
      // Return 21 items when limit is 20 (one extra)
      const extraItems = [...mockShakedownRows, { ...mockShakedownRows[0], id: 'extra' }];
      const queryBuilder = createMockQueryBuilder(extraItems);
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?limit=3'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasMore).toBe(true);
      expect(data.shakedowns.length).toBe(3); // Should slice off the extra
    });

    it('should return hasMore=false when no more results', async () => {
      const queryBuilder = createMockQueryBuilder([mockShakedownRows[0]]);
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?limit=20'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasMore).toBe(false);
    });

    it('should apply cursor for pagination', async () => {
      const queryBuilder = createMockQueryBuilder(mockShakedownRows);
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/shakedowns?cursor=2024-03-01T10:00:00Z'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(queryBuilder.lt).toHaveBeenCalledWith(
        'created_at',
        '2024-03-01T10:00:00Z'
      );
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const queryBuilder = createMockQueryBuilder(
        [],
        new Error('Database connection failed')
      );
      mockFrom.mockReturnValue(queryBuilder);

      const request = new NextRequest('http://localhost:3000/api/shakedowns');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch shakedowns');
    });
  });
});

// =============================================================================
// POST /api/shakedowns Tests
// =============================================================================

describe('POST /api/shakedowns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: mockAuthUser },
      error: null,
    });
  });

  // ===========================================================================
  // Authentication
  // ===========================================================================

  describe('Authentication', () => {
    it('should require authentication', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          loadoutId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          tripName: 'Test Trip',
          tripStartDate: '2024-06-15',
          tripEndDate: '2024-06-22',
          experienceLevel: 'beginner',
          privacy: 'public',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('Validation', () => {
    it('should reject missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          tripName: 'Test Trip',
          // Missing loadoutId, tripStartDate, tripEndDate, experienceLevel
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
      expect(data.details).toBeDefined();
    });

    it('should reject invalid loadout UUID', async () => {
      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          loadoutId: 'not-a-uuid',
          tripName: 'Test Trip',
          tripStartDate: '2024-06-15',
          tripEndDate: '2024-06-22',
          experienceLevel: 'beginner',
          privacy: 'public',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('should reject trip name exceeding max length', async () => {
      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          loadoutId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          tripName: 'A'.repeat(101), // Max is 100
          tripStartDate: '2024-06-15',
          tripEndDate: '2024-06-22',
          experienceLevel: 'beginner',
          privacy: 'public',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('should reject end date before start date', async () => {
      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          loadoutId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          tripName: 'Test Trip',
          tripStartDate: '2024-06-22',
          tripEndDate: '2024-06-15', // Before start date
          experienceLevel: 'beginner',
          privacy: 'public',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should reject invalid experience level', async () => {
      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          loadoutId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          tripName: 'Test Trip',
          tripStartDate: '2024-06-15',
          tripEndDate: '2024-06-22',
          experienceLevel: 'legendary', // Invalid
          privacy: 'public',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });

  // ===========================================================================
  // Loadout Verification
  // ===========================================================================

  describe('Loadout Verification', () => {
    it('should reject non-existent loadout', async () => {
      mockFrom.mockImplementation((table: string) => {
        const query = createMockQueryBuilder([]);
        if (table === 'loadouts') {
          query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
        }
        return query;
      });

      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          loadoutId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          tripName: 'Test Trip',
          tripStartDate: '2024-06-15',
          tripEndDate: '2024-06-22',
          experienceLevel: 'beginner',
          privacy: 'public',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Loadout not found');
    });

    it('should reject loadout owned by another user', async () => {
      const otherUserLoadout = { ...mockLoadout, user_id: 'other-user-uuid' };
      mockFrom.mockImplementation((table: string) => {
        const query = createMockQueryBuilder([]);
        if (table === 'loadouts') {
          query.single.mockResolvedValue({ data: otherUserLoadout, error: null });
        }
        return query;
      });

      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          loadoutId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          tripName: 'Test Trip',
          tripStartDate: '2024-06-15',
          tripEndDate: '2024-06-22',
          experienceLevel: 'beginner',
          privacy: 'public',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Loadout not found or not owned by user');
    });
  });

  // ===========================================================================
  // Successful Creation
  // ===========================================================================

  describe('Successful Creation', () => {
    it('should create a public shakedown with share URL', async () => {
      mockFrom.mockImplementation((table: string) => {
        const query = createMockQueryBuilder([]);
        if (table === 'loadouts') {
          query.single.mockResolvedValue({ data: mockLoadout, error: null });
        } else if (table === 'shakedowns') {
          query.single.mockResolvedValue({ data: mockCreatedShakedown, error: null });
        }
        return query;
      });

      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          loadoutId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          tripName: 'Colorado Trail Week 1',
          tripStartDate: '2024-06-15',
          tripEndDate: '2024-06-22',
          experienceLevel: 'intermediate',
          concerns: 'Bear canister recommendations?',
          privacy: 'public',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.shakedown).toBeDefined();
      expect(data.shakedown.tripName).toBe('Colorado Trail Week 1');
      expect(data.shakedown.experienceLevel).toBe('intermediate');
      expect(data.shakedown.status).toBe('open');
      expect(data.shareUrl).toBeDefined();
      expect(data.shareUrl).toContain('/shakedown/');
    });

    it('should create a friends-only shakedown without share URL', async () => {
      const friendsOnlyShakedown = {
        ...mockCreatedShakedown,
        privacy: 'friends_only',
        share_token: null,
      };

      mockFrom.mockImplementation((table: string) => {
        const query = createMockQueryBuilder([]);
        if (table === 'loadouts') {
          query.single.mockResolvedValue({ data: mockLoadout, error: null });
        } else if (table === 'shakedowns') {
          query.single.mockResolvedValue({ data: friendsOnlyShakedown, error: null });
        }
        return query;
      });

      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          loadoutId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          tripName: 'Private Trip',
          tripStartDate: '2024-06-15',
          tripEndDate: '2024-06-22',
          experienceLevel: 'beginner',
          privacy: 'friends_only',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.shakedown).toBeDefined();
      expect(data.shareUrl).toBeUndefined();
    });

    it('should accept optional concerns field', async () => {
      const shakedownWithoutConcerns = { ...mockCreatedShakedown, concerns: null };

      mockFrom.mockImplementation((table: string) => {
        const query = createMockQueryBuilder([]);
        if (table === 'loadouts') {
          query.single.mockResolvedValue({ data: mockLoadout, error: null });
        } else if (table === 'shakedowns') {
          query.single.mockResolvedValue({ data: shakedownWithoutConcerns, error: null });
        }
        return query;
      });

      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          loadoutId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          tripName: 'No Concerns Trip',
          tripStartDate: '2024-06-15',
          tripEndDate: '2024-06-22',
          experienceLevel: 'experienced',
          privacy: 'public',
          // No concerns field
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle database insert errors', async () => {
      mockFrom.mockImplementation((table: string) => {
        const query = createMockQueryBuilder([]);
        if (table === 'loadouts') {
          query.single.mockResolvedValue({ data: mockLoadout, error: null });
        } else if (table === 'shakedowns') {
          query.single.mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          });
        }
        return query;
      });

      const request = new NextRequest('http://localhost:3000/api/shakedowns', {
        method: 'POST',
        body: JSON.stringify({
          loadoutId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          tripName: 'Test Trip',
          tripStartDate: '2024-06-15',
          tripEndDate: '2024-06-22',
          experienceLevel: 'beginner',
          privacy: 'public',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create shakedown');
    });
  });
});
