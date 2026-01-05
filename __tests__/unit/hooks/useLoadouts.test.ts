/**
 * useLoadouts Hook Tests
 *
 * Tests for loadout CRUD operations and weight calculations using Supabase.
 * Uses realistic outdoor loadout data from fixtures.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLoadouts } from '@/hooks/useLoadouts';
import { resetSupabaseMocks } from '../../mocks/supabase';

// =============================================================================
// Mock Setup
// =============================================================================

const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// =============================================================================
// Test Database Rows (snake_case format)
// =============================================================================

const mockLoadoutDbRows = [
  {
    id: 'loadout-001',
    user_id: 'user-123-uuid',
    name: 'PCT Thru-Hike 2024',
    description: 'Gear list for Pacific Crest Trail thru-hike',
    trip_date: '2024-05-15',
    activity_types: ['hiking', 'backpacking'],
    seasons: ['spring', 'summer', 'fall'],
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'loadout-002',
    user_id: 'user-123-uuid',
    name: 'Weekend Warrior',
    description: 'Quick overnight setup for local trails',
    trip_date: '2024-06-01',
    activity_types: ['hiking'],
    seasons: ['summer'],
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z',
  },
  {
    id: 'loadout-003',
    user_id: 'user-123-uuid',
    name: 'Winter Camping',
    description: 'Cold weather camping setup',
    trip_date: null,
    activity_types: ['camping', 'hiking'],
    seasons: ['winter'],
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z',
  },
];

const mockLoadoutItemsDbRows = [
  {
    id: 'li-001',
    loadout_id: 'loadout-001',
    gear_item_id: 'gear-001',
    quantity: 1,
    is_worn: false,
    is_consumable: false,
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'li-002',
    loadout_id: 'loadout-001',
    gear_item_id: 'gear-002',
    quantity: 1,
    is_worn: false,
    is_consumable: false,
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'li-003',
    loadout_id: 'loadout-001',
    gear_item_id: 'gear-003',
    quantity: 1,
    is_worn: true,
    is_consumable: false,
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'li-004',
    loadout_id: 'loadout-002',
    gear_item_id: 'gear-001',
    quantity: 1,
    is_worn: false,
    is_consumable: false,
    created_at: '2024-02-01T00:00:00Z',
  },
];

// =============================================================================
// Test Helpers
// =============================================================================

function createMockQueryBuilder(overrides: Record<string, unknown> = {}) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn(),
    ...overrides,
  };
  return mock;
}

function setupSuccessfulFetch() {
  let callCount = 0;
  const queryBuilder = createMockQueryBuilder();

  queryBuilder.then = vi.fn((resolve) => {
    callCount++;
    if (callCount === 1) {
      // First call: fetch loadouts
      return resolve({ data: mockLoadoutDbRows, error: null });
    } else {
      // Second call: fetch loadout items
      return resolve({ data: mockLoadoutItemsDbRows, error: null });
    }
  });

  mockSupabaseClient.from.mockReturnValue(queryBuilder);
  return queryBuilder;
}

// =============================================================================
// Tests
// =============================================================================

describe('useLoadouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should start with loading state true', () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn(() => new Promise(() => {}));
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadouts).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should set loadouts to empty array when userId is null', async () => {
      const { result } = renderHook(() => useLoadouts(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.loadouts).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Fetch Tests
  // ===========================================================================

  describe('fetchLoadouts', () => {
    it('should fetch loadouts with items successfully', async () => {
      setupSuccessfulFetch();

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.loadouts).toHaveLength(3);
      expect(result.current.loadouts[0].name).toBe('PCT Thru-Hike 2024');
      expect(result.current.loadouts[0].items).toHaveLength(3);
      expect(result.current.error).toBeNull();
    });

    it('should transform database rows to Loadout format (snake_case to camelCase)', async () => {
      setupSuccessfulFetch();

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loadout = result.current.loadouts[0];
      expect(loadout.userId).toBe('user-123-uuid');
      expect(loadout.tripDate).toBeInstanceOf(Date);
      expect(loadout.activityTypes).toEqual(['hiking', 'backpacking']);
      expect(loadout.seasons).toEqual(['spring', 'summer', 'fall']);
      expect(loadout.createdAt).toBeInstanceOf(Date);
      expect(loadout.updatedAt).toBeInstanceOf(Date);
    });

    it('should transform loadout items correctly', async () => {
      setupSuccessfulFetch();

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = result.current.loadouts[0].items[0];
      expect(item.loadoutId).toBe('loadout-001');
      expect(item.gearItemId).toBe('gear-001');
      expect(item.quantity).toBe(1);
      expect(item.isWorn).toBe(false);
      expect(item.isConsumable).toBe(false);
      expect(item.createdAt).toBeInstanceOf(Date);
    });

    it('should handle fetch error gracefully', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: null, error: { message: 'Database connection failed' } })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Database connection failed');
      expect(result.current.loadouts).toEqual([]);
    });

    it('should handle empty loadouts list', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: [], error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.loadouts).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Create Loadout Tests
  // ===========================================================================

  describe('createLoadout', () => {
    it('should create a new loadout successfully', async () => {
      const newLoadoutDb = {
        id: 'loadout-new',
        user_id: 'user-123-uuid',
        name: 'Spring Trip',
        description: 'New spring hiking trip',
        trip_date: '2024-04-15',
        activity_types: ['hiking'],
        seasons: ['spring'],
        created_at: '2024-03-01T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
      };

      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: mockLoadoutDbRows, error: null });
        }
        return resolve({ data: [], error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({ data: newLoadoutDb, error: null });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdLoadout;
      await act(async () => {
        createdLoadout = await result.current.createLoadout({
          name: 'Spring Trip',
          description: 'New spring hiking trip',
          tripDate: new Date('2024-04-15'),
          activityTypes: ['hiking'],
          seasons: ['spring'],
        });
      });

      expect(createdLoadout).not.toBeNull();
      expect(createdLoadout?.name).toBe('Spring Trip');
      expect(queryBuilder.insert).toHaveBeenCalled();
    });

    it('should return null when user is not authenticated', async () => {
      const { result } = renderHook(() => useLoadouts(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdLoadout;
      await act(async () => {
        createdLoadout = await result.current.createLoadout({
          name: 'Test Loadout',
        });
      });

      expect(createdLoadout).toBeNull();
      expect(result.current.error).toBe('User not authenticated');
    });

    it('should handle create error gracefully', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        return resolve({ data: callCount === 1 ? mockLoadoutDbRows : [], error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Name already exists' }
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdLoadout;
      await act(async () => {
        createdLoadout = await result.current.createLoadout({
          name: 'Duplicate Name',
        });
      });

      expect(createdLoadout).toBeNull();
      expect(result.current.error).toBe('Name already exists');
    });
  });

  // ===========================================================================
  // Update Loadout Tests
  // ===========================================================================

  describe('updateLoadout', () => {
    it('should update an existing loadout successfully', async () => {
      const updatedLoadoutDb = {
        ...mockLoadoutDbRows[0],
        name: 'PCT Thru-Hike 2024 Updated',
        description: 'Updated description',
        updated_at: '2024-03-15T00:00:00Z',
      };

      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: [], error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({ data: updatedLoadoutDb, error: null });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedLoadout;
      await act(async () => {
        updatedLoadout = await result.current.updateLoadout('loadout-001', {
          name: 'PCT Thru-Hike 2024 Updated',
          description: 'Updated description',
        });
      });

      expect(updatedLoadout).not.toBeNull();
      expect(updatedLoadout?.name).toBe('PCT Thru-Hike 2024 Updated');
    });

    it('should return null when user is not authenticated', async () => {
      const { result } = renderHook(() => useLoadouts(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedLoadout;
      await act(async () => {
        updatedLoadout = await result.current.updateLoadout('loadout-001', { name: 'Test' });
      });

      expect(updatedLoadout).toBeNull();
      expect(result.current.error).toBe('User not authenticated');
    });
  });

  // ===========================================================================
  // Delete Loadout Tests
  // ===========================================================================

  describe('deleteLoadout', () => {
    it('should delete a loadout successfully', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: null, error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteSuccess;
      await act(async () => {
        deleteSuccess = await result.current.deleteLoadout('loadout-001');
      });

      expect(deleteSuccess).toBe(true);
      expect(queryBuilder.delete).toHaveBeenCalled();
    });

    it('should return false when user is not authenticated', async () => {
      const { result } = renderHook(() => useLoadouts(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteSuccess;
      await act(async () => {
        deleteSuccess = await result.current.deleteLoadout('loadout-001');
      });

      expect(deleteSuccess).toBe(false);
      expect(result.current.error).toBe('User not authenticated');
    });
  });

  // ===========================================================================
  // Add/Remove Item Tests
  // ===========================================================================

  describe('addItem', () => {
    it('should add an item to a loadout successfully', async () => {
      const newItemDb = {
        id: 'li-new',
        loadout_id: 'loadout-001',
        gear_item_id: 'gear-005',
        quantity: 1,
        is_worn: false,
        is_consumable: true,
        created_at: '2024-03-01T00:00:00Z',
      };

      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: null, error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({ data: newItemDb, error: null });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let newItem;
      await act(async () => {
        newItem = await result.current.addItem('loadout-001', {
          gearItemId: 'gear-005',
          quantity: 1,
          isWorn: false,
          isConsumable: true,
        });
      });

      expect(newItem).not.toBeNull();
      expect(newItem?.gearItemId).toBe('gear-005');
      expect(newItem?.isConsumable).toBe(true);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from a loadout successfully', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: null, error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let removeSuccess;
      await act(async () => {
        removeSuccess = await result.current.removeItem('loadout-001', 'gear-001');
      });

      expect(removeSuccess).toBe(true);
    });
  });

  describe('updateItemState', () => {
    it('should update item state in loadout', async () => {
      const updatedItemDb = {
        id: 'li-001',
        loadout_id: 'loadout-001',
        gear_item_id: 'gear-001',
        quantity: 2,
        is_worn: true,
        is_consumable: false,
        created_at: '2024-01-15T00:00:00Z',
      };

      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: null, error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({ data: updatedItemDb, error: null });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedItem;
      await act(async () => {
        updatedItem = await result.current.updateItemState('loadout-001', 'gear-001', {
          quantity: 2,
          isWorn: true,
        });
      });

      expect(updatedItem).not.toBeNull();
      expect(updatedItem?.quantity).toBe(2);
      expect(updatedItem?.isWorn).toBe(true);
    });

    it('should update isConsumable field', async () => {
      const updatedItemDb = {
        id: 'li-001',
        loadout_id: 'loadout-001',
        gear_item_id: 'gear-001',
        quantity: 1,
        is_worn: false,
        is_consumable: true,
        created_at: '2024-01-15T00:00:00Z',
      };

      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: null, error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({ data: updatedItemDb, error: null });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedItem;
      await act(async () => {
        updatedItem = await result.current.updateItemState('loadout-001', 'gear-001', {
          isConsumable: true,
        });
      });

      expect(updatedItem).not.toBeNull();
      expect(updatedItem?.isConsumable).toBe(true);
    });
  });

  // ===========================================================================
  // Weight Calculation Tests
  // ===========================================================================

  describe('calculateWeight', () => {
    it('should calculate weight summary correctly', async () => {
      setupSuccessfulFetch();

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create a gear items weight map
      const gearItems = new Map<string, number>([
        ['gear-001', 1020], // Big Agnes tent
        ['gear-002', 567],  // EE Enigma quilt
        ['gear-003', 354],  // Thermarest pad (worn)
      ]);

      const summary = result.current.calculateWeight('loadout-001', gearItems);

      expect(summary.totalWeight).toBe(1941); // 1020 + 567 + 354
      expect(summary.wornWeight).toBe(354); // Only gear-003 is worn
      expect(summary.consumableWeight).toBe(0);
      expect(summary.baseWeight).toBe(1587); // 1941 - 354 - 0
    });

    it('should return zero summary for non-existent loadout', async () => {
      setupSuccessfulFetch();

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const gearItems = new Map<string, number>();
      const summary = result.current.calculateWeight('non-existent', gearItems);

      expect(summary.totalWeight).toBe(0);
      expect(summary.wornWeight).toBe(0);
      expect(summary.consumableWeight).toBe(0);
      expect(summary.baseWeight).toBe(0);
    });

    it('should handle items not in gear map (zero weight)', async () => {
      setupSuccessfulFetch();

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Only partial gear items in map
      const gearItems = new Map<string, number>([
        ['gear-001', 1020],
      ]);

      const summary = result.current.calculateWeight('loadout-001', gearItems);

      // Only gear-001 has weight, others are 0
      expect(summary.totalWeight).toBe(1020);
    });
  });

  // ===========================================================================
  // Get Loadout Tests
  // ===========================================================================

  describe('getLoadout', () => {
    it('should return loadout by ID from local state', async () => {
      setupSuccessfulFetch();

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loadout = result.current.getLoadout('loadout-001');
      expect(loadout).toBeDefined();
      expect(loadout?.name).toBe('PCT Thru-Hike 2024');
    });

    it('should return undefined for non-existent loadout ID', async () => {
      setupSuccessfulFetch();

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const loadout = result.current.getLoadout('non-existent-id');
      expect(loadout).toBeUndefined();
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should continue without items when loadout items fetch fails', async () => {
      let callCount = 0;
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          // First call: fetch loadouts succeeds
          return resolve({ data: mockLoadoutDbRows, error: null });
        } else {
          // Second call: fetch loadout items fails
          return resolve({ data: null, error: { message: 'Items fetch failed' } });
        }
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have loadouts but with empty items
      expect(result.current.loadouts).toHaveLength(3);
      expect(result.current.loadouts[0].items).toHaveLength(0);
    });

    it('should handle unexpected error during fetch', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn(() => {
        throw new Error('Unexpected fetch error');
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Unexpected fetch error');
    });

    it('should handle non-Error thrown during fetch', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn(() => {
        throw 'String error';
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch loadouts');
    });

    it('should handle unexpected error during create', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        return resolve({ data: callCount === 1 ? mockLoadoutDbRows : [], error: null });
      });
      queryBuilder.single = vi.fn(() => {
        throw new Error('Unexpected create error');
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdLoadout;
      await act(async () => {
        createdLoadout = await result.current.createLoadout({ name: 'Test' });
      });

      expect(createdLoadout).toBeNull();
      expect(result.current.error).toBe('Unexpected create error');
    });

    it('should handle update error gracefully', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: [], error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedLoadout;
      await act(async () => {
        updatedLoadout = await result.current.updateLoadout('loadout-001', { name: 'Test' });
      });

      expect(updatedLoadout).toBeNull();
      expect(result.current.error).toBe('Update failed');
    });

    it('should handle unexpected error during update', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: [], error: null });
      });
      queryBuilder.single = vi.fn(() => {
        throw new Error('Unexpected update error');
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedLoadout;
      await act(async () => {
        updatedLoadout = await result.current.updateLoadout('loadout-001', { name: 'Test' });
      });

      expect(updatedLoadout).toBeNull();
      expect(result.current.error).toBe('Unexpected update error');
    });

    it('should handle delete error gracefully', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: null, error: { message: 'Delete failed' } });
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteSuccess;
      await act(async () => {
        deleteSuccess = await result.current.deleteLoadout('loadout-001');
      });

      expect(deleteSuccess).toBe(false);
      expect(result.current.error).toBe('Delete failed');
    });

    it('should handle unexpected error during delete', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        throw new Error('Unexpected delete error');
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteSuccess;
      await act(async () => {
        deleteSuccess = await result.current.deleteLoadout('loadout-001');
      });

      expect(deleteSuccess).toBe(false);
      expect(result.current.error).toBe('Unexpected delete error');
    });

    it('should handle addItem error gracefully', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: null, error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert item failed' },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let newItem;
      await act(async () => {
        newItem = await result.current.addItem('loadout-001', { gearItemId: 'gear-999' });
      });

      expect(newItem).toBeNull();
      expect(result.current.error).toBe('Insert item failed');
    });

    it('should handle unexpected error during addItem', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: null, error: null });
      });
      queryBuilder.single = vi.fn(() => {
        throw new Error('Unexpected addItem error');
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let newItem;
      await act(async () => {
        newItem = await result.current.addItem('loadout-001', { gearItemId: 'gear-999' });
      });

      expect(newItem).toBeNull();
      expect(result.current.error).toBe('Unexpected addItem error');
    });

    it('should handle removeItem error gracefully', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: null, error: { message: 'Remove item failed' } });
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let removeSuccess;
      await act(async () => {
        removeSuccess = await result.current.removeItem('loadout-001', 'gear-001');
      });

      expect(removeSuccess).toBe(false);
      expect(result.current.error).toBe('Remove item failed');
    });

    it('should handle unexpected error during removeItem', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        throw new Error('Unexpected removeItem error');
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let removeSuccess;
      await act(async () => {
        removeSuccess = await result.current.removeItem('loadout-001', 'gear-001');
      });

      expect(removeSuccess).toBe(false);
      expect(result.current.error).toBe('Unexpected removeItem error');
    });

    it('should handle updateItemState error gracefully', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: null, error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update item state failed' },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedItem;
      await act(async () => {
        updatedItem = await result.current.updateItemState('loadout-001', 'gear-001', { quantity: 5 });
      });

      expect(updatedItem).toBeNull();
      expect(result.current.error).toBe('Update item state failed');
    });

    it('should handle unexpected error during updateItemState', async () => {
      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: null, error: null });
      });
      queryBuilder.single = vi.fn(() => {
        throw new Error('Unexpected updateItemState error');
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedItem;
      await act(async () => {
        updatedItem = await result.current.updateItemState('loadout-001', 'gear-001', { quantity: 5 });
      });

      expect(updatedItem).toBeNull();
      expect(result.current.error).toBe('Unexpected updateItemState error');
    });
  });

  // ===========================================================================
  // Update Loadout Branch Coverage Tests
  // ===========================================================================

  describe('updateLoadout Branch Coverage', () => {
    it('should update all optional fields including tripDate', async () => {
      const updatedLoadoutDb = {
        ...mockLoadoutDbRows[0],
        name: 'Updated Name',
        description: 'Updated Description',
        trip_date: '2024-07-01',
        activity_types: ['camping', 'fishing'],
        seasons: ['summer'],
        updated_at: '2024-03-15T00:00:00Z',
      };

      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: [], error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({ data: updatedLoadoutDb, error: null });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedLoadout;
      await act(async () => {
        updatedLoadout = await result.current.updateLoadout('loadout-001', {
          name: 'Updated Name',
          description: 'Updated Description',
          tripDate: new Date('2024-07-01'),
          activityTypes: ['camping', 'fishing'],
          seasons: ['summer'],
        });
      });

      expect(updatedLoadout?.name).toBe('Updated Name');
      expect(updatedLoadout?.description).toBe('Updated Description');
      expect(updatedLoadout?.activityTypes).toEqual(['camping', 'fishing']);
      expect(updatedLoadout?.seasons).toEqual(['summer']);
    });

    it('should handle clearing tripDate (null)', async () => {
      const updatedLoadoutDb = {
        ...mockLoadoutDbRows[0],
        trip_date: null,
        updated_at: '2024-03-15T00:00:00Z',
      };

      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: [], error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({ data: updatedLoadoutDb, error: null });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedLoadout;
      await act(async () => {
        updatedLoadout = await result.current.updateLoadout('loadout-001', {
          tripDate: undefined,
        });
      });

      expect(updatedLoadout?.tripDate).toBeNull();
    });

    it('should preserve items when updating loadout that exists in local state', async () => {
      const updatedLoadoutDb = {
        ...mockLoadoutDbRows[0],
        name: 'Updated With Items',
        updated_at: '2024-03-15T00:00:00Z',
      };

      const queryBuilder = createMockQueryBuilder();
      let callCount = 0;
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return resolve({ data: callCount === 1 ? mockLoadoutDbRows : mockLoadoutItemsDbRows, error: null });
        }
        return resolve({ data: [], error: null });
      });
      queryBuilder.single = vi.fn().mockResolvedValue({ data: updatedLoadoutDb, error: null });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalItemCount = result.current.loadouts[0].items.length;
      expect(originalItemCount).toBeGreaterThan(0);

      let updatedLoadout;
      await act(async () => {
        updatedLoadout = await result.current.updateLoadout('loadout-001', {
          name: 'Updated With Items',
        });
      });

      // Items should be preserved from existing loadout
      expect(updatedLoadout?.items).toHaveLength(originalItemCount);
    });
  });

  // ===========================================================================
  // Weight Calculation Branch Coverage
  // ===========================================================================

  describe('calculateWeight Branch Coverage', () => {
    it('should calculate consumable weight correctly', async () => {
      // Create loadout items with consumables
      const itemsWithConsumables = [
        ...mockLoadoutItemsDbRows,
        {
          id: 'li-005',
          loadout_id: 'loadout-001',
          gear_item_id: 'gear-food',
          quantity: 2,
          is_worn: false,
          is_consumable: true,
          created_at: '2024-01-15T00:00:00Z',
        },
      ];

      let callCount = 0;
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          return resolve({ data: mockLoadoutDbRows, error: null });
        } else {
          return resolve({ data: itemsWithConsumables, error: null });
        }
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const gearItems = new Map<string, number>([
        ['gear-001', 1000],
        ['gear-002', 500],
        ['gear-003', 300],
        ['gear-food', 250],
      ]);

      const summary = result.current.calculateWeight('loadout-001', gearItems);

      // gear-003 is worn (300g), gear-food is consumable (500g = 250g * 2 quantity)
      expect(summary.consumableWeight).toBe(500);
      expect(summary.wornWeight).toBe(300);
      expect(summary.totalWeight).toBe(2300); // 1000 + 500 + 300 + 500
    });

    it('should handle multiple worn and consumable items', async () => {
      const complexItems = [
        {
          id: 'li-a',
          loadout_id: 'loadout-001',
          gear_item_id: 'gear-a',
          quantity: 1,
          is_worn: true,
          is_consumable: false,
          created_at: '2024-01-15T00:00:00Z',
        },
        {
          id: 'li-b',
          loadout_id: 'loadout-001',
          gear_item_id: 'gear-b',
          quantity: 3,
          is_worn: false,
          is_consumable: true,
          created_at: '2024-01-15T00:00:00Z',
        },
        {
          id: 'li-c',
          loadout_id: 'loadout-001',
          gear_item_id: 'gear-c',
          quantity: 2,
          is_worn: true,
          is_consumable: true, // Both worn and consumable
          created_at: '2024-01-15T00:00:00Z',
        },
      ];

      let callCount = 0;
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          return resolve({ data: mockLoadoutDbRows, error: null });
        } else {
          return resolve({ data: complexItems, error: null });
        }
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useLoadouts('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const gearItems = new Map<string, number>([
        ['gear-a', 100], // worn
        ['gear-b', 50],  // consumable
        ['gear-c', 75],  // worn + consumable
      ]);

      const summary = result.current.calculateWeight('loadout-001', gearItems);

      // Total: 100 + 150 (50*3) + 150 (75*2) = 400
      expect(summary.totalWeight).toBe(400);
      // Worn: 100 + 150 = 250
      expect(summary.wornWeight).toBe(250);
      // Consumable: 150 (gear-b) + 150 (gear-c) = 300
      expect(summary.consumableWeight).toBe(300);
    });
  });
});
