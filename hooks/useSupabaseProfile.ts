/**
 * useSupabaseProfile Hook
 *
 * Feature: 040-supabase-migration
 * Task: T025
 *
 * Provides user profile state and methods using Supabase.
 * Fetches and updates the user profile from the profiles table.
 *
 * Replaces: hooks/useProfile.ts (Firebase version)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

// Type aliases for profiles table
type Profile = Tables<'profiles'>;
type ProfileUpdate = TablesUpdate<'profiles'>;

// =============================================================================
// Types
// =============================================================================

export interface UseSupabaseProfileReturn {
  /** User profile data */
  profile: Profile | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh profile from database */
  refreshProfile: () => Promise<void>;
  /** Update profile data */
  updateProfile: (data: ProfileUpdate) => Promise<{ error: string | null }>;
}

// =============================================================================
// Helper Functions
// =============================================================================

/** Convert database row to Profile type - now just passes through since Profile = Tables<'profiles'> */
function mapDbRowToProfile(row: Tables<'profiles'>): Profile {
  return row;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSupabaseProfile(userId: string | null): UseSupabaseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch profile from database
  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        // PGRST116 means no rows found - profile might not exist yet
        if (fetchError.code === 'PGRST116') {
          setProfile(null);
        } else {
          console.error('Error fetching profile:', fetchError);
          setError(fetchError.message);
        }
      } else if (data) {
        setProfile(mapDbRowToProfile(data as Tables<'profiles'>));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profile';
      console.error('Unexpected error fetching profile:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  // Fetch profile when userId changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Update profile
  const updateProfile = useCallback(
    async (data: ProfileUpdate): Promise<{ error: string | null }> => {
      if (!userId) {
        return { error: 'No user ID provided' };
      }

      setError(null);

      try {
        const updateData: Partial<Tables<'profiles'>> = {};

        if (data.display_name !== undefined) {
          updateData.display_name = data.display_name;
        }
        if (data.avatar_url !== undefined) {
          updateData.avatar_url = data.avatar_url;
        }
        // Feature 041: Bio and trail name
        if (data.trail_name !== undefined) {
          updateData.trail_name = data.trail_name;
        }
        if (data.bio !== undefined) {
          updateData.bio = data.bio;
        }
        // Feature 041: Location fields
        if (data.location_name !== undefined) {
          updateData.location_name = data.location_name;
        }
        if (data.latitude !== undefined) {
          updateData.latitude = data.latitude;
        }
        if (data.longitude !== undefined) {
          updateData.longitude = data.longitude;
        }
        // Feature 041: Social links
        if (data.instagram !== undefined) {
          updateData.instagram = data.instagram;
        }
        if (data.facebook !== undefined) {
          updateData.facebook = data.facebook;
        }
        if (data.youtube !== undefined) {
          updateData.youtube = data.youtube;
        }
        if (data.website !== undefined) {
          updateData.website = data.website;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          setError(updateError.message);
          return { error: updateError.message };
        }

        // Refresh profile after successful update
        await fetchProfile();
        return { error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile';
        console.error('Unexpected error updating profile:', err);
        setError(message);
        return { error: message };
      }
    },
    [userId, supabase, fetchProfile]
  );

  return {
    profile,
    isLoading,
    error,
    refreshProfile,
    updateProfile,
  };
}
