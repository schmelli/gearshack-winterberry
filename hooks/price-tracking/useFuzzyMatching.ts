/**
 * Custom hook for fuzzy match confirmation flow
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

'use client';

import { useState } from 'react';
import { confirmProductMatch } from '@/lib/supabase/price-tracking-queries';
import type { FuzzyMatch, ConfirmMatchRequest } from '@/types/price-tracking';

interface UseFuzzyMatchingResult {
  isConfirming: boolean;
  error: Error | null;
  confirmMatch: (request: ConfirmMatchRequest) => Promise<void>;
  skipMatch: () => void;
}

export function useFuzzyMatching(): UseFuzzyMatchingResult {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const confirmMatch = async (request: ConfirmMatchRequest) => {
    try {
      setIsConfirming(true);
      setError(null);
      await confirmProductMatch(request);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsConfirming(false);
    }
  };

  const skipMatch = () => {
    // User chose to skip confirmation - they'll manually search later
    setError(null);
  };

  return {
    isConfirming,
    error,
    confirmMatch,
    skipMatch,
  };
}
