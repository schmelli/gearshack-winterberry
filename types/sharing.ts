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
