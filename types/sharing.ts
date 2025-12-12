import type { ActivityType, Season } from '@/types/loadout';

export interface SharedLoadoutPayload {
  loadout: {
    id: string;
    name: string;
    description: string | null;
    tripDate: string | null;
    activityTypes: ActivityType[];
    seasons: Season[];
  };
  items: Array<{
    id: string;
    name: string;
    brand: string | null;
    primaryImageUrl: string | null;
    categoryId: string | null;
    weightGrams: number | null;
    isWorn: boolean;
    isConsumable: boolean;
  }>;
}

export interface SharedComment {
  id: string;
  share_token: string;
  item_id: string | null;
  author: string | null;
  message: string;
  created_at: string;
}
