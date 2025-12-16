/**
 * useRateLimiting Hook
 * Feature 050: AI Assistant - T021
 *
 * Manages AI assistant rate limiting state (30 messages per hour).
 * Displays countdown timer and prevents sending when limit exceeded.
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RateLimitState {
  remaining: number; // Messages remaining in current hour
  total: number; // Total limit (30)
  resetsAt: Date | null; // When the limit resets
  isLimited: boolean; // True if no messages remaining
  timeUntilReset: string; // Human-readable countdown (e.g., "45 minutes")
}

interface UseRateLimitingResult extends RateLimitState {
  isRateLimited: boolean; // Alias for isLimited for backwards compatibility
  remainingTime: number; // Seconds until reset
  checkRateLimit: () => Promise<boolean>; // Returns true if message can be sent
  refreshRateLimit: () => Promise<void>; // Manually refresh the state
}

/**
 * Hook for managing AI assistant rate limiting
 *
 * @param userId - Current user ID
 * @returns Rate limit state and check function
 */
export function useRateLimiting(userId: string | null): UseRateLimitingResult {
  const [state, setState] = useState<RateLimitState>({
    remaining: 30,
    total: 30,
    resetsAt: null,
    isLimited: false,
    timeUntilReset: '',
  });

  const supabase = createClient();

  // Calculate human-readable time until reset
  const calculateTimeUntilReset = useCallback((resetsAt: Date): string => {
    const now = new Date();
    const diff = resetsAt.getTime() - now.getTime();

    if (diff <= 0) return 'Now';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }

    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }, []);

  // Fetch current rate limit status
  const refreshRateLimit = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.rpc('check_ai_rate_limit', {
        p_user_id: userId,
        p_endpoint: '/api/chat',
        p_limit: 30,
        p_window_hours: 1,
      });

      if (error) {
        console.error('Error checking rate limit:', error);
        return;
      }

      if (data) {
        // Type assertion for RPC JSON response
        const rateLimitData = data as any;
        const resetsAt = new Date(rateLimitData.resets_at);
        const remaining = rateLimitData.limit - rateLimitData.count;

        setState({
          remaining: Math.max(0, remaining),
          total: rateLimitData.limit,
          resetsAt,
          isLimited: rateLimitData.exceeded,
          timeUntilReset: calculateTimeUntilReset(resetsAt),
        });
      }
    } catch (err) {
      console.error('Failed to check rate limit:', err);
    }
  }, [userId, supabase, calculateTimeUntilReset]);

  // Check if user can send a message
  const checkRateLimit = useCallback(async (): Promise<boolean> => {
    await refreshRateLimit();
    return !state.isLimited && state.remaining > 0;
  }, [refreshRateLimit, state.isLimited, state.remaining]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (!userId) return;

    // Fetch immediately
    refreshRateLimit();

    // Refresh every 30 seconds to update countdown
    const interval = setInterval(() => {
      refreshRateLimit();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, refreshRateLimit]);

  // Update countdown timer every second
  useEffect(() => {
    if (!state.resetsAt) return;

    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        timeUntilReset: calculateTimeUntilReset(prev.resetsAt!),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.resetsAt, calculateTimeUntilReset]);

  // Calculate seconds until reset
  const remainingTime = state.resetsAt
    ? Math.max(0, Math.floor((state.resetsAt.getTime() - Date.now()) / 1000))
    : 0;

  return {
    ...state,
    isRateLimited: state.isLimited, // Alias for backwards compatibility
    remainingTime,
    checkRateLimit,
    refreshRateLimit,
  };
}
