/**
 * Gear Item Test Fixtures
 *
 * Realistic outdoor gear data for testing inventory,
 * loadout, and gear management features.
 */

import type { GearItem } from '@/types/gear';

// Categories
export const mockCategories = [
  { id: 'shelter-tent', label: 'Tent', parent_id: 'shelter', icon: 'tent' },
  { id: 'shelter-tarp', label: 'Tarp', parent_id: 'shelter', icon: 'tarp' },
  { id: 'sleep-bag', label: 'Sleeping Bag', parent_id: 'sleep', icon: 'sleeping-bag' },
  { id: 'sleep-quilt', label: 'Quilt', parent_id: 'sleep', icon: 'quilt' },
  { id: 'sleep-pad', label: 'Sleeping Pad', parent_id: 'sleep', icon: 'pad' },
  { id: 'pack-backpack', label: 'Backpack', parent_id: 'pack', icon: 'backpack' },
  { id: 'cook-stove', label: 'Stove', parent_id: 'cook', icon: 'stove' },
  { id: 'cook-pot', label: 'Pot', parent_id: 'cook', icon: 'pot' },
  { id: 'wear-jacket', label: 'Jacket', parent_id: 'wear', icon: 'jacket' },
  { id: 'wear-pants', label: 'Pants', parent_id: 'wear', icon: 'pants' },
];

// Sample gear items with realistic outdoor equipment
export const mockGearItems: Partial<GearItem>[] = [
  {
    id: 'gear-001',
    user_id: 'user-123-uuid',
    name: 'Big Agnes Copper Spur HV UL2',
    brand: 'Big Agnes',
    model: 'Copper Spur HV UL2',
    weight_grams: 1020,
    price_paid: 449.95,
    status: 'own',
    category_id: 'shelter-tent',
    product_type_id: 'shelter-tent',
    notes: 'Great 2-person ultralight tent for 3-season use',
    purchase_date: '2023-06-15',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'gear-002',
    user_id: 'user-123-uuid',
    name: 'Enlightened Equipment Enigma 20°F',
    brand: 'Enlightened Equipment',
    model: 'Enigma 20',
    weight_grams: 567,
    price_paid: 320.00,
    status: 'own',
    category_id: 'sleep-quilt',
    product_type_id: 'sleep-quilt',
    notes: '850 fill power down quilt, reg/wide',
    purchase_date: '2023-03-20',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'gear-003',
    user_id: 'user-123-uuid',
    name: 'Thermarest NeoAir XLite NXT',
    brand: 'Thermarest',
    model: 'NeoAir XLite NXT',
    weight_grams: 354,
    price_paid: 219.95,
    status: 'own',
    category_id: 'sleep-pad',
    product_type_id: 'sleep-pad',
    notes: 'R-value 4.5, great for 3-season',
    purchase_date: '2024-02-01',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'gear-004',
    user_id: 'user-123-uuid',
    name: 'Gossamer Gear Mariposa 60',
    brand: 'Gossamer Gear',
    model: 'Mariposa 60',
    weight_grams: 737,
    price_paid: 275.00,
    status: 'own',
    category_id: 'pack-backpack',
    product_type_id: 'pack-backpack',
    notes: 'Lightweight frameless pack, great for UL trips',
    purchase_date: '2023-01-10',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  {
    id: 'gear-005',
    user_id: 'user-123-uuid',
    name: 'MSR PocketRocket Deluxe',
    brand: 'MSR',
    model: 'PocketRocket Deluxe',
    weight_grams: 83,
    price_paid: 69.95,
    status: 'own',
    category_id: 'cook-stove',
    product_type_id: 'cook-stove',
    notes: 'Reliable canister stove with piezo igniter',
    purchase_date: '2022-05-20',
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
];

// Wishlist items
export const mockWishlistItems: Partial<GearItem>[] = [
  {
    id: 'wish-001',
    user_id: 'user-123-uuid',
    name: 'Zpacks Duplex',
    brand: 'Zpacks',
    model: 'Duplex',
    weight_grams: 539,
    price_paid: null,
    status: 'wishlist',
    category_id: 'shelter-tent',
    product_type_id: 'shelter-tent',
    notes: 'Dream ultralight tent',
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'wish-002',
    user_id: 'user-123-uuid',
    name: 'Nemo Tensor Insulated',
    brand: 'Nemo',
    model: 'Tensor Insulated',
    weight_grams: 425,
    price_paid: null,
    status: 'wishlist',
    category_id: 'sleep-pad',
    product_type_id: 'sleep-pad',
    notes: 'Alternative pad option',
    created_at: '2024-03-02T00:00:00Z',
    updated_at: '2024-03-02T00:00:00Z',
  },
];

// Retired/sold items
export const mockRetiredItems: Partial<GearItem>[] = [
  {
    id: 'retired-001',
    user_id: 'user-123-uuid',
    name: 'REI Flash 55',
    brand: 'REI',
    model: 'Flash 55',
    weight_grams: 1134,
    price_paid: 199.00,
    status: 'sold',
    category_id: 'pack-backpack',
    product_type_id: 'pack-backpack',
    notes: 'Sold to upgrade to lighter pack',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-12-01T00:00:00Z',
  },
];

// All items combined
export const allMockGearItems = [...mockGearItems, ...mockWishlistItems, ...mockRetiredItems];

// Helper to get items by status
export function getItemsByStatus(status: 'own' | 'wishlist' | 'sold' | 'retired') {
  return allMockGearItems.filter((item) => item.status === status);
}

// Helper to calculate total weight
export function calculateTotalWeight(items: Partial<GearItem>[]) {
  return items.reduce((total, item) => total + (item.weight_grams || 0), 0);
}

// New empty gear item template
export const emptyGearItem: Partial<GearItem> = {
  id: '',
  user_id: '',
  name: '',
  brand: '',
  model: '',
  weight_grams: 0,
  price_paid: null,
  status: 'own',
  category_id: null,
  product_type_id: null,
  notes: '',
};

// Invalid gear items for validation testing
export const invalidGearItems = {
  missingName: { ...emptyGearItem, brand: 'Test Brand' },
  negativeWeight: { ...emptyGearItem, name: 'Test', weight_grams: -100 },
  invalidStatus: { ...emptyGearItem, name: 'Test', status: 'invalid' as any },
  excessiveWeight: { ...emptyGearItem, name: 'Test', weight_grams: 1000000 },
};
