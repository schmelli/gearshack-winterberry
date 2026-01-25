/**
 * API Route: Shakedown Detail
 *
 * Feature: 001-community-shakedowns
 * Tasks: T027 (GET), T076 (DELETE), T077 (PATCH)
 *
 * GET /api/shakedowns/[id] - Fetch a single shakedown with loadout and feedback
 * DELETE /api/shakedowns/[id] - Soft-delete a shakedown (owner only)
 * PATCH /api/shakedowns/[id] - Update shakedown details (owner only)
 *
 * Privacy handling:
 * - Public: Anyone can view
 * - Friends-only: Only friends can view (checks friendships table)
 * - Private: Only owner can view OR valid shareToken
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { updateShakedownSchema } from '@/lib/shakedown-schemas';
import {
  type ShakedownDetailDbRow,
  type LoadoutItemDbRow,
  type GearItemApiResponse,
  type FeedbackDbRow,
  mapDbRowToShakedownWithAuthor,
  mapFeedbackRowToFeedbackWithAuthor,
  mapGearItemToApiResponse,
  checkFriendship,
  checkIsAdmin,
  isValidUuid,
} from '@/lib/shakedown-api-helpers';
import type {
  ShakedownWithAuthor,
  FeedbackWithAuthor,
  ExperienceLevel,
  ShakedownPrivacy,
} from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

interface ErrorResponse {
  error: string;
  code?: string;
  details?: z.ZodIssue[] | Record<string, string[]>;
}

interface DeleteShakedownResponse {
  success: true;
}

interface UpdateShakedownResponse {
  shakedown: ShakedownWithAuthor;
}

/**
 * Extended gear item response that includes loadout item metadata
 */
interface ShakedownLoadoutItem extends GearItemApiResponse {
  quantity: number;
  isWorn: boolean;
  isConsumable: boolean;
}

/**
 * API Response shape for GET /api/shakedowns/[id]
 */
interface ShakedownDetailResponse {
  shakedown: ShakedownWithAuthor;
  loadout: {
    id: string;
    name: string;
    description: string | null;
    totalWeight: number;
    itemCount: number;
    gearItems: ShakedownLoadoutItem[];
  };
  feedback: FeedbackWithAuthor[];
}

// =============================================================================
// GET Handler - Fetch Single Shakedown
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ShakedownDetailResponse | ErrorResponse>> {
  try {
    const { id: shakedownId } = await params;

    // Validate UUID format before querying database
    if (!isValidUuid(shakedownId)) {
      return NextResponse.json(
        { error: 'Invalid shakedown ID format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user (optional - affects privacy checks)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get optional share token from query params
    const shareToken = request.nextUrl.searchParams.get('shareToken');

    // Extract locale from Accept-Language header or NEXT_LOCALE cookie
    const acceptLanguage = request.headers.get('Accept-Language') || '';
    const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
    const locale: 'en' | 'de' = localeCookie === 'de' || acceptLanguage.startsWith('de') ? 'de' : 'en';

    // Use service role client to bypass RLS for initial fetch.
    // Permission checks are handled in application code below (privacy, ownership, etc.)
    // This fixes an issue where RLS auth.uid() context may not be properly populated
    // in certain scenarios, causing the owner's own shakedowns to be inaccessible.
    const serviceClient = createServiceRoleClient();

    // Fetch shakedown first (without relationship to avoid PostgREST FK issues)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shakedownData, error: shakedownError } = await (serviceClient as any)
      .from('shakedowns')
      .select('*')
      .eq('id', shakedownId)
      .single();

    if (shakedownError) {
      console.error('[API] Shakedown fetch error:', shakedownError);
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    if (!shakedownData) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    // Fetch profile separately to avoid embedded relationship issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileData, error: profileError } = await (serviceClient as any)
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', shakedownData.owner_id)
      .single();

    if (profileError) {
      console.error('[API] Profile fetch error:', profileError);
    }

    // Combine shakedown with profile data
    const shakedown: ShakedownDetailDbRow = {
      ...shakedownData,
      profiles: profileData || { display_name: 'Unknown User', avatar_url: null },
    };

    // Check if shakedown is hidden
    if (shakedown.is_hidden) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    // Privacy checks
    const isOwner = user?.id === shakedown.owner_id;

    if (!isOwner) {
      switch (shakedown.privacy) {
        case 'private':
          // Private: Only owner can view, or valid share token
          if (shakedown.share_token && shareToken === shakedown.share_token) {
            // Valid share token - allow access
            break;
          }
          return NextResponse.json(
            { error: 'Access denied. This shakedown is private.' },
            { status: 403 }
          );

        case 'friends_only':
          // Friends-only: Must be authenticated and be a friend
          if (!user) {
            return NextResponse.json(
              { error: 'Access denied. Sign in to view friend shakedowns.' },
              { status: 403 }
            );
          }
          // Use service client to check friendship (bypasses RLS issues)
          const isFriend = await checkFriendship(
            serviceClient,
            user.id,
            shakedown.owner_id
          );
          if (!isFriend) {
            return NextResponse.json(
              { error: 'Access denied. This shakedown is only visible to friends.' },
              { status: 403 }
            );
          }
          break;

        case 'public':
        default:
          // Public: Anyone can view
          break;
      }
    }

    // Fetch loadout data (using service client to avoid RLS issues)
    // Only select columns that actually exist in the loadouts table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loadoutRow, error: loadoutError } = await (serviceClient as any)
      .from('loadouts')
      .select('id, name, description')
      .eq('id', shakedown.loadout_id)
      .single();

    if (loadoutError || !loadoutRow) {
      console.error('[API] Failed to fetch loadout:', loadoutError);
      return NextResponse.json(
        { error: 'Loadout not found' },
        { status: 404 }
      );
    }

    const loadout = loadoutRow as { id: string; name: string; description: string | null };

    // Fetch gear items via loadout_items junction table with joined gear_items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loadoutItemRows, error: loadoutItemsError } = await (serviceClient as any)
      .from('loadout_items')
      .select(`
        id,
        loadout_id,
        gear_item_id,
        quantity,
        is_worn,
        is_consumable,
        gear_items (
          id,
          name,
          brand,
          description,
          weight_grams,
          primary_image_url,
          product_type_id
        )
      `)
      .eq('loadout_id', shakedown.loadout_id);

    // Collect unique category IDs to fetch names
    const categoryIds = new Set<string>();
    if (loadoutItemRows) {
      for (const item of loadoutItemRows) {
        if (item.gear_items?.product_type_id) {
          categoryIds.add(item.gear_items.product_type_id);
        }
      }
    }

    // Fetch category names if any
    // The categories table uses i18n JSONB column with { en: string; de?: string } structure
    const categoryMap: Record<string, { en: string; de?: string }> = {};
    if (categoryIds.size > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: categoriesData, error: categoriesError } = await (serviceClient as any)
        .from('categories')
        .select('id, i18n')
        .in('id', Array.from(categoryIds));

      if (categoriesError) {
        console.error('[API] Categories fetch error:', categoriesError);
      }

      if (categoriesData) {
        for (const cat of categoriesData) {
          if (cat.i18n) {
            categoryMap[cat.id] = cat.i18n as { en: string; de?: string };
          }
        }
      }
    }

    const gearItems: ShakedownLoadoutItem[] = [];
    let totalWeightGrams = 0;
    let itemCount = 0;

    // Debug: Log loadout items query result
    console.log('[API] Shakedown loadout_id:', shakedown.loadout_id);
    console.log('[API] Loadout items query result:', {
      error: loadoutItemsError,
      rowCount: loadoutItemRows?.length ?? 0,
      firstRow: loadoutItemRows?.[0] ?? null,
    });

    if (loadoutItemsError) {
      console.error('[API] Failed to fetch loadout items:', loadoutItemsError);
      // Continue without gear items rather than failing
    } else if (loadoutItemRows && loadoutItemRows.length > 0) {
      // Process loadout items and calculate totals
      for (const item of loadoutItemRows as LoadoutItemDbRow[]) {
        if (item.gear_items) {
          const gearItem = item.gear_items;

          // Get localized category name from categoryMap (i18n structure: { en: string; de?: string })
          let categoryName: string | null = null;
          if (gearItem.product_type_id && categoryMap[gearItem.product_type_id]) {
            const cat = categoryMap[gearItem.product_type_id];
            categoryName = locale === 'de' && cat.de ? cat.de : cat.en;
          }

          // Include item-specific metadata (quantity, isWorn, isConsumable)
          // Note: mapGearItemToApiResponse won't have category data since we fetch it separately
          const baseItem = mapGearItemToApiResponse(gearItem, locale);
          gearItems.push({
            ...baseItem,
            categoryName, // Override with our looked-up category name
            quantity: item.quantity,
            isWorn: item.is_worn,
            isConsumable: item.is_consumable,
          });

          // Calculate total weight (weight * quantity)
          if (gearItem.weight_grams) {
            totalWeightGrams += gearItem.weight_grams * item.quantity;
          }
          // Count distinct items (like v_shakedowns_feed view does with COUNT(*))
          // not the sum of quantities
          itemCount++;
        }
      }
    }

    // Fetch feedback from the view (using service client to avoid RLS issues)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedbackRows, error: feedbackError } = await (serviceClient as any)
      .from('v_shakedown_feedback_with_author')
      .select('*')
      .eq('shakedown_id', shakedownId)
      .order('created_at', { ascending: true });

    if (feedbackError) {
      console.error('[API] Failed to fetch feedback:', feedbackError);
      // Continue without feedback rather than failing
    }

    const feedback: FeedbackWithAuthor[] = feedbackRows
      ? (feedbackRows as FeedbackDbRow[]).map(mapFeedbackRowToFeedbackWithAuthor)
      : [];

    // Build response
    const response: ShakedownDetailResponse = {
      shakedown: mapDbRowToShakedownWithAuthor(
        shakedown,
        loadout.name,
        totalWeightGrams,
        itemCount
      ),
      loadout: {
        id: loadout.id,
        name: loadout.name,
        description: loadout.description,
        totalWeight: totalWeightGrams,
        itemCount: itemCount,
        gearItems,
      },
      feedback,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Shakedown detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE Handler - Soft Delete Shakedown (Task T076)
// =============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<DeleteShakedownResponse | ErrorResponse>> {
  try {
    const { id: shakedownId } = await params;

    // Validate shakedown ID format
    if (!isValidUuid(shakedownId)) {
      return NextResponse.json(
        { error: 'Invalid shakedown ID format' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch existing shakedown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingShakedown, error: fetchError } = await (supabase as any)
      .from('shakedowns')
      .select('id, owner_id, is_hidden')
      .eq('id', shakedownId)
      .single();

    if (fetchError || !existingShakedown) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    const shakedown = existingShakedown as {
      id: string;
      owner_id: string;
      is_hidden: boolean;
    };

    // Check if already hidden
    if (shakedown.is_hidden) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (shakedown.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own shakedowns', code: 'NOT_OWNER' },
        { status: 403 }
      );
    }

    // Soft delete: Set is_hidden = true
    // Child feedback remains but becomes inaccessible since shakedown is hidden
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('shakedowns')
      .update({
        is_hidden: true,
        updated_at: now,
      })
      .eq('id', shakedownId);

    if (deleteError) {
      console.error('[API] Failed to delete shakedown:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete shakedown' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Shakedown delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH Handler - Update Shakedown (Task T077)
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UpdateShakedownResponse | ErrorResponse>> {
  try {
    const { id: shakedownId } = await params;

    // Validate shakedown ID format
    if (!isValidUuid(shakedownId)) {
      return NextResponse.json(
        { error: 'Invalid shakedown ID format' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const validation = updateShakedownSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if there are any updates to make
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    // Validate date range if both dates provided
    if (updateData.tripStartDate && updateData.tripEndDate) {
      const start = new Date(updateData.tripStartDate);
      const end = new Date(updateData.tripEndDate);
      if (end < start) {
        return NextResponse.json(
          { error: 'End date must be after or equal to start date' },
          { status: 400 }
        );
      }
    }

    // Fetch existing shakedown with profile data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingShakedown, error: fetchError } = await (supabase as any)
      .from('shakedowns')
      .select(
        `
        *,
        profiles!owner_id (
          display_name,
          avatar_url
        )
      `
      )
      .eq('id', shakedownId)
      .single();

    if (fetchError || !existingShakedown) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    const shakedown = existingShakedown as ShakedownDetailDbRow;

    // Check if hidden
    if (shakedown.is_hidden) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (shakedown.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only update your own shakedowns', code: 'NOT_OWNER' },
        { status: 403 }
      );
    }

    // Check if archived
    if (shakedown.status === 'archived') {
      return NextResponse.json(
        { error: 'Cannot modify archived shakedowns', code: 'ARCHIVED' },
        { status: 403 }
      );
    }

    // Privacy change restriction: only allow if no feedback yet, or user is admin
    if (updateData.privacy && updateData.privacy !== shakedown.privacy) {
      const isAdmin = await checkIsAdmin(supabase, user.id);
      if (!isAdmin && shakedown.feedback_count > 0) {
        return NextResponse.json(
          {
            error: 'Privacy cannot be changed after receiving feedback',
            code: 'PRIVACY_LOCKED',
          },
          { status: 403 }
        );
      }
    }

    // Build update object (convert camelCase to snake_case)
    const dbUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updateData.tripName !== undefined) {
      dbUpdate.trip_name = updateData.tripName.trim();
    }
    if (updateData.tripStartDate !== undefined) {
      dbUpdate.trip_start_date = updateData.tripStartDate;
    }
    if (updateData.tripEndDate !== undefined) {
      dbUpdate.trip_end_date = updateData.tripEndDate;
    }
    if (updateData.experienceLevel !== undefined) {
      dbUpdate.experience_level = updateData.experienceLevel;
    }
    if (updateData.concerns !== undefined) {
      dbUpdate.concerns = updateData.concerns?.trim() || null;
    }
    if (updateData.privacy !== undefined) {
      dbUpdate.privacy = updateData.privacy;
    }

    // If updating dates, validate against existing data
    const finalStartDate = updateData.tripStartDate || shakedown.trip_start_date;
    const finalEndDate = updateData.tripEndDate || shakedown.trip_end_date;
    if (new Date(finalEndDate) < new Date(finalStartDate)) {
      return NextResponse.json(
        { error: 'End date must be after or equal to start date' },
        { status: 400 }
      );
    }

    // Update shakedown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('shakedowns')
      .update(dbUpdate)
      .eq('id', shakedownId);

    if (updateError) {
      console.error('[API] Failed to update shakedown:', updateError);
      return NextResponse.json(
        { error: 'Failed to update shakedown' },
        { status: 500 }
      );
    }

    // Fetch loadout for response
    // Note: total_weight_grams and item_count come from the v_shakedowns_feed view,
    // not the loadouts table directly. We'll get the name from the table
    // and use 0 as defaults for the weight/count (they're calculated in the view)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loadoutRow, error: loadoutError } = await (supabase as any)
      .from('loadouts')
      .select('id, name')
      .eq('id', shakedown.loadout_id)
      .single();

    let loadoutName = shakedown.trip_name;
    // Weight and item count are computed in the view, use cached values from shakedown
    // These will be recalculated on next fetch from the view
    let totalWeightGrams = 0;
    let itemCount = 0;

    if (!loadoutError && loadoutRow) {
      const loadout = loadoutRow as unknown as {
        id: string;
        name: string;
      };
      loadoutName = loadout.name;
    }

    // Try to get weight/count from the view if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: viewData } = await (supabase as any)
      .from('v_shakedowns_feed')
      .select('total_weight_grams, item_count')
      .eq('id', shakedownId)
      .single();

    if (viewData) {
      const viewRow = viewData as { total_weight_grams: number; item_count: number };
      totalWeightGrams = viewRow.total_weight_grams ?? 0;
      itemCount = viewRow.item_count ?? 0;
    }

    // Build updated shakedown response
    const updatedShakedown: ShakedownWithAuthor = {
      id: shakedown.id,
      ownerId: shakedown.owner_id,
      loadoutId: shakedown.loadout_id,
      tripName: (dbUpdate.trip_name as string) || shakedown.trip_name,
      tripStartDate: (dbUpdate.trip_start_date as string) || shakedown.trip_start_date,
      tripEndDate: (dbUpdate.trip_end_date as string) || shakedown.trip_end_date,
      experienceLevel:
        (dbUpdate.experience_level as ExperienceLevel) || shakedown.experience_level,
      concerns: dbUpdate.concerns !== undefined ? (dbUpdate.concerns as string | null) : shakedown.concerns,
      privacy: (dbUpdate.privacy as ShakedownPrivacy) || shakedown.privacy,
      shareToken: shakedown.share_token,
      status: shakedown.status,
      feedbackCount: shakedown.feedback_count,
      helpfulCount: shakedown.helpful_count,
      isHidden: shakedown.is_hidden,
      createdAt: shakedown.created_at,
      updatedAt: dbUpdate.updated_at as string,
      completedAt: shakedown.completed_at,
      archivedAt: shakedown.archived_at,
      authorName: shakedown.profiles.display_name,
      authorAvatar: shakedown.profiles.avatar_url,
      loadoutName,
      totalWeightGrams,
      itemCount,
    };

    return NextResponse.json({ shakedown: updatedShakedown });
  } catch (error) {
    console.error('[API] Shakedown update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
