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

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform database row to CommunityBanner type
 * Handles snake_case to camelCase conversion
 */
function transformBanner(row: Record<string, unknown>): CommunityBanner {
  return {
    id: row.id as string,
    heroImageUrl: row.hero_image_url as string,
    ctaText: row.cta_text as string,
    buttonText: row.button_text as string,
    targetUrl: row.target_url as string,
    visibilityStart: row.visibility_start as string,
    visibilityEnd: row.visibility_end as string,
    displayOrder: row.display_order as number,
    isActive: row.is_active as boolean,
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Transform CommunityBanner input to database row format
 * Handles camelCase to snake_case conversion
 */
function transformToDbFormat(
  input: CreateBannerInput | UpdateBannerInput
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if ('heroImageUrl' in input && input.heroImageUrl !== undefined) {
    result.hero_image_url = input.heroImageUrl;
  }
  if ('ctaText' in input && input.ctaText !== undefined) {
    result.cta_text = input.ctaText;
  }
  if ('buttonText' in input && input.buttonText !== undefined) {
    result.button_text = input.buttonText;
  }
  if ('targetUrl' in input && input.targetUrl !== undefined) {
    result.target_url = input.targetUrl;
  }
  if ('visibilityStart' in input && input.visibilityStart !== undefined) {
    result.visibility_start = input.visibilityStart;
  }
  if ('visibilityEnd' in input && input.visibilityEnd !== undefined) {
    result.visibility_end = input.visibilityEnd;
  }
  if ('displayOrder' in input && input.displayOrder !== undefined) {
    result.display_order = input.displayOrder;
  }
  if ('isActive' in input && input.isActive !== undefined) {
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

  // Note: Type assertion needed until community_banners table is added to database types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
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

  const banners = ((data ?? []) as Record<string, unknown>[]).map((row) =>
    transformBanner(row)
  );

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
  // Note: Type assertion needed until community_banners table is added to database types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
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

  return ((data ?? []) as Record<string, unknown>[]).map((row) =>
    transformBanner(row)
  );
}

/**
 * Get a single banner by ID
 */
export async function getBanner(
  supabase: SupabaseClientType,
  id: string
): Promise<CommunityBanner | null> {
  // Note: Type assertion needed until community_banners table is added to database types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
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

  return transformBanner(data as Record<string, unknown>);
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
  const dbData = transformToDbFormat(input);

  // Note: Type assertion needed until community_banners table is added to database types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
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

  return transformBanner(data as Record<string, unknown>);
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
  const dbData = transformToDbFormat(input);

  // Note: Type assertion needed until community_banners table is added to database types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
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

  return transformBanner(data as Record<string, unknown>);
}

/**
 * Delete a banner (admin only)
 * RLS policies enforce admin-only access
 */
export async function deleteBanner(
  supabase: SupabaseClientType,
  id: string
): Promise<{ success: boolean }> {
  // Note: Type assertion needed until community_banners table is added to database types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
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
