/**
 * useContributionsDashboard Hook
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * Provides state management and data fetching for the admin
 * contributions dashboard.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  ContributionStats,
  MissingBrand,
  MissingBrandStatus,
  MissingBrandsResponse,
} from '@/types/contributions';

// =============================================================================
// Types
// =============================================================================

export interface UseContributionsDashboardReturn {
  /** Contribution statistics */
  stats: ContributionStats | null;
  /** Whether stats are loading */
  isLoadingStats: boolean;
  /** Stats fetch error */
  statsError: string | null;
  /** Refresh stats */
  refreshStats: () => Promise<void>;

  /** Missing brands list */
  missingBrands: MissingBrand[];
  /** Total missing brands count */
  missingBrandsTotal: number;
  /** Current page */
  missingBrandsPage: number;
  /** Total pages */
  missingBrandsTotalPages: number;
  /** Whether missing brands are loading */
  isLoadingMissingBrands: boolean;
  /** Missing brands fetch error */
  missingBrandsError: string | null;
  /** Current status filter */
  statusFilter: string;
  /** Current search query */
  searchQuery: string;
  /** Set status filter */
  setStatusFilter: (status: string) => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Go to page */
  goToPage: (page: number) => void;
  /** Update brand status */
  updateBrandStatus: (id: string, status: string) => Promise<boolean>;
  /** Whether a status update is in progress */
  isUpdatingStatus: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useContributionsDashboard(): UseContributionsDashboardReturn {
  // Stats state
  const [stats, setStats] = useState<ContributionStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Missing brands state
  const [missingBrands, setMissingBrands] = useState<MissingBrand[]>([]);
  const [missingBrandsTotal, setMissingBrandsTotal] = useState(0);
  const [missingBrandsPage, setMissingBrandsPage] = useState(1);
  const [missingBrandsTotalPages, setMissingBrandsTotalPages] = useState(1);
  const [isLoadingMissingBrands, setIsLoadingMissingBrands] = useState(true);
  const [missingBrandsError, setMissingBrandsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    setStatsError(null);

    try {
      const response = await fetch('/api/admin/contributions/stats');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch stats';
      setStatsError(message);
      console.error('[ContributionsDashboard] Stats fetch error:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch missing brands
  const fetchMissingBrands = useCallback(async (page: number) => {
    setIsLoadingMissingBrands(true);
    setMissingBrandsError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        status: statusFilter,
      });

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await fetch(`/api/admin/contributions/missing-brands?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch missing brands');
      }

      const data: MissingBrandsResponse = await response.json();
      setMissingBrands(data.brands);
      setMissingBrandsTotal(data.total);
      setMissingBrandsPage(data.page);
      setMissingBrandsTotalPages(data.totalPages);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch missing brands';
      setMissingBrandsError(message);
      console.error('[ContributionsDashboard] Missing brands fetch error:', error);
    } finally {
      setIsLoadingMissingBrands(false);
    }
  }, [statusFilter, searchQuery]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch missing brands when filters change
  useEffect(() => {
    fetchMissingBrands(1);
  }, [statusFilter, searchQuery, fetchMissingBrands]);

  // Go to page
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= missingBrandsTotalPages) {
      fetchMissingBrands(page);
    }
  }, [missingBrandsTotalPages, fetchMissingBrands]);

  // Update brand status
  const updateBrandStatus = useCallback(async (id: string, status: string): Promise<boolean> => {
    setIsUpdatingStatus(true);

    try {
      const response = await fetch('/api/admin/contributions/missing-brands', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      // Optimistic update - remove from list if status changed from pending
      if (statusFilter === 'pending' && status !== 'pending') {
        setMissingBrands((prev) => prev.filter((b) => b.id !== id));
        setMissingBrandsTotal((prev) => prev - 1);
      } else {
        // Update in place
        setMissingBrands((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: status as MissingBrandStatus } : b))
        );
      }

      // Also refresh stats since missing brands count changed
      fetchStats();

      return true;
    } catch (error) {
      console.error('[ContributionsDashboard] Update status error:', error);
      return false;
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [statusFilter, fetchStats]);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Handle search with debouncing
  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setMissingBrandsPage(1);
  }, []);

  // Handle status filter
  const handleSetStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
    setMissingBrandsPage(1);
  }, []);

  return {
    stats,
    isLoadingStats,
    statsError,
    refreshStats,
    missingBrands,
    missingBrandsTotal,
    missingBrandsPage,
    missingBrandsTotalPages,
    isLoadingMissingBrands,
    missingBrandsError,
    statusFilter,
    searchQuery,
    setStatusFilter: handleSetStatusFilter,
    setSearchQuery: handleSetSearchQuery,
    goToPage,
    updateBrandStatus,
    isUpdatingStatus,
  };
}
