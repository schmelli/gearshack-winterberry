/**
 * useSubscriptionCheck Hook
 * Feature 050: AI Assistant - T025
 *
 * Checks if the current user has Trailblazer subscription tier.
 * Required for AI Assistant access control.
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseSubscriptionCheckResult {
  isTrailblazer: boolean;
  isLoading: boolean;
  subscriptionTier: 'standard' | 'trailblazer' | null;
}

/**
 * Hook to check user's subscription tier
 *
 * @param userId - Current user ID (null if not authenticated)
 * @returns Subscription status
 */
export function useSubscriptionCheck(userId: string | null): UseSubscriptionCheckResult {
  const [subscriptionTier, setSubscriptionTier] = useState<'standard' | 'trailblazer' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!userId) {
      setSubscriptionTier(null);
      setIsLoading(false);
      return;
    }

    const fetchSubscriptionTier = async () => {
      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching subscription tier:', error);
          setSubscriptionTier('standard'); // Default to standard on error
        } else {
          setSubscriptionTier((data?.subscription_tier as 'standard' | 'trailblazer') || 'standard');
        }
      } catch (err) {
        console.error('Failed to check subscription:', err);
        setSubscriptionTier('standard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionTier();
  }, [userId, supabase]);

  return {
    isTrailblazer: subscriptionTier === 'trailblazer',
    isLoading,
    subscriptionTier,
  };
}
