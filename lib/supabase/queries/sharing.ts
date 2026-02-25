import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SharedLoadoutPayload,
  SharedLoadoutOwner,
  SharedLoadoutWithOwner,
  ShareListItem,
  ShareWithStats,
  CreateShareInput,
  UpdateShareInput,
} from '@/types/sharing';

/**
 * Maps database profile row to SharedLoadoutOwner interface
 */
function mapProfileToOwner(profile: {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  trail_name: string | null;
  bio: string | null;
  location_name: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  website: string | null;
  messaging_privacy: string | null;
}): SharedLoadoutOwner {
  return {
    id: profile.id,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    trailName: profile.trail_name,
    bio: profile.bio,
    locationName: profile.location_name,
    instagram: profile.instagram,
    facebook: profile.facebook,
    youtube: profile.youtube,
    website: profile.website,
    messagingPrivacy: (profile.messaging_privacy as 'everyone' | 'friends_only' | 'nobody') || 'everyone',
  };
}

/**
 * Fetches a shared loadout with owner profile data
 */
export async function getSharedLoadoutWithOwner(
  supabase: SupabaseClient,
  shareToken: string
): Promise<SharedLoadoutWithOwner | null> {
  const { data, error } = await supabase
    .from('loadout_shares')
    .select(`
      share_token,
      payload,
      allow_comments,
      created_at,
      owner:profiles!owner_id (
        id,
        display_name,
        avatar_url,
        trail_name,
        bio,
        location_name,
        instagram,
        facebook,
        youtube,
        website,
        messaging_privacy
      )
    `)
    .eq('share_token', shareToken)
    .single();

  if (error || !data) return null;

  // Handle the owner data - it can be an object, array, or null
  let owner: SharedLoadoutOwner | null = null;
  if (data.owner) {
    const ownerData = Array.isArray(data.owner) ? data.owner[0] : data.owner;
    if (ownerData) {
      owner = mapProfileToOwner(ownerData);
    }
  }

  return {
    shareToken: data.share_token,
    payload: data.payload as SharedLoadoutPayload,
    allowComments: data.allow_comments,
    createdAt: data.created_at,
    owner,
  };
}

// =============================================================================
// Share Management CRUD Operations
// =============================================================================

/**
 * Get all shares for a specific loadout (owner only - RLS enforced)
 */
export async function getSharesForLoadout(
  supabase: SupabaseClient,
  loadoutId: string
): Promise<ShareListItem[]> {
  const { data, error } = await supabase
    .from('loadout_shares')
    .select('share_token, loadout_id, allow_comments, view_count, expires_at, password_hash, created_at, payload')
    .eq('loadout_id', loadoutId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('[getSharesForLoadout] Error:', error);
    return [];
  }

  return data.map((row) => ({
    shareToken: row.share_token,
    loadoutId: row.loadout_id ?? '',
    loadoutName: (row.payload as SharedLoadoutPayload)?.loadout?.name ?? 'Unnamed',
    allowComments: row.allow_comments,
    viewCount: row.view_count ?? 0,
    expiresAt: row.expires_at,
    hasPassword: !!row.password_hash,
    createdAt: row.created_at,
  }));
}

/**
 * Get a single share with full stats (owner only - RLS enforced)
 */
export async function getShareWithStats(
  supabase: SupabaseClient,
  shareToken: string
): Promise<ShareWithStats | null> {
  const baseShare = await getSharedLoadoutWithOwner(supabase, shareToken);
  if (!baseShare) return null;

  const { data, error } = await supabase
    .from('loadout_shares')
    .select('view_count, last_viewed_at, expires_at, password_hash')
    .eq('share_token', shareToken)
    .single();

  if (error || !data) return null;

  return {
    ...baseShare,
    viewCount: data.view_count ?? 0,
    lastViewedAt: data.last_viewed_at,
    expiresAt: data.expires_at,
    hasPassword: !!data.password_hash,
  };
}

/**
 * Create a new share
 */
export async function createShare(
  supabase: SupabaseClient,
  input: CreateShareInput,
  ownerId: string
): Promise<string | null> {
  const shareToken = crypto.randomUUID();

  const { error } = await supabase
    .from('loadout_shares')
    .insert({
      share_token: shareToken,
      loadout_id: input.loadoutId,
      owner_id: ownerId,
      payload: input.payload as unknown as import('@/types/database').Json,
      allow_comments: input.allowComments ?? true,
      expires_at: input.expiresAt ?? null,
      // Note: password_hash is set via separate API route with server-side hashing
    });

  if (error) {
    console.error('[createShare] Error:', error);
    return null;
  }

  return shareToken;
}

/**
 * Update share settings (owner only - RLS enforced)
 */
export async function updateShare(
  supabase: SupabaseClient,
  shareToken: string,
  updates: UpdateShareInput
): Promise<boolean> {
  const updateData: Record<string, unknown> = {};

  if (updates.allowComments !== undefined) {
    updateData.allow_comments = updates.allowComments;
  }

  if (updates.expiresAt !== undefined) {
    updateData.expires_at = updates.expiresAt;
  }

  // Note: password updates handled via separate API route with server-side hashing

  if (Object.keys(updateData).length === 0) {
    return true; // Nothing to update
  }

  const { error } = await supabase
    .from('loadout_shares')
    .update(updateData)
    .eq('share_token', shareToken);

  if (error) {
    console.error('[updateShare] Error:', error);
    return false;
  }

  return true;
}

/**
 * Delete a share (owner only - RLS enforced)
 */
export async function deleteShare(
  supabase: SupabaseClient,
  shareToken: string
): Promise<boolean> {
  const { error } = await supabase
    .from('loadout_shares')
    .delete()
    .eq('share_token', shareToken);

  if (error) {
    console.error('[deleteShare] Error:', error);
    return false;
  }

  return true;
}

/**
 * Track a view for a share (called from API route)
 * Uses database function for atomic increment
 */
export async function trackShareView(
  supabase: SupabaseClient,
  shareToken: string,
  viewerId?: string
): Promise<boolean> {
  const { error } = await supabase.rpc('increment_share_view_count', {
    p_share_token: shareToken,
    p_viewer_id: viewerId ?? null,
  });

  if (error) {
    console.error('[trackShareView] Error:', error);
    return false;
  }

  return true;
}

/**
 * Check if a share exists and is not expired (for password verification)
 */
export async function getShareForPasswordCheck(
  supabase: SupabaseClient,
  shareToken: string
): Promise<{ exists: boolean; hasPassword: boolean; passwordHash: string | null }> {
  const { data, error } = await supabase
    .from('loadout_shares')
    .select('password_hash, expires_at')
    .eq('share_token', shareToken)
    .single();

  if (error || !data) {
    return { exists: false, hasPassword: false, passwordHash: null };
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { exists: false, hasPassword: false, passwordHash: null };
  }

  return {
    exists: true,
    hasPassword: !!data.password_hash,
    passwordHash: data.password_hash,
  };
}
