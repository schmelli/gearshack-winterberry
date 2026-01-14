/**
 * useGearItems Hook Tests
 *
 * Tests for gear inventory CRUD operations using Supabase.
 * Uses realistic outdoor gear data from fixtures.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGearItems } from '@/hooks/useGearItems';
import { createQueryBuilderMock as _createQueryBuilderMock, resetSupabaseMocks } from '../../mocks/supabase';
import { mockGearItems as _mockGearItems } from '../../fixtures/gear';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  })),
  removeChannel: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// =============================================================================
// Test Database Rows (snake_case format)
// =============================================================================

const mockDbRows = [
  {
    id: 'gear-001',
    user_id: 'user-123-uuid',
    name: 'Big Agnes Copper Spur HV UL2',
    brand: 'Big Agnes',
    model_number: 'Copper Spur HV UL2',
    description: 'Great 2-person ultralight tent for 3-season use',
    brand_url: null,
    product_url: null,
    weight_grams: 1020,
    weight_display_unit: 'g',
    length_cm: null,
    width_cm: null,
    height_cm: null,
    size: null,
    color: null,
    volume_liters: null,
    materials: null,
    tent_construction: null,
    price_paid: 449.95,
    currency: 'USD',
    purchase_date: '2023-06-15',
    retailer: null,
    retailer_url: null,
    primary_image_url: null,
    gallery_image_urls: [],
    nobg_images: {},
    condition: 'new',
    status: 'own',
    notes: 'Great 2-person ultralight tent',
    is_favourite: false,
    is_for_sale: false,
    can_be_borrowed: false,
    can_be_traded: false,
    dependency_ids: [],
    product_type_id: 'shelter-tent',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'gear-002',
    user_id: 'user-123-uuid',
    name: 'Enlightened Equipment Enigma 20F',
    brand: 'Enlightened Equipment',
    model_number: 'Enigma 20',
    description: '850 fill power down quilt, reg/wide',
    brand_url: null,
    product_url: null,
    weight_grams: 567,
    weight_display_unit: 'g',
    length_cm: null,
    width_cm: null,
    height_cm: null,
    size: null,
    color: null,
    volume_liters: null,
    materials: null,
    tent_construction: null,
    price_paid: 320.00,
    currency: 'USD',
    purchase_date: '2023-03-20',
    retailer: null,
    retailer_url: null,
    primary_image_url: null,
    gallery_image_urls: [],
    nobg_images: {},
    condition: 'new',
    status: 'own',
    notes: '850 fill power down quilt',
    is_favourite: true,
    is_for_sale: false,
    can_be_borrowed: false,
    can_be_traded: false,
    dependency_ids: [],
    product_type_id: 'sleep-quilt',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
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
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn(),
    ...overrides,
  };
  return mock;
}

// =============================================================================
// Tests
// =============================================================================

describe('useGearItems', () => {
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
      queryBuilder.then = vi.fn((_resolve) => {
        // Don't resolve immediately to test loading state
        return new Promise(() => {});
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should set items to empty array and isLoading to false when userId is null', async () => {
      const { result } = renderHook(() => useGearItems(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Fetch Tests
  // ===========================================================================

  describe('fetchItems', () => {
    it('should fetch gear items successfully', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].name).toBe('Big Agnes Copper Spur HV UL2');
      expect(result.current.items[1].name).toBe('Enlightened Equipment Enigma 20F');
      expect(result.current.error).toBeNull();
    });

    it('should transform database rows to GearItem format (snake_case to camelCase)', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: [mockDbRows[0]], error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = result.current.items[0];
      expect(item.weightGrams).toBe(1020);
      expect(item.weightDisplayUnit).toBe('g');
      expect(item.pricePaid).toBe(449.95);
      expect(item.productTypeId).toBe('shelter-tent');
      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle fetch error gracefully', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: null, error: { message: 'Network error' } })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.items).toEqual([]);
    });

    it('should filter by categoryId when provided', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: [mockDbRows[0]], error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() =>
        useGearItems('user-123-uuid', { categoryId: 'shelter-tent' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify eq was called with category filter
      expect(queryBuilder.eq).toHaveBeenCalledWith('category_id', 'shelter-tent');
    });
  });

  // ===========================================================================
  // Create Item Tests
  // ===========================================================================

  describe('createItem', () => {
    it('should create a new gear item successfully', async () => {
      const newItemDb = {
        ...mockDbRows[0],
        id: 'gear-new',
        name: 'MSR PocketRocket Deluxe',
        brand: 'MSR',
        weight_grams: 83,
        created_at: '2024-03-01T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
      };

      const queryBuilder = createMockQueryBuilder();
      // Initial fetch
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      // Insert operation
      queryBuilder.single = vi.fn().mockResolvedValue({ data: newItemDb, error: null });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newItemData = {
        name: 'MSR PocketRocket Deluxe',
        brand: 'MSR',
        description: 'Reliable canister stove',
        brandUrl: null,
        modelNumber: 'PocketRocket Deluxe',
        productUrl: null,
        productTypeId: 'cook-stove',
        weightGrams: 83,
        weightDisplayUnit: 'g' as const,
        lengthCm: null,
        widthCm: null,
        heightCm: null,
        size: null,
        color: null,
        volumeLiters: null,
        materials: null,
        tentConstruction: null,
        pricePaid: 69.95,
        currency: 'USD',
        purchaseDate: null,
        retailer: null,
        retailerUrl: null,
        primaryImageUrl: null,
        galleryImageUrls: [],
        condition: 'new' as const,
        status: 'own' as const,
        notes: 'With piezo igniter',
        quantity: 1,
        isFavourite: false,
        isForSale: false,
        canBeBorrowed: false,
        canBeTraded: false,
        dependencyIds: [],
      };

      let createdItem;
      await act(async () => {
        createdItem = await result.current.createItem(newItemData);
      });

      expect(createdItem).not.toBeNull();
      expect(createdItem?.name).toBe('MSR PocketRocket Deluxe');
      expect(queryBuilder.insert).toHaveBeenCalled();
    });

    it('should return null and set error when user is not authenticated', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: [], error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdItem;
      await act(async () => {
        createdItem = await result.current.createItem({
          name: 'Test Item',
          brand: null,
          description: null,
          brandUrl: null,
          modelNumber: null,
          productUrl: null,
          productTypeId: null,
          weightGrams: null,
          weightDisplayUnit: 'g',
          lengthCm: null,
          widthCm: null,
          heightCm: null,
          size: null,
          color: null,
          volumeLiters: null,
          materials: null,
          tentConstruction: null,
          pricePaid: null,
          currency: null,
          purchaseDate: null,
          retailer: null,
          retailerUrl: null,
          primaryImageUrl: null,
          galleryImageUrls: [],
          condition: 'new',
          status: 'own',
          notes: null,
          quantity: 1,
          isFavourite: false,
          isForSale: false,
          canBeBorrowed: false,
          canBeTraded: false,
          dependencyIds: [],
        });
      });

      expect(createdItem).toBeNull();
      expect(result.current.error).toBe('User not authenticated');
    });

    it('should handle insert error gracefully', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: [], error: null })
      );
      queryBuilder.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' }
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdItem;
      await act(async () => {
        createdItem = await result.current.createItem({
          name: 'Test',
          brand: null,
          description: null,
          brandUrl: null,
          modelNumber: null,
          productUrl: null,
          productTypeId: null,
          weightGrams: null,
          weightDisplayUnit: 'g',
          lengthCm: null,
          widthCm: null,
          heightCm: null,
          size: null,
          color: null,
          volumeLiters: null,
          materials: null,
          tentConstruction: null,
          pricePaid: null,
          currency: null,
          purchaseDate: null,
          retailer: null,
          retailerUrl: null,
          primaryImageUrl: null,
          galleryImageUrls: [],
          condition: 'new',
          status: 'own',
          notes: null,
          quantity: 1,
          isFavourite: false,
          isForSale: false,
          canBeBorrowed: false,
          canBeTraded: false,
          dependencyIds: [],
        });
      });

      expect(createdItem).toBeNull();
      expect(result.current.error).toBe('Database constraint violation');
    });
  });

  // ===========================================================================
  // Update Item Tests
  // ===========================================================================

  describe('updateItem', () => {
    it('should update an existing gear item successfully', async () => {
      const updatedItemDb = {
        ...mockDbRows[0],
        name: 'Big Agnes Copper Spur HV UL2 Updated',
        weight_grams: 1050,
        updated_at: '2024-03-01T00:00:00Z',
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      queryBuilder.single = vi.fn().mockResolvedValue({ data: updatedItemDb, error: null });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedItem;
      await act(async () => {
        updatedItem = await result.current.updateItem('gear-001', {
          name: 'Big Agnes Copper Spur HV UL2 Updated',
          weightGrams: 1050,
        });
      });

      expect(updatedItem).not.toBeNull();
      expect(updatedItem?.name).toBe('Big Agnes Copper Spur HV UL2 Updated');
      expect(updatedItem?.weightGrams).toBe(1050);
    });

    it('should return null when user is not authenticated', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: [], error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedItem;
      await act(async () => {
        updatedItem = await result.current.updateItem('gear-001', { name: 'Test' });
      });

      expect(updatedItem).toBeNull();
      expect(result.current.error).toBe('User not authenticated');
    });

    it('should handle update error gracefully', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      queryBuilder.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Item not found' }
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedItem;
      await act(async () => {
        updatedItem = await result.current.updateItem('non-existent-id', { name: 'Test' });
      });

      expect(updatedItem).toBeNull();
      expect(result.current.error).toBe('Item not found');
    });
  });

  // ===========================================================================
  // Delete Item Tests
  // ===========================================================================

  describe('deleteItem', () => {
    it('should delete a gear item successfully', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn()
        .mockImplementationOnce((resolve) => resolve({ data: mockDbRows, error: null }))
        .mockImplementationOnce((resolve) => resolve({ data: null, error: null }));
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteSuccess;
      await act(async () => {
        deleteSuccess = await result.current.deleteItem('gear-001');
      });

      expect(deleteSuccess).toBe(true);
      expect(queryBuilder.delete).toHaveBeenCalled();
    });

    it('should return false when user is not authenticated', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: [], error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteSuccess;
      await act(async () => {
        deleteSuccess = await result.current.deleteItem('gear-001');
      });

      expect(deleteSuccess).toBe(false);
      expect(result.current.error).toBe('User not authenticated');
    });

    it('should handle delete error gracefully', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn()
        .mockImplementationOnce((resolve) => resolve({ data: mockDbRows, error: null }))
        .mockImplementationOnce((resolve) => resolve({
          data: null,
          error: { message: 'Cannot delete item with references' }
        }));
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteSuccess;
      await act(async () => {
        deleteSuccess = await result.current.deleteItem('gear-001');
      });

      expect(deleteSuccess).toBe(false);
      expect(result.current.error).toBe('Cannot delete item with references');
    });
  });

  // ===========================================================================
  // Get Item Tests
  // ===========================================================================

  describe('getItem', () => {
    it('should return item by ID from local state', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = result.current.getItem('gear-001');
      expect(item).toBeDefined();
      expect(item?.name).toBe('Big Agnes Copper Spur HV UL2');
    });

    it('should return undefined for non-existent item ID', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = result.current.getItem('non-existent-id');
      expect(item).toBeUndefined();
    });
  });

  // ===========================================================================
  // Real-time Subscription Tests
  // ===========================================================================

  describe('Real-time Subscription', () => {
    it('should set up real-time subscription when realtime option is true', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result, unmount } = renderHook(() =>
        useGearItems('user-123-uuid', { realtime: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('gear_items:user-123-uuid');

      unmount();
      expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
    });

    it('should not set up subscription when realtime is false', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() =>
        useGearItems('user-123-uuid', { realtime: false })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabaseClient.channel).not.toHaveBeenCalled();
    });

    // Skipped: Complex async test with realtime event simulation
    it('should handle realtime INSERT event', async () => {
      let realtimeCallback: (payload: unknown) => void;

      const mockChannel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
        on: vi.fn(),
        subscribe: vi.fn(),
      };
      mockChannel.on.mockImplementation((_, __, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      });
      mockChannel.subscribe.mockReturnValue(mockChannel);
      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() =>
        useGearItems('user-123-uuid', { realtime: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);

      // Simulate INSERT event
      const newRow = {
        ...mockDbRows[0],
        id: 'gear-new',
        name: 'New Item Via Realtime',
      };

      act(() => {
        realtimeCallback!({
          eventType: 'INSERT',
          new: newRow,
          old: null,
        });
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[0].name).toBe('New Item Via Realtime');
    });

    // Skipped: Complex async test with realtime event simulation
    it('should handle realtime UPDATE event', async () => {
      let realtimeCallback: (payload: unknown) => void;

      const mockChannel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
        on: vi.fn(),
        subscribe: vi.fn(),
      };
      mockChannel.on.mockImplementation((_, __, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      });
      mockChannel.subscribe.mockReturnValue(mockChannel);
      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() =>
        useGearItems('user-123-uuid', { realtime: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items[0].name).toBe('Big Agnes Copper Spur HV UL2');

      // Simulate UPDATE event
      const updatedRow = {
        ...mockDbRows[0],
        name: 'Updated Via Realtime',
      };

      act(() => {
        realtimeCallback!({
          eventType: 'UPDATE',
          new: updatedRow,
          old: mockDbRows[0],
        });
      });

      expect(result.current.items[0].name).toBe('Updated Via Realtime');
    });

    // Skipped: Complex async test with realtime event simulation
    it('should handle realtime DELETE event', async () => {
      let realtimeCallback: (payload: unknown) => void;

      const mockChannel: {
        on: ReturnType<typeof vi.fn>;
        subscribe: ReturnType<typeof vi.fn>;
      } = {
        on: vi.fn(),
        subscribe: vi.fn(),
      };
      mockChannel.on = vi.fn().mockImplementation((_, __, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      });
      mockChannel.subscribe = vi.fn().mockReturnValue(mockChannel);
      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() =>
        useGearItems('user-123-uuid', { realtime: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);

      // Simulate DELETE event
      act(() => {
        realtimeCallback!({
          eventType: 'DELETE',
          new: null,
          old: { id: 'gear-001' },
        });
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe('gear-002');
    });

    it('should not set up subscription when userId is null', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: [], error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() =>
        useGearItems(null, { realtime: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Even with realtime: true, should not subscribe when userId is null
      expect(mockSupabaseClient.channel).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Exception Handling Tests
  // ===========================================================================

  describe('Exception Handling', () => {
    it('should handle unexpected error during fetch', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn(() => {
        throw new Error('Unexpected fetch error');
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Unexpected fetch error');
    });

    it('should handle unexpected error during create', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: [], error: null })
      );
      queryBuilder.single = vi.fn(() => {
        throw new Error('Unexpected create error');
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdItem;
      await act(async () => {
        createdItem = await result.current.createItem({
          name: 'Test',
          brand: null,
          description: null,
          brandUrl: null,
          modelNumber: null,
          productUrl: null,
          productTypeId: null,
          weightGrams: null,
          weightDisplayUnit: 'g',
          lengthCm: null,
          widthCm: null,
          heightCm: null,
          size: null,
          color: null,
          volumeLiters: null,
          materials: null,
          tentConstruction: null,
          pricePaid: null,
          currency: null,
          purchaseDate: null,
          retailer: null,
          retailerUrl: null,
          primaryImageUrl: null,
          galleryImageUrls: [],
          condition: 'new',
          status: 'own',
          notes: null,
          quantity: 1,
          isFavourite: false,
          isForSale: false,
          canBeBorrowed: false,
          canBeTraded: false,
          dependencyIds: [],
        });
      });

      expect(createdItem).toBeNull();
      expect(result.current.error).toBe('Unexpected create error');
    });

    it('should handle unexpected error during update', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      queryBuilder.single = vi.fn(() => {
        throw new Error('Unexpected update error');
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatedItem;
      await act(async () => {
        updatedItem = await result.current.updateItem('gear-001', { name: 'Test' });
      });

      expect(updatedItem).toBeNull();
      expect(result.current.error).toBe('Unexpected update error');
    });

    it('should handle unexpected error during delete', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn()
        .mockImplementationOnce((resolve) => resolve({ data: mockDbRows, error: null }))
        .mockImplementationOnce(() => {
          throw new Error('Unexpected delete error');
        });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteSuccess;
      await act(async () => {
        deleteSuccess = await result.current.deleteItem('gear-001');
      });

      expect(deleteSuccess).toBe(false);
      expect(result.current.error).toBe('Unexpected delete error');
    });

    it('should handle non-Error thrown during operations', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn(() => {
        // Throw a non-Error object
        throw 'String error';
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() => useGearItems('user-123-uuid'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should fallback to generic error message
      expect(result.current.error).toBe('Failed to fetch gear items');
    });
  });

  // ===========================================================================
  // Realtime State Management Tests
  // ===========================================================================

  describe('Realtime State Management', () => {
    it('should not update local state when realtime is enabled (INSERT)', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );

      const newItemDb = {
        ...mockDbRows[0],
        id: 'gear-new',
        name: 'New Item',
      };
      queryBuilder.single = vi.fn().mockResolvedValue({ data: newItemDb, error: null });

      mockSupabaseClient.from.mockReturnValue(queryBuilder);
      mockSupabaseClient.channel.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      });

      const { result } = renderHook(() =>
        useGearItems('user-123-uuid', { realtime: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialItemCount = result.current.items.length;

      await act(async () => {
        await result.current.createItem({
          name: 'New Item',
          brand: null,
          description: null,
          brandUrl: null,
          modelNumber: null,
          productUrl: null,
          productTypeId: null,
          weightGrams: null,
          weightDisplayUnit: 'g',
          lengthCm: null,
          widthCm: null,
          heightCm: null,
          size: null,
          color: null,
          volumeLiters: null,
          materials: null,
          tentConstruction: null,
          pricePaid: null,
          currency: null,
          purchaseDate: null,
          retailer: null,
          retailerUrl: null,
          primaryImageUrl: null,
          galleryImageUrls: [],
          condition: 'new',
          status: 'own',
          notes: null,
          quantity: 1,
          isFavourite: false,
          isForSale: false,
          canBeBorrowed: false,
          canBeTraded: false,
          dependencyIds: [],
        });
      });

      // When realtime is enabled, local state should NOT be updated by createItem
      // (realtime subscription handles the update)
      expect(result.current.items.length).toBe(initialItemCount);
    });
  });

  // ===========================================================================
  // Realtime Channel Cleanup Tests
  // ===========================================================================

  describe('Realtime Channel Cleanup', () => {
    it('should clean up existing channel when creating new subscription', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };
      mockSupabaseClient.channel.mockReturnValue(mockChannel);
      mockSupabaseClient.removeChannel = vi.fn();

      const { rerender } = renderHook(
        ({ userId, options }) => useGearItems(userId, options),
        {
          initialProps: {
            userId: 'user-123-uuid' as string | null,
            options: { realtime: true },
          },
        }
      );

      // Wait for initial channel subscription to be complete
      await waitFor(() => {
        expect(mockSupabaseClient.channel).toHaveBeenCalledTimes(1);
        expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
      });

      // Reset mock to track new calls
      mockSupabaseClient.removeChannel.mockClear();
      mockSupabaseClient.channel.mockClear();
      mockChannel.subscribe.mockClear();

      // Rerender with different userId to trigger cleanup of existing channel and new subscription
      rerender({
        userId: 'user-456-uuid',
        options: { realtime: true },
      });

      // Wait for new channel subscription
      await waitFor(() => {
        // Should have created a new channel
        expect(mockSupabaseClient.channel).toHaveBeenCalledWith('gear_items:user-456-uuid');
      });

      // Should have called removeChannel to clean up the old channel
      expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
    });

    it('should clean up channel on unmount', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };
      mockSupabaseClient.channel.mockReturnValue(mockChannel);
      mockSupabaseClient.removeChannel = vi.fn();

      const { unmount } = renderHook(() =>
        useGearItems('user-123-uuid', { realtime: true })
      );

      await waitFor(() => {
        expect(mockSupabaseClient.channel).toHaveBeenCalled();
      });

      // Unmount should trigger cleanup
      unmount();

      expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Realtime Event Edge Cases Tests
  // ===========================================================================

  describe('Realtime Event Edge Cases', () => {
    it('should ignore INSERT event with null newRow', async () => {
      let realtimeCallback: (payload: unknown) => void;

      const mockChannel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
        on: vi.fn(),
        subscribe: vi.fn(),
      };
      mockChannel.on.mockImplementation((_, __, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      });
      mockChannel.subscribe.mockReturnValue(mockChannel);
      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() =>
        useGearItems('user-123-uuid', { realtime: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialLength = result.current.items.length;

      // Simulate INSERT event with null newRow
      act(() => {
        realtimeCallback!({
          eventType: 'INSERT',
          new: null,
          old: null,
        });
      });

      // Items should remain unchanged
      expect(result.current.items).toHaveLength(initialLength);
    });

    it('should ignore UPDATE event with null newRow', async () => {
      let realtimeCallback: (payload: unknown) => void;

      const mockChannel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
        on: vi.fn(),
        subscribe: vi.fn(),
      };
      mockChannel.on.mockImplementation((_, __, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      });
      mockChannel.subscribe.mockReturnValue(mockChannel);
      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() =>
        useGearItems('user-123-uuid', { realtime: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalName = result.current.items[0].name;

      // Simulate UPDATE event with null newRow
      act(() => {
        realtimeCallback!({
          eventType: 'UPDATE',
          new: null,
          old: mockDbRows[0],
        });
      });

      // Items should remain unchanged
      expect(result.current.items[0].name).toBe(originalName);
    });

    it('should ignore DELETE event with null oldRow', async () => {
      let realtimeCallback: (payload: unknown) => void;

      const mockChannel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
        on: vi.fn(),
        subscribe: vi.fn(),
      };
      mockChannel.on.mockImplementation((_, __, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      });
      mockChannel.subscribe.mockReturnValue(mockChannel);
      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() =>
        useGearItems('user-123-uuid', { realtime: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialLength = result.current.items.length;

      // Simulate DELETE event with null oldRow
      act(() => {
        realtimeCallback!({
          eventType: 'DELETE',
          new: null,
          old: null,
        });
      });

      // Items should remain unchanged
      expect(result.current.items).toHaveLength(initialLength);
    });

    it('should handle unknown event type gracefully', async () => {
      let realtimeCallback: (payload: unknown) => void;

      const mockChannel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
        on: vi.fn(),
        subscribe: vi.fn(),
      };
      mockChannel.on.mockImplementation((_, __, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      });
      mockChannel.subscribe.mockReturnValue(mockChannel);
      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then = vi.fn((resolve) =>
        resolve({ data: mockDbRows, error: null })
      );
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const { result } = renderHook(() =>
        useGearItems('user-123-uuid', { realtime: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialItems = [...result.current.items];

      // Simulate unknown event type
      act(() => {
        realtimeCallback!({
          eventType: 'UNKNOWN_EVENT',
          new: { id: 'new-item' },
          old: null,
        });
      });

      // Items should remain unchanged
      expect(result.current.items).toEqual(initialItems);
    });
  });
});
