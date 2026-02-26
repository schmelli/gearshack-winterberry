/**
 * Loadout Test Fixtures
 *
 * Realistic loadout data for testing loadout management,
 * weight calculations, and sharing features.
 */

import type { Loadout, LoadoutItem } from '@/types/loadout';
import { mockGearItems } from './gear';

// Sample loadouts
export const mockLoadouts: Partial<Loadout>[] = [
  {
    id: 'loadout-001',
    user_id: 'user-123-uuid',
    name: 'PCT Thru-Hike 2024',
    description: 'Gear list for Pacific Crest Trail thru-hike',
    activity_types: ['hiking', 'backpacking'],
    seasons: ['spring', 'summer', 'fall'],
    total_weight: 4500,
    is_public: false,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'loadout-002',
    user_id: 'user-123-uuid',
    name: 'Weekend Warrior',
    description: 'Quick overnight setup for local trails',
    activity_types: ['hiking'],
    seasons: ['summer'],
    total_weight: 3200,
    is_public: true,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z',
  },
  {
    id: 'loadout-003',
    user_id: 'user-123-uuid',
    name: 'Winter Camping',
    description: 'Cold weather camping setup',
    activity_types: ['camping', 'hiking'],
    seasons: ['winter'],
    total_weight: 6800,
    is_public: false,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z',
  },
];

// Loadout items (linking loadouts to gear)
export const mockLoadoutItems: Partial<LoadoutItem>[] = [
  // PCT Thru-Hike items
  {
    id: 'li-001',
    loadout_id: 'loadout-001',
    gear_item_id: 'gear-001', // Big Agnes tent
    quantity: 1,
    worn: false,
    consumable: false,
  },
  {
    id: 'li-002',
    loadout_id: 'loadout-001',
    gear_item_id: 'gear-002', // EE Enigma quilt
    quantity: 1,
    worn: false,
    consumable: false,
  },
  {
    id: 'li-003',
    loadout_id: 'loadout-001',
    gear_item_id: 'gear-003', // Thermarest pad
    quantity: 1,
    worn: false,
    consumable: false,
  },
  {
    id: 'li-004',
    loadout_id: 'loadout-001',
    gear_item_id: 'gear-004', // Gossamer Gear pack
    quantity: 1,
    worn: false,
    consumable: false,
  },
  {
    id: 'li-005',
    loadout_id: 'loadout-001',
    gear_item_id: 'gear-005', // MSR stove
    quantity: 1,
    worn: false,
    consumable: false,
  },
  // Weekend Warrior items (subset)
  {
    id: 'li-006',
    loadout_id: 'loadout-002',
    gear_item_id: 'gear-001', // Big Agnes tent
    quantity: 1,
    worn: false,
    consumable: false,
  },
  {
    id: 'li-007',
    loadout_id: 'loadout-002',
    gear_item_id: 'gear-003', // Thermarest pad
    quantity: 1,
    worn: false,
    consumable: false,
  },
];

// Get items for a specific loadout
export function getLoadoutItems(loadoutId: string) {
  return mockLoadoutItems.filter((item) => item.loadout_id === loadoutId);
}

// Get full gear details for loadout items
export function getLoadoutGear(loadoutId: string) {
  const items = getLoadoutItems(loadoutId);
  return items.map((item) => {
    const gear = mockGearItems.find((g) => g.id === item.gear_item_id);
    return { ...item, gear };
  });
}

// Calculate loadout weight
export function calculateLoadoutWeight(loadoutId: string) {
  const gearItems = getLoadoutGear(loadoutId);
  return gearItems.reduce((total, item) => {
    const weight = item.gear?.weight_grams || 0;
    const quantity = item.quantity || 1;
    return total + weight * quantity;
  }, 0);
}

// Empty loadout template
export const emptyLoadout: Partial<Loadout> = {
  id: '',
  user_id: '',
  name: '',
  description: '',
  activity_types: [],
  seasons: [],
  total_weight: 0,
  is_public: false,
};

// Shared loadout with token
export const mockSharedLoadout = {
  id: 'share-001',
  loadout_id: 'loadout-002',
  token: 'abc123xyz',
  password_hash: null,
  expires_at: null,
  view_count: 42,
  created_at: '2024-02-15T00:00:00Z',
  created_by: 'user-123-uuid',
};

// Password-protected share
export const mockProtectedShare = {
  id: 'share-002',
  loadout_id: 'loadout-001',
  token: 'protected123',
  password_hash: '$2a$10$hashedpassword',
  expires_at: '2025-01-01T00:00:00Z',
  view_count: 5,
  created_at: '2024-03-01T00:00:00Z',
  created_by: 'user-123-uuid',
};

// Activity types
export const activityTypes = [
  'hiking',
  'backpacking',
  'camping',
  'climbing',
  'skiing',
  'mountaineering',
  'bikepacking',
  'kayaking',
  'trail-running',
] as const;

// Seasons
export const seasons = ['spring', 'summer', 'fall', 'winter'] as const;

// Invalid loadout data for testing
export const invalidLoadouts = {
  missingName: { ...emptyLoadout, description: 'No name' },
  emptyActivities: { ...emptyLoadout, name: 'Test', activity_types: [] },
  emptySeasons: { ...emptyLoadout, name: 'Test', seasons: [] },
  negativeWeight: { ...emptyLoadout, name: 'Test', total_weight: -100 },
};
