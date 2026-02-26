/**
 * Server-side announcement fetching utilities
 *
 * Feature: Community Hub Enhancement
 *
 * Handles fetching active announcements on the server side.
 */

import { createClient } from '@/lib/supabase/server';
import type { CommunityAnnouncement } from '@/types/community';

/**
 * Fetches active community announcements from the database
 * Uses proper Supabase types from Database schema
 */
export async function fetchActiveAnnouncements(): Promise<CommunityAnnouncement[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('community_announcements')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<CommunityAnnouncement[]>();

  if (error) {
    console.error('Failed to fetch announcements:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    // Note: Returns empty array to prevent page crashes.
    // Consider exposing error state in production monitoring.
    return [];
  }

  return data ?? [];
}
