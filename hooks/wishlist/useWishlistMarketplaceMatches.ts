/**
 * Hook for finding marketplace matches for wishlist items
 *
 * Purpose: Connect wishlist items with available marketplace listings
 * Uses fuzzy matching to find similar items offered by other users
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { findMarketplaceMatches, type WishlistMarketplaceMatch } from '@/lib/supabase/wishlist-marketplace-matching';

export interface UseWishlistMarketplaceMatchesResult {
  matches: WishlistMarketplaceMatch[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Find marketplace matches for a wishlist item
 *
 * @param itemName - Name of the wishlist item
 * @param itemBrand - Brand of the wishlist item (optional)
 * @returns Marketplace matches, loading state, and refresh function
 *
 * @example
 * const { matches, isLoading } = useWishlistMarketplaceMatches('X-Dome 2', 'MSR');
 *
 * if (matches.length > 0) {
 *   console.log(`Found ${matches.length} marketplace matches!`);
 * }
 */
export function useWishlistMarketplaceMatches(
  itemName: string,
  itemBrand: string | null
): UseWishlistMarketplaceMatchesResult {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [matches, setMatches] = useState<WishlistMarketplaceMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMatches = useCallback(async () => {
    if (!user || !itemName) {
      setMatches([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const results = await findMarketplaceMatches(
        supabase,
        itemName,
        itemBrand,
        user.id
      );

      setMatches(results);
    } catch (err) {
      console.error('Failed to load marketplace matches:', err);
      setError(err as Error);
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user, itemName, itemBrand]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return {
    matches,
    isLoading,
    error,
    refresh: loadMatches,
  };
}
