/**
 * useWishlist Hook Tests
 *
 * Tests for wishlist state management, filtering, and CRUD operations.
 * Uses realistic outdoor gear wishlist data from fixtures.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWishlist } from '@/hooks/useWishlist';
import { resetSupabaseMocks } from '../../mocks/supabase';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock wishlist queries
const mockFetchWishlistItems = vi.fn();
const mockAddWishlistItem = vi.fn();
const mockUpdateWishlistItem = vi.fn();
const mockDeleteWishlistItem = vi.fn();
const mockMoveWishlistItemToInventory = vi.fn();
const mockCheckWishlistDuplicate = vi.fn();

vi.mock('@/lib/supabase/wishlist-queries', () => ({
  fetchWishlistItems: () => mockFetchWishlistItems(),
  addWishlistItem: (item: unknown) => mockAddWishlistItem(item),
  updateWishlistItem: (id: string, updates: unknown) => mockUpdateWishlistItem(id, updates),
  deleteWishlistItem: (id: string) => mockDeleteWishlistItem(id),
  moveWishlistItemToInventory: (id: string) => mockMoveWishlistItemToInventory(id),
  checkWishlistDuplicate: (brand: string | null, model: string | null) =>
    mockCheckWishlistDuplicate(brand, model),
  DuplicateError: class DuplicateError extends Error {
    constructor(existingItem: unknown) {
      super('Duplicate item');
      this.name = 'DuplicateError';
    }
  },
}));

// Mock gearItemFromDb transformer
vi.mock('@/lib/supabase/transformers', () => ({
  gearItemFromDb: (row: unknown) => row,
}));

// Mock useCategories
vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    getLabelById: (id: string) => id || 'Unknown',
    isLoading: false,
    categories: [],
  }),
}));

// Mock useSupabaseStore
const mockSetRemoteGearItems = vi.fn();
vi.mock('@/hooks/useSupabaseStore', () => ({
  useSupabaseStore: (selector: (state: unknown) => unknown) => {
    const state = {
      items: [],
      setRemoteGearItems: mockSetRemoteGearItems,
    };
    return selector(state);
  },
}));

// Mock category helpers
vi.mock('@/lib/utils/category-helpers', () => ({
  getParentCategoryIds: (productTypeId: string | null) => ({
    categoryId: productTypeId ? productTypeId.split('-')[0] : null,
    subcategoryId: null,
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {};
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => mockSessionStorage[key] || null,
  setItem: (key: string, value: string) => { mockSessionStorage[key] = value; },
  removeItem: (key: string) => { delete mockSessionStorage[key]; },
  clear: () => { Object.keys(mockSessionStorage).forEach(k => delete mockSessionStorage[k]); },
});

// =============================================================================
// Test Data
// =============================================================================

const mockWishlistItems = [
  {
    id: 'wish-001',
    name: 'Zpacks Duplex',
    brand: 'Zpacks',
    modelNumber: 'Duplex',
    description: 'Dream ultralight tent',
    brandUrl: 'https://zpacks.com',
    productUrl: null,
    productTypeId: 'shelter-tent',
    weightGrams: 539,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    size: null,
    color: null,
    volumeLiters: null,
    materials: 'DCF',
    tentConstruction: 'trekking pole',
    pricePaid: null,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'wishlist',
    notes: 'Dream ultralight tent',
    quantity: 1,
    isFavourite: true,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
    createdAt: new Date('2024-03-01T00:00:00Z'),
    updatedAt: new Date('2024-03-01T00:00:00Z'),
  },
  {
    id: 'wish-002',
    name: 'Nemo Tensor Insulated',
    brand: 'Nemo',
    modelNumber: 'Tensor Insulated',
    description: 'Alternative pad option',
    brandUrl: null,
    productUrl: null,
    productTypeId: 'sleep-pad',
    weightGrams: 425,
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
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'wishlist',
    notes: 'Alternative pad option',
    quantity: 1,
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
    createdAt: new Date('2024-03-02T00:00:00Z'),
    updatedAt: new Date('2024-03-02T00:00:00Z'),
  },
  {
    id: 'wish-003',
    name: 'Katabatic Palisade 15',
    brand: 'Katabatic',
    modelNumber: 'Palisade 15',
    description: 'Ultralight quilt',
    brandUrl: null,
    productUrl: null,
    productTypeId: 'sleep-quilt',
    weightGrams: 680,
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
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'wishlist',
    notes: null,
    quantity: 1,
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
    createdAt: new Date('2024-02-15T00:00:00Z'),
    updatedAt: new Date('2024-02-15T00:00:00Z'),
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('useWishlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseMocks();
    Object.keys(mockSessionStorage).forEach(k => delete mockSessionStorage[k]);
    mockFetchWishlistItems.mockResolvedValue(mockWishlistItems);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should start with loading state true', async () => {
      mockFetchWishlistItems.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useWishlist());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.wishlistItems).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should fetch wishlist items on mount', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchWishlistItems).toHaveBeenCalled();
      expect(result.current.wishlistItems).toHaveLength(3);
    });

    it('should handle fetch error gracefully', async () => {
      mockFetchWishlistItems.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.wishlistItems).toEqual([]);
    });
  });

  // ===========================================================================
  // Filter and Sort Tests
  // ===========================================================================

  describe('Filtering and Sorting', () => {
    it('should filter items by search query', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery('Zpacks');
      });

      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.filteredItems[0].name).toBe('Zpacks Duplex');
    });

    it('should filter items by brand name', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery('Nemo');
      });

      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.filteredItems[0].brand).toBe('Nemo');
    });

    it('should sort items by date added (newest first) by default', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sortOption).toBe('dateAdded');
      // wish-002 is newest (March 2), then wish-001 (March 1), then wish-003 (Feb 15)
      expect(result.current.filteredItems[0].id).toBe('wish-002');
      expect(result.current.filteredItems[1].id).toBe('wish-001');
      expect(result.current.filteredItems[2].id).toBe('wish-003');
    });

    it('should sort items by name A-Z', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSortOption('name');
      });

      expect(result.current.filteredItems[0].name).toBe('Katabatic Palisade 15');
      expect(result.current.filteredItems[1].name).toBe('Nemo Tensor Insulated');
      expect(result.current.filteredItems[2].name).toBe('Zpacks Duplex');
    });

    it('should sort items by weight (lightest first)', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSortOption('weight');
      });

      expect(result.current.filteredItems[0].weightGrams).toBe(425); // Nemo
      expect(result.current.filteredItems[1].weightGrams).toBe(539); // Zpacks
      expect(result.current.filteredItems[2].weightGrams).toBe(680); // Katabatic
    });

    it('should persist sort option to sessionStorage', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSortOption('weight');
      });

      expect(mockSessionStorage['gearshack-wishlist-sort-option']).toBe('weight');
    });

    it('should clear filters correctly', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery('Zpacks');
        result.current.setCategoryFilter('shelter');
      });

      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.categoryFilter).toBeNull();
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  // ===========================================================================
  // CRUD Operation Tests
  // ===========================================================================

  describe('addToWishlist', () => {
    it('should add item to wishlist successfully', async () => {
      const newItem = {
        ...mockWishlistItems[0],
        id: 'wish-new',
        name: 'New Wishlist Item',
      };
      mockAddWishlistItem.mockResolvedValue(newItem);

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToWishlist({
          name: 'New Wishlist Item',
          brand: 'Test Brand',
          modelNumber: 'Test Model',
          description: null,
          brandUrl: null,
          productUrl: null,
          productTypeId: null,
          weightGrams: 500,
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
          notes: null,
          quantity: 1,
          isFavourite: false,
          isForSale: false,
          canBeBorrowed: false,
          canBeTraded: false,
          dependencyIds: [],
        });
      });

      expect(mockAddWishlistItem).toHaveBeenCalled();
      expect(result.current.wishlistItems).toHaveLength(4);
    });

    it('should handle duplicate error when adding item', async () => {
      const DuplicateError = class extends Error {
        constructor() {
          super('Duplicate item');
          this.name = 'DuplicateError';
        }
      };
      mockAddWishlistItem.mockRejectedValue(new DuplicateError());

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.addToWishlist({
            name: 'Duplicate Item',
            brand: 'Zpacks',
            modelNumber: 'Duplex',
            description: null,
            brandUrl: null,
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
            notes: null,
            quantity: 1,
            isFavourite: false,
            isForSale: false,
            canBeBorrowed: false,
            canBeTraded: false,
            dependencyIds: [],
          });
        })
      ).rejects.toThrow();
    });
  });

  describe('removeFromWishlist', () => {
    it('should remove item from wishlist successfully', async () => {
      mockDeleteWishlistItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeFromWishlist('wish-001');
      });

      expect(mockDeleteWishlistItem).toHaveBeenCalledWith('wish-001');
      expect(result.current.wishlistItems).toHaveLength(2);
      expect(result.current.wishlistItems.find(i => i.id === 'wish-001')).toBeUndefined();
    });
  });

  describe('updateWishlistItem', () => {
    it('should update wishlist item successfully', async () => {
      const updatedItem = {
        ...mockWishlistItems[0],
        name: 'Zpacks Duplex Updated',
      };
      mockUpdateWishlistItem.mockResolvedValue(updatedItem);

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateWishlistItem('wish-001', {
          name: 'Zpacks Duplex Updated',
        });
      });

      expect(mockUpdateWishlistItem).toHaveBeenCalledWith('wish-001', {
        name: 'Zpacks Duplex Updated',
      });
    });
  });

  describe('moveToInventory', () => {
    it('should move item from wishlist to inventory', async () => {
      const movedItem = {
        ...mockWishlistItems[0],
        status: 'own',
      };
      mockMoveWishlistItemToInventory.mockResolvedValue(movedItem);

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.moveToInventory('wish-001');
      });

      expect(mockMoveWishlistItemToInventory).toHaveBeenCalledWith('wish-001');
      expect(result.current.wishlistItems).toHaveLength(2);
      expect(mockSetRemoteGearItems).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Derived State Tests
  // ===========================================================================

  describe('Derived State', () => {
    it('should calculate itemCount correctly', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.itemCount).toBe(3);
    });

    it('should calculate filteredCount correctly', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery('Zpacks');
      });

      expect(result.current.filteredCount).toBe(1);
    });

    it('should track hasActiveFilters correctly', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasActiveFilters).toBe(false);

      act(() => {
        result.current.setSearchQuery('test');
      });

      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.setSearchQuery('');
        result.current.setCategoryFilter('shelter');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  // ===========================================================================
  // Duplicate Detection Tests
  // ===========================================================================

  describe('checkDuplicate', () => {
    it('should check for duplicates by brand and model', async () => {
      mockCheckWishlistDuplicate.mockResolvedValue(mockWishlistItems[0]);

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let duplicate;
      await act(async () => {
        duplicate = await result.current.checkDuplicate('Zpacks', 'Duplex');
      });

      expect(mockCheckWishlistDuplicate).toHaveBeenCalledWith('Zpacks', 'Duplex');
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe('wish-001');
    });

    it('should return null when no duplicate found', async () => {
      mockCheckWishlistDuplicate.mockResolvedValue(null);

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let duplicate;
      await act(async () => {
        duplicate = await result.current.checkDuplicate('NewBrand', 'NewModel');
      });

      expect(duplicate).toBeNull();
    });

    it('should handle duplicate check errors gracefully', async () => {
      mockCheckWishlistDuplicate.mockRejectedValue(new Error('Check failed'));

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let duplicate;
      await act(async () => {
        duplicate = await result.current.checkDuplicate('Test', 'Test');
      });

      // Should return null on error, not throw
      expect(duplicate).toBeNull();
    });
  });

  // ===========================================================================
  // Refresh Tests
  // ===========================================================================

  describe('refresh', () => {
    it('should refetch wishlist items', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchWishlistItems).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFetchWishlistItems).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // Additional Sort Option Tests
  // ===========================================================================

  describe('Additional Sort Options', () => {
    it('should sort items by name Z-A (nameDesc)', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSortOption('nameDesc');
      });

      // Should be sorted Z-A
      expect(result.current.filteredItems[0].name).toBe('Zpacks Duplex');
      expect(result.current.filteredItems[1].name).toBe('Nemo Tensor Insulated');
      expect(result.current.filteredItems[2].name).toBe('Katabatic Palisade 15');
    });

    it('should sort items by category', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSortOption('category');
      });

      // Items should be sorted by category label
      // This will use the mock getParentCategoryIds which returns the first part before '-'
      expect(result.current.filteredItems.length).toBe(3);
      // Categories are: shelter, sleep, sleep - should be sorted alphabetically
      expect(result.current.filteredItems[0].productTypeId?.startsWith('shelter')).toBe(true);
    });

    it('should sort items by dateAddedOldest', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSortOption('dateAddedOldest');
      });

      // Should be sorted oldest first
      expect(result.current.filteredItems[0].id).toBe('wish-003'); // Feb 15
      expect(result.current.filteredItems[1].id).toBe('wish-001'); // Mar 1
      expect(result.current.filteredItems[2].id).toBe('wish-002'); // Mar 2
    });

    it('should load sort option from sessionStorage', async () => {
      mockSessionStorage['gearshack-wishlist-sort-option'] = 'weight';

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sortOption).toBe('weight');
    });

    it('should handle weight sort with null values', async () => {
      // Add an item with null weight
      const itemsWithNullWeight = [
        ...mockWishlistItems,
        {
          ...mockWishlistItems[0],
          id: 'wish-004',
          name: 'Unknown Weight Item',
          weightGrams: null,
          createdAt: new Date('2024-03-03T00:00:00Z'),
          updatedAt: new Date('2024-03-03T00:00:00Z'),
        },
      ];
      mockFetchWishlistItems.mockResolvedValue(itemsWithNullWeight);

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSortOption('weight');
      });

      // Null weight items should be sorted last
      expect(result.current.filteredItems[result.current.filteredItems.length - 1].weightGrams).toBeNull();
    });

    it('should handle weight sort with both items having null weight', async () => {
      const itemsWithNullWeights = [
        {
          ...mockWishlistItems[0],
          id: 'wish-a',
          name: 'Item A',
          weightGrams: null,
        },
        {
          ...mockWishlistItems[0],
          id: 'wish-b',
          name: 'Item B',
          weightGrams: null,
        },
      ];
      mockFetchWishlistItems.mockResolvedValue(itemsWithNullWeights);

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSortOption('weight');
      });

      // Both null - should maintain relative order
      expect(result.current.filteredItems).toHaveLength(2);
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle removeFromWishlist error', async () => {
      mockDeleteWishlistItem.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.removeFromWishlist('wish-001');
        })
      ).rejects.toThrow('Delete failed');
    });

    it('should handle updateWishlistItem error', async () => {
      mockUpdateWishlistItem.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateWishlistItem('wish-001', { name: 'Updated' });
        })
      ).rejects.toThrow('Update failed');
    });

    it('should handle moveToInventory error', async () => {
      mockMoveWishlistItemToInventory.mockRejectedValue(new Error('Move failed'));

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.moveToInventory('wish-001');
        })
      ).rejects.toThrow('Move failed');
    });

    it('should handle non-Error thrown during fetch', async () => {
      mockFetchWishlistItems.mockRejectedValue('String error');

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load wishlist');
    });

    it('should handle non-Error thrown during add', async () => {
      mockAddWishlistItem.mockRejectedValue('String error');

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.addToWishlist({
            name: 'Test',
            brand: null,
            modelNumber: null,
            description: null,
            brandUrl: null,
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
            notes: null,
            quantity: 1,
            isFavourite: false,
            isForSale: false,
            canBeBorrowed: false,
            canBeTraded: false,
            dependencyIds: [],
          });
        })
      ).rejects.toBe('String error');
    });

    it('should handle non-Error thrown during remove', async () => {
      mockDeleteWishlistItem.mockRejectedValue('String error');

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.removeFromWishlist('wish-001');
        })
      ).rejects.toBe('String error');
    });

    it('should handle non-Error thrown during update', async () => {
      mockUpdateWishlistItem.mockRejectedValue('String error');

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateWishlistItem('wish-001', { name: 'Updated' });
        })
      ).rejects.toBe('String error');
    });

    it('should handle non-Error thrown during move', async () => {
      mockMoveWishlistItemToInventory.mockRejectedValue('String error');

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.moveToInventory('wish-001');
        })
      ).rejects.toBe('String error');
    });

    it('should handle moveToInventory when item not found in local state', async () => {
      mockMoveWishlistItemToInventory.mockResolvedValue({
        ...mockWishlistItems[0],
        status: 'own',
      });

      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try to move an item that doesn't exist
      await act(async () => {
        await result.current.moveToInventory('non-existent-id');
      });

      // Should still complete without error, using 'Item' as default name
      expect(mockMoveWishlistItemToInventory).toHaveBeenCalledWith('non-existent-id');
    });
  });

  // ===========================================================================
  // Category Filter Tests
  // ===========================================================================

  describe('Category Filtering', () => {
    it('should filter items by category', async () => {
      const { result } = renderHook(() => useWishlist());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setCategoryFilter('shelter');
      });

      // Should only show shelter items (our mock derives category from productTypeId)
      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.filteredItems[0].productTypeId).toBe('shelter-tent');
    });
  });
});
