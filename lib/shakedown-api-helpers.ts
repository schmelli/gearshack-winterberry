/**
 * Shakedown API Route Helpers
 *
 * Feature: 001-community-shakedowns
 * Tasks: T027, T076, T077
 *
 * Shared types and helper functions for shakedown API routes.
 * Extracted to keep individual route files under 500 lines.
 */

import { createClient } from '@/lib/supabase/server';
import type {
  ShakedownWithAuthor,
  FeedbackWithAuthor,
  ExperienceLevel,
  ShakedownPrivacy,
  ShakedownStatus,
} from '@/types/shakedown';

// =============================================================================
// Database Row Types (snake_case from Supabase)
// =============================================================================

/**
 * Database row from shakedowns table with author/loadout info
 */
export interface ShakedownDetailDbRow {
  id: string;
  owner_id: string;
  loadout_id: string;
  trip_name: string;
  trip_start_date: string;
  trip_end_date: string;
  experience_level: ExperienceLevel;
  concerns: string | null;
  privacy: ShakedownPrivacy;
  share_token: string | null;
  status: ShakedownStatus;
  feedback_count: number;
  helpful_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
  // Joined profile data
  profiles: {
    display_name: string;
    avatar_url: string | null;
  };
}

/**
 * Database row from loadouts table (actual columns)
 */
export interface LoadoutDbRow {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  trip_date: string | null;
  activity_types: string[] | null;
  seasons: string[] | null;
  hero_image_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Loadout item from loadout_items junction table with gear data
 */
export interface LoadoutItemDbRow {
  id: string;
  loadout_id: string;
  gear_item_id: string;
  quantity: number;
  is_worn: boolean;
  is_consumable: boolean;
  gear_items: GearItemDbRow;
}

/**
 * Category data from categories table
 * Note: Categories use i18n JSONB column for translations
 */
export interface CategoryDbRow {
  id: string;
  i18n: { en: string; de?: string };
}

/**
 * Gear item as returned from database (snake_case)
 */
export interface GearItemDbRow {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  weight_grams: number | null;
  primary_image_url: string | null;
  product_type_id: string | null;
  categories?: CategoryDbRow | null;
}

/**
 * Gear item for API response (camelCase)
 */
export interface GearItemApiResponse {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  weightGrams: number | null;
  imageUrl: string | null;
  productTypeId: string | null;
  /** Category name (localized - defaults to English) */
  categoryName: string | null;
}

/**
 * Database row from v_shakedown_feedback_with_author view
 */
export interface FeedbackDbRow {
  id: string;
  shakedown_id: string;
  author_id: string;
  parent_id: string | null;
  gear_item_id: string | null;
  content: string;
  content_html: string | null;
  depth: number;
  helpful_count: number;
  is_hidden: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_avatar: string | null;
  author_reputation: number;
  gear_item_name: string | null;
}

/**
 * Profile row for admin check
 */
export interface ProfileRow {
  is_admin: boolean;
}

// =============================================================================
// Mapper Functions
// =============================================================================

/**
 * Maps database shakedown row to ShakedownWithAuthor type
 */
export function mapDbRowToShakedownWithAuthor(
  row: ShakedownDetailDbRow,
  loadoutName: string,
  totalWeightGrams: number,
  itemCount: number
): ShakedownWithAuthor {
  return {
    id: row.id,
    ownerId: row.owner_id,
    loadoutId: row.loadout_id,
    tripName: row.trip_name,
    tripStartDate: row.trip_start_date,
    tripEndDate: row.trip_end_date,
    experienceLevel: row.experience_level,
    concerns: row.concerns,
    privacy: row.privacy,
    shareToken: row.share_token,
    status: row.status,
    feedbackCount: row.feedback_count,
    helpfulCount: row.helpful_count,
    isHidden: row.is_hidden,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    // Author info from joined profile
    authorName: row.profiles.display_name,
    authorAvatar: row.profiles.avatar_url,
    // Loadout summary
    loadoutName,
    totalWeightGrams,
    itemCount,
  };
}

/**
 * Maps database feedback row to FeedbackWithAuthor type
 */
export function mapFeedbackRowToFeedbackWithAuthor(
  row: FeedbackDbRow
): FeedbackWithAuthor {
  return {
    id: row.id,
    shakedownId: row.shakedown_id,
    authorId: row.author_id,
    parentId: row.parent_id,
    gearItemId: row.gear_item_id,
    content: row.content,
    contentHtml: row.content_html,
    depth: row.depth as 1 | 2 | 3,
    helpfulCount: row.helpful_count,
    isHidden: row.is_hidden,
    isEdited: row.is_edited,
    editedAt: null, // Not in view
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    authorReputation: row.author_reputation,
    gearItemName: row.gear_item_name,
  };
}

/**
 * Maps gear item database row to API response format
 * @param row - The gear item database row
 * @param locale - Optional locale for category name (default: 'en')
 */
export function mapGearItemToApiResponse(
  row: GearItemDbRow,
  locale: 'en' | 'de' = 'en'
): GearItemApiResponse {
  // Get localized category name from i18n JSONB structure { en: string; de?: string }
  let categoryName: string | null = null;
  if (row.categories?.i18n) {
    const i18n = row.categories.i18n;
    categoryName = locale === 'de' && i18n.de ? i18n.de : i18n.en;
  }

  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    description: row.description,
    weightGrams: row.weight_grams,
    imageUrl: row.primary_image_url,
    productTypeId: row.product_type_id,
    categoryName,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a user is friends with another user
 */
export async function checkFriendship(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  targetUserId: string
): Promise<boolean> {
  // Friendships use canonical ordering (user_id < friend_id)
  const [smallerId, largerId] =
    userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId];

  const { data: friendship, error } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id', smallerId)
    .eq('friend_id', largerId)
    .single();

  // PGRST116 = no rows found (not an error for this check)
  if (error && error.code !== 'PGRST116') {
    console.error('[checkFriendship] Error checking friendship:', error);
    throw new Error(`Failed to check friendship: ${error.message}`);
  }

  return !!friendship;
}

/**
 * Checks if user is an admin via profile
 */
export async function checkIsAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[API] Error checking admin status:', error);
    return false;
  }

  const profile = data as ProfileRow | null;
  return profile?.is_admin ?? false;
}

/**
 * Validates UUID format
 */
export function isValidUuid(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
