/**
 * SupabaseAuthProvider Component
 *
 * Feature: 040-supabase-migration
 *
 * Provides authentication context using Supabase Auth.
 * Maintains API compatibility with the Firebase AuthProvider to minimize
 * changes needed in consuming components.
 *
 * Replaces: components/auth/AuthProvider.tsx (Firebase version)
 */

'use client';

import { createContext, useContext, useMemo, useCallback, useEffect, type ReactNode } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSupabaseProfile } from '@/hooks/useSupabaseProfile';
import { useSupabaseStore } from '@/hooks/useSupabaseStore';
import { createClient } from '@/lib/supabase/client';
import { gearItemFromDb } from '@/lib/supabase/transformers';
import type { AuthUser, UserProfile, MergedUser } from '@/types/auth';
import type { Tables } from '@/types/database';
import { PendingImportHandler } from './PendingImportHandler';

// =============================================================================
// Types - Compatible with existing Firebase AuthProvider
// =============================================================================

/** Profile return type compatible with existing useProfile */
interface ProfileReturn {
  profile: UserProfile | null;
  mergedUser: MergedUser | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/** Auth context value compatible with existing useAuthContext */
interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  profile: ProfileReturn;
}

// =============================================================================
// Context
// =============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

interface SupabaseAuthProviderProps {
  children: ReactNode;
}

export function SupabaseAuthProvider({ children }: SupabaseAuthProviderProps) {
  const supabaseAuth = useSupabaseAuth();
  const supabaseProfile = useSupabaseProfile(supabaseAuth.user?.id ?? null);
  const setUserId = useSupabaseStore((state) => state.setUserId);
  const setRemoteGearItems = useSupabaseStore((state) => state.setRemoteGearItems);
  const setRemoteLoadouts = useSupabaseStore((state) => state.setRemoteLoadouts);

  // Sync user ID to the store when auth state changes
  useEffect(() => {
    const userId = supabaseAuth.user?.id ?? null;
    setUserId(userId);
  }, [supabaseAuth.user?.id, setUserId]);

  // Fetch gear items from Supabase when user logs in
  useEffect(() => {
    const userId = supabaseAuth.user?.id;
    if (!userId) {
      // Clear items when user logs out
      setRemoteGearItems([]);
      return;
    }

    const fetchGearItems = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('gear_items')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'own') // Only load owned items, not wishlist items
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SupabaseAuthProvider] Error fetching gear items:', error);
        return;
      }

      const gearItems = ((data || []) as Tables<'gear_items'>[]).map(gearItemFromDb);
      console.log('[SupabaseAuthProvider] Loaded', gearItems.length, 'gear items from database');
      setRemoteGearItems(gearItems);
    };

    fetchGearItems();
  }, [supabaseAuth.user?.id, setRemoteGearItems]);

  // Fetch loadouts from Supabase when user logs in
  useEffect(() => {
    const userId = supabaseAuth.user?.id;
    if (!userId) {
      // Clear loadouts when user logs out
      setRemoteLoadouts([]);
      return;
    }

    const fetchLoadouts = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('loadouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SupabaseAuthProvider] Error fetching loadouts:', error);
        return;
      }

      const loadouts = ((data || []) as Tables<'loadouts'>[]).map((row) => ({
        id: row.id,
        name: row.name,
        tripDate: row.trip_date ? new Date(row.trip_date) : null,
        itemIds: [], // Will be populated from loadout_items
        description: row.description,
        activityTypes: (row.activity_types || []) as any[],
        seasons: (row.seasons || []) as any[],
        itemStates: [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));

      console.log('[SupabaseAuthProvider] Loaded', loadouts.length, 'loadouts from database');
      setRemoteLoadouts(loadouts);
    };

    fetchLoadouts();
  }, [supabaseAuth.user?.id, setRemoteLoadouts]);

  // Map Supabase user to AuthUser format
  const user: AuthUser | null = useMemo(() => {
    if (!supabaseAuth.user) return null;
    return {
      uid: supabaseAuth.user.id,
      email: supabaseAuth.user.email ?? null,
      displayName: supabaseAuth.user.user_metadata?.display_name ?? null,
      photoURL: supabaseAuth.user.user_metadata?.avatar_url ?? null,
      emailVerified: supabaseAuth.user.email_confirmed_at !== null,
    };
  }, [supabaseAuth.user]);

  // Map Supabase profile to UserProfile format
  const userProfile: UserProfile | null = useMemo(() => {
    if (!supabaseProfile.profile) return null;
    return {
      displayName: supabaseProfile.profile.display_name ?? 'User',
      avatarUrl: supabaseProfile.profile.avatar_url ?? undefined,
    };
  }, [supabaseProfile.profile]);

  // Create merged user
  // Feature 041: Added providerAvatarUrl, locationName, latitude, longitude, bio, social links
  const mergedUser: MergedUser | null = useMemo(() => {
    if (!user) return null;
    const profile = supabaseProfile.profile;

    // Debug: Log profile role for admin access troubleshooting
    console.log('[SupabaseAuthProvider] Profile role:', profile?.role);
    return {
      uid: user.uid,
      email: user.email,
      displayName: userProfile?.displayName ?? user.displayName ?? 'User',
      // Feature 041: Custom avatar takes precedence, provider avatar as fallback
      avatarUrl: profile?.avatar_url ?? null,
      providerAvatarUrl: user.photoURL ?? null,
      // Feature 041: Bio and trail name from profile
      trailName: profile?.trail_name ?? null,
      bio: profile?.bio ?? null,
      location: null,
      // Feature 041: Location with coordinates
      locationName: profile?.location_name ?? null,
      latitude: profile?.latitude ?? null,
      longitude: profile?.longitude ?? null,
      // Feature 041: Social links from profile
      instagram: profile?.instagram ?? null,
      facebook: profile?.facebook ?? null,
      youtube: profile?.youtube ?? null,
      website: profile?.website ?? null,
      isVIP: false,
      isAdmin: profile?.role === 'admin',
    };
  }, [user, userProfile, supabaseProfile.profile]);

  // Adapter: signInWithGoogle - Not implemented for Supabase (show message)
  const signInWithGoogle = useCallback(async () => {
    throw new Error('Google sign-in is not yet available. Please use email/password or magic link.');
  }, []);

  // Adapter: signInWithEmail
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const result = await supabaseAuth.signIn({ email, password });
    if (result.error) {
      // Provide more user-friendly error messages
      let message = result.error.message;
      if (message.includes('Email not confirmed')) {
        message = 'Please check your email and click the confirmation link before logging in.';
      } else if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      }
      throw new Error(message);
    }
  }, [supabaseAuth]);

  // Adapter: registerWithEmail
  // Note: Supabase may require email confirmation before the user can log in.
  // If email confirmation is enabled, user will be created but session will be null.
  const registerWithEmail = useCallback(async (email: string, password: string) => {
    const result = await supabaseAuth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (result.error) {
      throw new Error(result.error.message);
    }

    // Check if email confirmation is required (session is null but user exists)
    if (result.user && !result.session) {
      // User created but needs to confirm email
      throw new Error('CONFIRMATION_REQUIRED');
    }
  }, [supabaseAuth]);

  // Adapter: sendPasswordReset - Use magic link for Supabase
  const sendPasswordReset = useCallback(async (email: string) => {
    const result = await supabaseAuth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
  }, [supabaseAuth]);

  // Adapter: signOut
  const signOut = useCallback(async () => {
    const result = await supabaseAuth.signOut();
    if (result.error) {
      throw new Error(result.error.message);
    }
  }, [supabaseAuth]);

  // Adapter: clearError
  const clearError = useCallback(() => {
    supabaseAuth.clearError();
  }, [supabaseAuth]);

  // Profile adapter
  // Feature 041: Pass all profile fields to updateProfile
  const profile: ProfileReturn = useMemo(() => ({
    profile: userProfile,
    mergedUser,
    loading: supabaseProfile.isLoading,
    error: supabaseProfile.error,
    updateProfile: async (data: Partial<UserProfile>) => {
      const result = await supabaseProfile.updateProfile({
        display_name: data.displayName,
        avatar_url: data.avatarUrl,
        // Feature 041: Bio and trail name
        trail_name: data.trailName,
        bio: data.bio,
        // Feature 041: Location fields
        location_name: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
        // Feature 041: Social links
        instagram: data.instagram,
        facebook: data.facebook,
        youtube: data.youtube,
        website: data.website,
      });
      if (result.error) {
        throw new Error(result.error);
      }
    },
    refreshProfile: supabaseProfile.refreshProfile,
  }), [userProfile, mergedUser, supabaseProfile]);

  // Build context value
  const value: AuthContextValue = useMemo(() => ({
    user,
    loading: supabaseAuth.isLoading,
    error: supabaseAuth.error?.message ?? null,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    signOut,
    clearError,
    profile,
  }), [
    user,
    supabaseAuth.isLoading,
    supabaseAuth.error,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    signOut,
    clearError,
    profile,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {/* Feature 048: Check for pending loadout import after auth (T025, T026) */}
      <PendingImportHandler isAuthenticated={!!user} />
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// Hook - Compatible with existing useAuthContext
// =============================================================================

/**
 * Access auth context values
 * @throws Error if used outside SupabaseAuthProvider
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within a SupabaseAuthProvider');
  }

  return context;
}
