/**
 * Custom hook for community availability
 * Feature: 050-price-tracking (US4)
 * Date: 2025-12-17
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CommunityAvailability } from '@/types/price-tracking';

interface UseCommunityAvailabilityResult {
  availability: CommunityAvailability | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCommunityAvailability(
  gearItemId: string
): UseCommunityAvailabilityResult {
  const [availability, setAvailability] = useState<CommunityAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAvailability = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();

      // Query the community_availability view
      const { data, error: availError } = await supabase
        .from('community_availability')
        .select('*')
        .eq('gear_item_id', gearItemId)
        .maybeSingle();

      if (availError) throw availError;
      setAvailability(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (gearItemId) {
      loadAvailability();
    }
  }, [gearItemId]);

  return {
    availability,
    isLoading,
    error,
    refresh: loadAvailability,
  };
}
