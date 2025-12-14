import type { SupabaseClient } from '@supabase/supabase-js';
import type { SharedLoadoutPayload, SharedLoadoutOwner, SharedLoadoutWithOwner } from '@/types/sharing';

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
