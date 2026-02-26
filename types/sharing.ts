import type { ActivityType, Season } from '@/types/loadout';
import type { NobgImages } from '@/types/gear';

export interface SharedGearItem {
  id: string;
  name: string;
  brand: string | null;
  primaryImageUrl: string | null;
  categoryId: string | null;
  weightGrams: number | null;
  isWorn: boolean;
  isConsumable: boolean;
  // New fields for GearCard rendering
  description: string | null;
  nobgImages: NobgImages | null;
}

export interface SharedLoadoutPayload {
  loadout: {
    id: string;
    name: string;
    description: string | null;
    tripDate: string | null;
    activityTypes: ActivityType[];
    seasons: Season[];
  };
  items: SharedGearItem[];
}

export interface SharedLoadoutOwner {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  trailName: string | null;
  bio: string | null;
  locationName: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  website: string | null;
  messagingPrivacy: 'everyone' | 'friends_only' | 'nobody';
}

export interface SharedLoadoutWithOwner {
  shareToken: string;
  payload: SharedLoadoutPayload;
  allowComments: boolean;
  createdAt: string;
  owner: SharedLoadoutOwner | null;
}

export interface SharedComment {
  id: string;
  share_token: string;
  item_id: string | null;
  author: string | null;
  message: string;
  created_at: string;
}

// =============================================================================
// Share Management Types (Feature: Share Management CRUD)
// =============================================================================

/**
 * Settings that can be configured for a share
 */
export interface ShareSettings {
  allowComments: boolean;
  expiresAt: string | null;
  password: string | null; // Plain text for setting, never returned from server
}

/**
 * Extended share data including stats (for owner view)
 */
export interface ShareWithStats extends SharedLoadoutWithOwner {
  viewCount: number;
  lastViewedAt: string | null;
  expiresAt: string | null;
  hasPassword: boolean;
}

/**
 * Simplified share item for listing in management UI
 */
export interface ShareListItem {
  shareToken: string;
  loadoutId: string;
  loadoutName: string;
  allowComments: boolean;
  viewCount: number;
  expiresAt: string | null;
  hasPassword: boolean;
  createdAt: string;
}

/**
 * Input for creating a new share
 */
export interface CreateShareInput {
  loadoutId: string;
  payload: SharedLoadoutPayload;
  allowComments?: boolean;
  expiresAt?: string | null;
  password?: string | null;
}

/**
 * Input for updating an existing share
 */
export interface UpdateShareInput {
  allowComments?: boolean;
  expiresAt?: string | null;
  password?: string | null; // null to remove, undefined to keep unchanged
}

/**
 * View analytics record
 */
export interface ShareViewRecord {
  id: string;
  shareToken: string;
  viewerId: string | null;
  viewedAt: string;
}
