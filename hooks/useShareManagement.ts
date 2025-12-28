/**
 * useShareManagement Hook
 *
 * Feature: Share Management CRUD
 *
 * Provides full CRUD operations for managing loadout shares:
 * - List all shares for a loadout
 * - Create new shares
 * - Update share settings (comments, expiry)
 * - Delete shares
 * - Password management via API
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import {
  getSharesForLoadout,
  createShare,
  updateShare,
  deleteShare,
} from '@/lib/supabase/queries/sharing';
import type {
  ShareListItem,
  CreateShareInput,
  UpdateShareInput,
  SharedLoadoutPayload,
} from '@/types/sharing';

// =============================================================================
// Types
// =============================================================================

export interface UseShareManagementReturn {
  /** List of shares for the loadout */
  shares: ShareListItem[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh the shares list */
  refresh: () => Promise<void>;
  /** Create a new share and return the share URL */
  createNewShare: (
    payload: SharedLoadoutPayload,
    settings?: { allowComments?: boolean; expiresAt?: string | null }
  ) => Promise<{ url: string; shareToken: string } | null>;
  /** Update share settings */
  updateShareSettings: (shareToken: string, updates: UpdateShareInput) => Promise<boolean>;
  /** Delete a share */
  removeShare: (shareToken: string) => Promise<boolean>;
  /** Set password for a share (via API) */
  setPassword: (shareToken: string, password: string) => Promise<boolean>;
  /** Remove password from a share (via API) */
  removePassword: (shareToken: string) => Promise<boolean>;
  /** Generate share URL from token */
  getShareUrl: (shareToken: string) => string;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useShareManagement
 *
 * Manages share state and operations for a loadout.
 * Provides optimistic updates and error handling.
 *
 * @param loadoutId - The ID of the loadout to manage shares for
 * @param userId - Current user ID (required for ownership verification)
 * @returns Share management functions and state
 */
export function useShareManagement(
  loadoutId: string,
  userId: string | null
): UseShareManagementReturn {
  const supabase = useMemo(() => createClient(), []);
  const locale = useLocale();

  const [shares, setShares] = useState<ShareListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate share URL from token
  const getShareUrl = useCallback(
    (shareToken: string): string => {
      if (typeof window === 'undefined') return '';
      return `${window.location.origin}/${locale}/shakedown/${shareToken}`;
    },
    [locale]
  );

  // Fetch shares for the loadout
  const refresh = useCallback(async () => {
    if (!userId || !loadoutId) {
      setShares([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedShares = await getSharesForLoadout(supabase, loadoutId);
      setShares(fetchedShares);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load shares';
      setError(message);
      console.error('[useShareManagement] refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, loadoutId, userId]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Create a new share
  const createNewShare = useCallback(
    async (
      payload: SharedLoadoutPayload,
      settings?: { allowComments?: boolean; expiresAt?: string | null }
    ): Promise<{ url: string; shareToken: string } | null> => {
      if (!userId) {
        toast.error('You must be logged in to share');
        return null;
      }

      try {
        const input: CreateShareInput = {
          loadoutId,
          payload,
          allowComments: settings?.allowComments ?? true,
          expiresAt: settings?.expiresAt ?? null,
        };

        const shareToken = await createShare(supabase, input, userId);

        if (!shareToken) {
          toast.error('Failed to create share link');
          return null;
        }

        // Optimistically add to list
        const newShare: ShareListItem = {
          shareToken,
          loadoutId,
          loadoutName: payload.loadout.name,
          allowComments: input.allowComments ?? true,
          viewCount: 0,
          expiresAt: input.expiresAt ?? null,
          hasPassword: false,
          createdAt: new Date().toISOString(),
        };

        setShares((prev) => [newShare, ...prev]);

        const url = getShareUrl(shareToken);
        toast.success('Share link created');

        return { url, shareToken };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create share';
        toast.error(message);
        console.error('[useShareManagement] createNewShare error:', err);
        return null;
      }
    },
    [supabase, loadoutId, userId, getShareUrl]
  );

  // Update share settings
  const updateShareSettings = useCallback(
    async (shareToken: string, updates: UpdateShareInput): Promise<boolean> => {
      // Optimistic update
      setShares((prev) =>
        prev.map((share) => {
          if (share.shareToken !== shareToken) return share;
          return {
            ...share,
            allowComments: updates.allowComments ?? share.allowComments,
            expiresAt: updates.expiresAt !== undefined ? updates.expiresAt : share.expiresAt,
          };
        })
      );

      try {
        const success = await updateShare(supabase, shareToken, updates);

        if (!success) {
          // Revert on failure
          await refresh();
          toast.error('Failed to update share settings');
          return false;
        }

        toast.success('Share settings updated');
        return true;
      } catch (err) {
        // Revert on error
        await refresh();
        const message = err instanceof Error ? err.message : 'Failed to update share';
        toast.error(message);
        console.error('[useShareManagement] updateShareSettings error:', err);
        return false;
      }
    },
    [supabase, refresh]
  );

  // Delete a share
  const removeShare = useCallback(
    async (shareToken: string): Promise<boolean> => {
      // Store for potential rollback
      const previousShares = shares;

      // Optimistic update
      setShares((prev) => prev.filter((share) => share.shareToken !== shareToken));

      try {
        const success = await deleteShare(supabase, shareToken);

        if (!success) {
          // Revert on failure
          setShares(previousShares);
          toast.error('Failed to delete share');
          return false;
        }

        toast.success('Share link deleted');
        return true;
      } catch (err) {
        // Revert on error
        setShares(previousShares);
        const message = err instanceof Error ? err.message : 'Failed to delete share';
        toast.error(message);
        console.error('[useShareManagement] removeShare error:', err);
        return false;
      }
    },
    [supabase, shares]
  );

  // Set password via API (requires server-side hashing)
  const setPassword = useCallback(
    async (shareToken: string, password: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/shares/${shareToken}/password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        if (!response.ok) {
          const data = await response.json();
          toast.error(data.error || 'Failed to set password');
          return false;
        }

        // Update local state
        setShares((prev) =>
          prev.map((share) =>
            share.shareToken === shareToken ? { ...share, hasPassword: true } : share
          )
        );

        toast.success('Password set');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set password';
        toast.error(message);
        console.error('[useShareManagement] setPassword error:', err);
        return false;
      }
    },
    []
  );

  // Remove password via API
  const removePassword = useCallback(
    async (shareToken: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/shares/${shareToken}/password`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          toast.error(data.error || 'Failed to remove password');
          return false;
        }

        // Update local state
        setShares((prev) =>
          prev.map((share) =>
            share.shareToken === shareToken ? { ...share, hasPassword: false } : share
          )
        );

        toast.success('Password removed');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove password';
        toast.error(message);
        console.error('[useShareManagement] removePassword error:', err);
        return false;
      }
    },
    []
  );

  return {
    shares,
    isLoading,
    error,
    refresh,
    createNewShare,
    updateShareSettings,
    removeShare,
    setPassword,
    removePassword,
    getShareUrl,
  };
}
