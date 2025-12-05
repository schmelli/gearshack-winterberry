/**
 * useProfile Hook
 *
 * Feature: 008-auth-and-profile
 * FR-011, FR-012: Merge Auth+Profile, avatar priority
 * Profile state management (fetching only - creation delegated to first-time detection)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProfile, updateProfile as updateFirestoreProfile, createDefaultProfile } from '@/lib/firebase/firestore';
import type { AuthUser, UserProfile, MergedUser } from '@/types/auth';
import type { ProfileUpdatePayload } from '@/types/profile';

// =============================================================================
// Types
// =============================================================================

export interface UseProfileReturn {
  /** User profile from Firestore */
  profile: UserProfile | null;
  /** Merged user data (Auth + Profile) */
  mergedUser: MergedUser | null;
  /** Loading state for profile fetch */
  loading: boolean;
  /** Error from last profile operation */
  error: string | null;
  /** Update profile in Firestore */
  updateProfile: (data: ProfileUpdatePayload) => Promise<void>;
  /** Refresh profile from Firestore */
  refreshProfile: () => Promise<void>;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Merge Auth user with Firestore profile
 * FR-012: Prioritize Firestore avatarUrl over Auth photoURL
 */
function mergeUserData(authUser: AuthUser, profile: UserProfile | null): MergedUser {
  return {
    uid: authUser.uid,
    email: authUser.email,
    // Profile displayName takes priority, fallback to Auth displayName
    displayName: profile?.displayName || authUser.displayName || 'User',
    // FR-012: Firestore avatarUrl > Auth photoURL
    avatarUrl: profile?.avatarUrl || authUser.photoURL || null,
    trailName: profile?.trailName || null,
    bio: profile?.bio || null,
    location: profile?.location || null,
    instagram: profile?.instagram || null,
    facebook: profile?.facebook || null,
    youtube: profile?.youtube || null,
    website: profile?.website || null,
    isVIP: profile?.isVIP || false,
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useProfile(authUser: AuthUser | null): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mergedUser, setMergedUser] = useState<MergedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile when auth user changes
  const fetchProfile = useCallback(async () => {
    if (!authUser) {
      setProfile(null);
      setMergedUser(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let userProfile = await getProfile(authUser.uid);

      // T019: First-time user detection - create default profile if doesn't exist
      if (!userProfile) {
        userProfile = await createDefaultProfile(authUser.uid, authUser);
      }

      setProfile(userProfile);
      setMergedUser(mergeUserData(authUser, userProfile));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
      // On error, still create merged user from Auth data only
      setMergedUser(mergeUserData(authUser, null));
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  // Fetch profile on mount and when auth user changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Update profile
  const updateProfile = useCallback(async (data: ProfileUpdatePayload) => {
    if (!authUser) {
      throw new Error('User not authenticated');
    }

    setError(null);

    try {
      await updateFirestoreProfile(authUser.uid, data);
      // Refresh profile after update
      await fetchProfile();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
      throw err;
    }
  }, [authUser, fetchProfile]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    mergedUser,
    loading,
    error,
    updateProfile,
    refreshProfile,
  };
}
