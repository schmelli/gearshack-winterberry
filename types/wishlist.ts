/**
 * Wishlist Types and Interfaces
 *
 * Feature: 049-wishlist-view
 * Constitution: Types MUST be defined in @/types directory
 */

import type { GearItem } from './gear';

// =============================================================================
// Core Wishlist Types
// =============================================================================

/**
 * Wishlist item extends GearItem with wishlist-specific constraints
 * Enforces status='wishlist' at type level
 */
export type WishlistItem = GearItem & {
  status: 'wishlist'; // Narrow status type to only 'wishlist'
};

/**
 * View mode for inventory page (inventory or wishlist)
 */
export type InventoryViewMode = 'inventory' | 'wishlist';

// =============================================================================
// Community Availability Types
// =============================================================================

/**
 * Community availability match result from database query
 * Represents an inventory item from another user that matches a wishlist item
 */
export interface CommunityAvailabilityMatch {
  /** UUID of matching inventory item */
  matchedItemId: string;
  /** UUID of item owner */
  ownerId: string;
  /** Owner's display name */
  ownerDisplayName: string;
  /** Owner's avatar URL */
  ownerAvatarUrl: string | null;
  /** Name of matched item */
  itemName: string;
  /** Brand of matched item */
  itemBrand: string | null;
  /** Available for purchase */
  forSale: boolean;
  /** Available to lend */
  lendable: boolean;
  /** Available for trade */
  tradeable: boolean;
  /** Fuzzy match quality (0-1, where 1 is exact match) */
  similarityScore: number;
  /** Primary image URL of matched item */
  primaryImageUrl: string | null;
}

/**
 * Grouped availability matches for a single wishlist item
 */
export interface WishlistItemAvailability {
  /** Wishlist item UUID */
  wishlistItemId: string;
  /** Array of matching community items */
  matches: CommunityAvailabilityMatch[];
  /** Whether any matches exist */
  hasMatches: boolean;
  /** Total count of matches */
  matchCount: number;
  /** When this data was last fetched */
  lastFetchedAt: Date;
  /** True if data is older than 5 minutes */
  isStale: boolean;
}

// =============================================================================
// Sort Options
// =============================================================================

/**
 * Sort options for wishlist items
 * Reuses patterns from inventory
 */
export type WishlistSortOption =
  | 'dateAdded'      // Sort by created_at DESC (newest first)
  | 'dateAddedOldest' // Sort by created_at ASC (oldest first)
  | 'name'           // Sort by name ASC (A-Z)
  | 'nameDesc'       // Sort by name DESC (Z-A)
  | 'category'       // Sort by category label
  | 'weight';        // Sort by weight ASC (lightest first)

// =============================================================================
// Custom Hook Return Types
// =============================================================================

/**
 * Hook return type for useWishlist
 * Manages wishlist state, filtering, and CRUD operations
 */
export interface UseWishlistReturn {
  // Data
  wishlistItems: WishlistItem[];
  filteredItems: WishlistItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addToWishlist: (item: Omit<WishlistItem, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeFromWishlist: (itemId: string) => Promise<void>;
  updateWishlistItem: (itemId: string, updates: Partial<WishlistItem>) => Promise<void>;
  moveToInventory: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;

  // Filters (reuse from useInventory patterns)
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string | null;
  setCategoryFilter: (categoryId: string | null) => void;
  sortOption: WishlistSortOption;
  setSortOption: (option: WishlistSortOption) => void;
  clearFilters: () => void;

  // Derived state
  itemCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;

  // Duplicate detection
  checkDuplicate: (brand: string | null, modelNumber: string | null) => Promise<WishlistItem | null>;
}

/**
 * T077: Retry status for community availability
 */
export type CommunityAvailabilityRetryStatus = 'idle' | 'retrying' | 'failed';

/**
 * Hook return type for useCommunityAvailability
 * Manages community availability data with caching
 */
export interface UseCommunityAvailabilityReturn {
  // Data
  availability: Map<string, WishlistItemAvailability>;
  isLoading: boolean;
  error: string | null;

  // T077: Retry state
  retryStatus: CommunityAvailabilityRetryStatus;
  retryCount: number;

  // Actions
  fetchAvailability: (wishlistItemIds: string[]) => Promise<void>;
  refreshAvailability: (wishlistItemId: string) => Promise<void>;

  // T077: Manual retry action after max retries exhausted
  manualRetry: (wishlistItemIds: string[]) => Promise<void>;

  // Helpers
  getAvailability: (wishlistItemId: string) => WishlistItemAvailability | null;
  hasAvailability: (wishlistItemId: string) => boolean;
  isStale: (wishlistItemId: string) => boolean;
}

// =============================================================================
// Hook State Management
// =============================================================================

/**
 * Internal cache entry structure for useCommunityAvailability
 */
export interface AvailabilityCache {
  data: WishlistItemAvailability;
  fetchedAt: Date;
}

// =============================================================================
// Database Query Parameters
// =============================================================================

/**
 * Parameters for adding item to wishlist
 */
export type AddWishlistItemParams = Omit<
  WishlistItem,
  'id' | 'createdAt' | 'updatedAt' | 'status'
>;

/**
 * Parameters for updating wishlist item
 */
export type UpdateWishlistItemParams = Partial<
  Omit<WishlistItem, 'id' | 'createdAt' | 'updatedAt' | 'status'>
>;
