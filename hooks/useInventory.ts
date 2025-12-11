/**
 * useInventory Hook
 *
 * Feature: 002-inventory-gallery
 * Provides filtering and view state for the inventory gallery
 *
 * Updated: 005-loadout-management - Migrated to use zustand store
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { GearItem } from '@/types/gear';
import type { ViewDensity, UseInventoryReturn } from '@/types/inventory';
import { useStore, useItems } from '@/hooks/useSupabaseStore';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';

// =============================================================================
// Session Storage Key
// =============================================================================

const VIEW_DENSITY_STORAGE_KEY = 'gearshack-view-density';

// =============================================================================
// Session Storage Helpers
// =============================================================================

/**
 * Get initial view density from session storage (client-side only)
 */
function getInitialViewDensity(): ViewDensity {
  if (typeof window === 'undefined') return 'standard';
  const stored = sessionStorage.getItem(VIEW_DENSITY_STORAGE_KEY);
  if (stored && ['compact', 'standard', 'detailed'].includes(stored)) {
    return stored as ViewDensity;
  }
  return 'standard';
}

// =============================================================================
// Mock Data (10-15 items across categories)
// =============================================================================

const MOCK_GEAR_ITEMS: GearItem[] = [
  {
    id: 'gear-001',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    name: 'Hornet Elite 2P',
    brand: 'NEMO',
    description: null,
    brandUrl: 'https://www.nemoequipment.com',
    modelNumber: 'NE-HE2P',
    productUrl: null,
    categoryId: 'shelter',
    subcategoryId: 'tents',
    productTypeId: 'freestanding-tent',
    weightGrams: 1180,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 450,
    currency: 'USD',
    purchaseDate: new Date('2024-01-10'),
    retailer: 'REI',
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: 'Ultralight 2-person tent with excellent ventilation.',
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-002',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    name: 'Disco 15',
    brand: 'NEMO',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'sleep-system',
    subcategoryId: 'sleeping-bags',
    productTypeId: 'down-bag',
    weightGrams: 1130,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 380,
    currency: 'USD',
    purchaseDate: new Date('2024-02-01'),
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: 'Spoon-shaped sleeping bag, 15°F rating.',
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-003',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
    name: 'NeoAir XLite NXT',
    brand: 'Therm-a-Rest',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'sleep-system',
    subcategoryId: 'sleeping-pads',
    productTypeId: 'inflatable-pad',
    weightGrams: 340,
    weightDisplayUnit: 'g',
    lengthCm: 183,
    widthCm: 64,
    heightCm: 7,
    pricePaid: 220,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: 'R-value 4.5, ultralight inflatable pad.',
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-004',
    createdAt: new Date('2024-04-05'),
    updatedAt: new Date('2024-04-05'),
    name: 'Ohm 2.0 50L',
    brand: 'Gossamer Gear',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'packs',
    subcategoryId: 'backpacks',
    productTypeId: 'ultralight-pack',
    weightGrams: 780,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 260,
    currency: 'USD',
    purchaseDate: new Date('2024-04-01'),
    retailer: 'Gossamer Gear',
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'used',
    status: 'own',
    notes: null,
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-005',
    createdAt: new Date('2024-05-20'),
    updatedAt: new Date('2024-05-20'),
    name: 'Ghost Whisperer/2',
    brand: 'Mountain Hardwear',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'clothing',
    subcategoryId: 'insulation',
    productTypeId: 'down-jacket',
    weightGrams: 220,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 325,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: '800-fill down, incredibly packable.',
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-006',
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    name: 'Torrent Shell 3L',
    brand: 'Patagonia',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'clothing',
    subcategoryId: 'rain-gear',
    productTypeId: 'rain-jacket',
    weightGrams: 394,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 179,
    currency: 'USD',
    purchaseDate: new Date('2024-05-15'),
    retailer: 'Patagonia',
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: null,
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-007',
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-06-15'),
    name: 'PocketRocket Deluxe',
    brand: 'MSR',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'cooking',
    subcategoryId: 'stoves',
    productTypeId: 'canister-stove',
    weightGrams: 83,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 70,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: 'Pressure regulator for consistent flame.',
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-008',
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-07-01'),
    name: 'Titanium 750ml Pot',
    brand: 'TOAKS',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'cooking',
    subcategoryId: 'cookware',
    productTypeId: 'pot',
    weightGrams: 103,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 35,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'used',
    status: 'own',
    notes: null,
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-009',
    createdAt: new Date('2024-07-15'),
    updatedAt: new Date('2024-07-15'),
    name: 'BeFree 1L',
    brand: 'Katadyn',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'water',
    subcategoryId: 'water-treatment',
    productTypeId: 'water-filter',
    weightGrams: 63,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 45,
    currency: 'USD',
    purchaseDate: new Date('2024-07-10'),
    retailer: 'REI',
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: 'Fast flow rate, easy to squeeze.',
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-010',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-08-01'),
    name: 'Spot X 200',
    brand: 'Black Diamond',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'electronics',
    subcategoryId: 'lighting',
    productTypeId: 'headlamp',
    weightGrams: 86,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 50,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: '200 lumens, red light mode.',
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-011',
    createdAt: new Date('2024-08-15'),
    updatedAt: new Date('2024-08-15'),
    name: 'Distance Carbon Z',
    brand: 'Black Diamond',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'miscellaneous',
    subcategoryId: 'trekking-poles',
    productTypeId: 'carbon-poles',
    weightGrams: 310,
    weightDisplayUnit: 'g',
    lengthCm: 130,
    widthCm: null,
    heightCm: null,
    pricePaid: 180,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: 'Pair weight, foldable.',
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-012',
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date('2024-09-01'),
    name: 'Speedgoat 5',
    brand: 'HOKA',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'clothing',
    subcategoryId: 'footwear',
    productTypeId: 'trail-runners',
    weightGrams: 620,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 155,
    currency: 'USD',
    purchaseDate: new Date('2024-08-20'),
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'worn',
    status: 'own',
    notes: 'Great cushioning and grip.',
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-013',
    createdAt: new Date('2024-09-15'),
    updatedAt: new Date('2024-09-15'),
    name: 'X-Mid 2 Pro',
    brand: 'Durston Gear',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'shelter',
    subcategoryId: 'tents',
    productTypeId: 'non-freestanding-tent',
    weightGrams: 680,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 450,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'wishlist',
    notes: 'DCF version, double-wall design.',
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-014',
    createdAt: new Date('2024-10-01'),
    updatedAt: new Date('2024-10-01'),
    name: 'UL First Aid Kit',
    brand: 'Adventure Medical',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'first-aid',
    subcategoryId: 'first-aid-kits',
    productTypeId: 'personal-kit',
    weightGrams: 142,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 25,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: null,
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
  {
    id: 'gear-015',
    createdAt: new Date('2024-10-10'),
    updatedAt: new Date('2024-10-10'),
    name: 'MiniMo',
    brand: 'Jetboil',
    description: null,
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    categoryId: 'cooking',
    subcategoryId: 'stoves',
    productTypeId: 'canister-stove',
    weightGrams: 415,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    pricePaid: 145,
    currency: 'USD',
    purchaseDate: new Date('2023-06-01'),
    retailer: 'REI',
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'used',
    status: 'sold',
    notes: 'Sold to upgrade to separate stove/pot system.',
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
  },
];

// =============================================================================
// Hook Implementation
// =============================================================================

export function useInventory(): UseInventoryReturn {
  // ---------------------------------------------------------------------------
  // Store Integration
  // ---------------------------------------------------------------------------
  const items = useItems();
  const initializeWithMockData = useStore((state) => state.initializeWithMockData);
  const { user } = useAuthContext();

  // Initialize store with mock data on first load (only when not logged in)
  // When logged in, data is fetched from Supabase via SupabaseAuthProvider
  useEffect(() => {
    if (!user) {
      initializeWithMockData(MOCK_GEAR_ITEMS);
    }
  }, [initializeWithMockData, user]);

  // ---------------------------------------------------------------------------
  // State: View Density with sessionStorage persistence
  // ---------------------------------------------------------------------------
  const [viewDensity, setViewDensityState] = useState<ViewDensity>(getInitialViewDensity);

  // Note: isLoading kept for future async data fetching
  const isLoading = false;

  // Persist view density to sessionStorage
  const setViewDensity = useCallback((density: ViewDensity) => {
    setViewDensityState(density);
    sessionStorage.setItem(VIEW_DENSITY_STORAGE_KEY, density);
  }, []);

  // ---------------------------------------------------------------------------
  // State: Filters
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived: Filtered Items
  // ---------------------------------------------------------------------------
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search filter (case-insensitive, matches name or brand)
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        !categoryFilter || item.categoryId === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, categoryFilter]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------
  const hasActiveFilters = searchQuery !== '' || categoryFilter !== null;
  const itemCount = items.length;
  const filteredCount = filteredItems.length;

  return {
    // Data
    items,
    filteredItems,
    isLoading,

    // View Density
    viewDensity,
    setViewDensity,

    // Filters
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    clearFilters,

    // Derived State
    hasActiveFilters,
    itemCount,
    filteredCount,
  };
}
