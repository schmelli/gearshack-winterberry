/**
 * useWeightReports Hook
 * Feature: community-verified-weights
 *
 * Business logic hook for fetching and submitting community weight reports.
 * Follows Feature-Sliced Light architecture — all logic here, UI stateless.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getWeightReports,
  submitWeightReport,
} from '@/lib/supabase/weight-report-queries';
import type {
  WeightReport,
  WeightReportStats,
  UserWeightReport,
  UseWeightReportsReturn,
} from '@/types/weight-report';

/**
 * Hook for managing community weight reports for a catalog product.
 *
 * @param catalogProductId - The UUID of the catalog product. Pass null to skip fetching.
 * @returns Weight reports, stats, user's report, and actions.
 */
export function useWeightReports(
  catalogProductId: string | null
): UseWeightReportsReturn {
  const [reports, setReports] = useState<WeightReport[]>([]);
  const [stats, setStats] = useState<WeightReportStats | null>(null);
  const [userReport, setUserReport] = useState<UserWeightReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  // Fetch reports
  useEffect(() => {
    if (!catalogProductId) {
      setReports([]);
      setStats(null);
      setUserReport(null);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getWeightReports(supabase, catalogProductId);
        if (!cancelled) {
          setReports(data.reports);
          setStats(data.stats);
          setUserReport(data.userReport);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load weight reports';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [catalogProductId, fetchKey]);

  // Submit a weight report
  const submitReport = useCallback(
    async (weightGrams: number, context?: string) => {
      if (!catalogProductId) return;

      setIsSubmitting(true);
      setError(null);

      try {
        const supabase = createClient();
        const result = await submitWeightReport(
          supabase,
          catalogProductId,
          weightGrams,
          context
        );

        // Update local stats optimistically
        setStats((prev) =>
          prev
            ? {
                ...prev,
                reportCount: result.reportCount,
                communityWeightGrams: result.communityWeightGrams,
                isVerified: result.isVerified,
              }
            : null
        );

        // Refresh all data to get the full updated list
        setFetchKey((k) => k + 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit weight report';
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [catalogProductId]
  );

  // Refresh function
  const refresh = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return {
    reports,
    stats,
    userReport,
    isLoading,
    error,
    submitReport,
    isSubmitting,
    refresh,
  };
}
