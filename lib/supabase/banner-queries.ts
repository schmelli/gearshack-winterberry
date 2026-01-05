/**
 * Supabase Query Functions for Community Banners
 *
 * Feature: 056-community-hub-enhancements
 *
 * Banner management operations using Supabase client.
 * Admin-only mutations protected by RLS policies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type {
  CommunityBanner,
  CreateBannerInput,
  UpdateBannerInput,
  ActiveBannersResponse,
} from '@/types/banner';

type SupabaseClientType = SupabaseClient<Database>;
type BannerRow = Database['public']['Tables']['community_banners']['Row'];
type BannerInsert = Database['public']['Tables']['community_banners']['Insert'];
type BannerUpdate = Database['public']['Tables']['community_banners']['Update'];

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform database row to CommunityBanner type
 * Handles snake_case to camelCase conversion
 */
function transformBanner(row: BannerRow): CommunityBanner {
  return {
    id: row.id,
    heroImageUrl: row.hero_image_url,
    ctaText: row.cta_text,
    buttonText: row.button_text,
    targetUrl: row.target_url,
    visibilityStart: row.visibility_start,
    visibilityEnd: row.visibility_end,
    displayOrder: row.display_order,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Transform CreateBannerInput to database insert format
 * Handles camelCase to snake_case conversion
 */
function transformToInsertFormat(input: CreateBannerInput): BannerInsert {
  return {
    hero_image_url: input.heroImageUrl,
    cta_text: input.ctaText,
    button_text: input.buttonText,
    target_url: input.targetUrl,
    visibility_start: input.visibilityStart,
    visibility_end: input.visibilityEnd,
    display_order: input.displayOrder ?? 0,
    is_active: input.isActive ?? true,
  };
}

/**
 * Transform UpdateBannerInput to database update format
 * Handles camelCase to snake_case conversion with partial updates
 */
function transformToUpdateFormat(input: UpdateBannerInput): BannerUpdate {
  const result: BannerUpdate = {};

  if (input.heroImageUrl !== undefined) {
    result.hero_image_url = input.heroImageUrl;
  }
  if (input.ctaText !== undefined) {
    result.cta_text = input.ctaText;
  }
  if (input.buttonText !== undefined) {
    result.button_text = input.buttonText;
  }
  if (input.targetUrl !== undefined) {
    result.target_url = input.targetUrl;
  }
  if (input.visibilityStart !== undefined) {
    result.visibility_start = input.visibilityStart;
  }
  if (input.visibilityEnd !== undefined) {
    result.visibility_end = input.visibilityEnd;
  }
  if (input.displayOrder !== undefined) {
    result.display_order = input.displayOrder;
  }
  if (input.isActive !== undefined) {
    result.is_active = input.isActive;
  }

  return result;
}

// ============================================================================
// Public Queries
// ============================================================================

/**
 * Fetch currently active banners for display in carousel
 * Filtered by visibility window and active status
 * Ordered by display_order then created_at
 */
export async function fetchActiveBanners(
  supabase: SupabaseClientType
): Promise<ActiveBannersResponse> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('community_banners')
    .select('*')
    .eq('is_active', true)
    .lte('visibility_start', now)
    .gte('visibility_end', now)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch active banners: ${error.message}`);
  }

  const banners = (data ?? []).map(transformBanner);

  return { banners };
}

// ============================================================================
// Admin Queries
// ============================================================================

/**
 * Fetch all banners for admin management
 * Includes expired banners by default, ordered by display_order
 */
export async function fetchAllBanners(
  supabase: SupabaseClientType,
  includeExpired = true
): Promise<CommunityBanner[]> {
  let query = supabase
    .from('community_banners')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (!includeExpired) {
    const now = new Date().toISOString();
    query = query.gte('visibility_end', now);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch banners: ${error.message}`);
  }

  return (data ?? []).map(transformBanner);
}

/**
 * Get a single banner by ID
 */
export async function getBanner(
  supabase: SupabaseClientType,
  id: string
): Promise<CommunityBanner | null> {
  const { data, error } = await supabase
    .from('community_banners')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch banner: ${error.message}`);
  }

  return transformBanner(data);
}

// ============================================================================
// Admin Mutations
// ============================================================================

/**
 * Create a new banner (admin only)
 * RLS policies enforce admin-only access
 */
export async function createBanner(
  supabase: SupabaseClientType,
  input: CreateBannerInput
): Promise<CommunityBanner> {
  const dbData = transformToInsertFormat(input);

  const { data, error } = await supabase
    .from('community_banners')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    if (error.code === '42501') {
      throw new Error('Permission denied: Admin access required');
    }
    if (error.code === '23514') {
      throw new Error('Invalid date range: End date must be after start date');
    }
    throw new Error(`Failed to create banner: ${error.message}`);
  }

  return transformBanner(data);
}

/**
 * Update an existing banner (admin only)
 * RLS policies enforce admin-only access
 */
export async function updateBanner(
  supabase: SupabaseClientType,
  id: string,
  input: UpdateBannerInput
): Promise<CommunityBanner> {
  const dbData = transformToUpdateFormat(input);

  const { data, error } = await supabase
    .from('community_banners')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '42501') {
      throw new Error('Permission denied: Admin access required');
    }
    if (error.code === '23514') {
      throw new Error('Invalid date range: End date must be after start date');
    }
    if (error.code === 'PGRST116') {
      throw new Error('Banner not found');
    }
    throw new Error(`Failed to update banner: ${error.message}`);
  }

  return transformBanner(data);
}

/**
 * Delete a banner (admin only)
 * RLS policies enforce admin-only access
 */
export async function deleteBanner(
  supabase: SupabaseClientType,
  id: string
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('community_banners')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '42501') {
      throw new Error('Permission denied: Admin access required');
    }
    throw new Error(`Failed to delete banner: ${error.message}`);
  }

  return { success: true };
}
