/**
 * useGearGraphStatus Hook
 *
 * Encapsulates all business logic for the GearGraph status page:
 * - Fetching health and stats data from the GearGraph API
 * - Managing loading, error, and mounted states
 * - Auto-refresh on mount with cleanup to prevent state updates after unmount
 *
 * Feature: Code Quality Review
 * Extracts all useEffect and state logic from the admin GearGraph status page
 * following Feature-Sliced Light architecture (no useEffect in UI components).
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// =============================================================================
// Constants
// =============================================================================

/** Use local API proxy to avoid CORS issues */
const API_BASE_URL = '/api/geargraph';

// =============================================================================
// Types
// =============================================================================

export interface HealthMetrics {
  totalNodes: number;
  totalRelationships: number;
  orphanCount: number;
  duplicatesDetected: number;
  mergesExecuted24h: number;
  deletions24h: number;
}

export interface HealthResponse {
  status: 'ok' | 'healthy' | 'degraded' | 'error';
  statusReasons?: string[];
  memgraphConnected?: boolean;
  workflowsRunning?: number;
  pendingApprovals?: number;
  lastHygieneRun?: string;
  lastDeduplicationRun?: string;
  metrics?: HealthMetrics;
  timestamp?: string;
  version?: string;
  [key: string]: unknown;
}

export interface StatsResponse {
  status?: string;
  statusReasons?: string[];
  memgraphConnected?: boolean;
  workflowsRunning?: number;
  pendingApprovals?: number;
  lastHygieneRun?: string;
  lastDeduplicationRun?: string;
  metrics?: HealthMetrics;
  timestamp?: string;
  nodes?: number;
  edges?: number;
  categories?: number;
  brands?: number;
  products?: number;
  [key: string]: unknown;
}

export interface UseGearGraphStatusReturn {
  /** Health data from the /health endpoint */
  health: HealthResponse | null;
  /** Stats data from the /stats endpoint */
  stats: StatsResponse | null;
  /** Error message from the health endpoint */
  healthError: string | null;
  /** Error message from the stats endpoint */
  statsError: string | null;
  /** Whether data is currently being fetched */
  loading: boolean;
  /** Timestamp of the last successful data fetch */
  lastUpdated: Date | null;
  /** Manually trigger a data refresh */
  fetchData: () => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Fetches and manages GearGraph health and stats data.
 * Automatically fetches on mount and provides a manual refresh function.
 *
 * @example
 * const { health, stats, healthError, statsError, loading, lastUpdated, fetchData } =
 *   useGearGraphStatus();
 */
export function useGearGraphStatus(): UseGearGraphStatusReturn {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setHealthError(null);
    setStatsError(null);

    // Fetch health
    try {
      const healthRes = await fetch(`${API_BASE_URL}/health`, {
        cache: 'no-store',
      });
      if (!healthRes.ok) {
        throw new Error(`HTTP ${healthRes.status}: ${healthRes.statusText}`);
      }
      const healthData = await healthRes.json();
      if (isMountedRef.current) {
        setHealth(healthData);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setHealthError(err instanceof Error ? err.message : 'Failed to fetch health');
        setHealth(null);
      }
    }

    // Fetch stats
    try {
      const statsRes = await fetch(`${API_BASE_URL}/stats`, {
        cache: 'no-store',
      });
      if (!statsRes.ok) {
        throw new Error(`HTTP ${statsRes.status}: ${statsRes.statusText}`);
      }
      const statsData = await statsRes.json();
      if (isMountedRef.current) {
        setStats(statsData);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setStatsError(err instanceof Error ? err.message : 'Failed to fetch stats');
        setStats(null);
      }
    }

    if (isMountedRef.current) {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  // Fetch on mount, cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  return {
    health,
    stats,
    healthError,
    statsError,
    loading,
    lastUpdated,
    fetchData,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format an ISO date string to a relative time string using the browser's locale.
 */
export function formatRelativeTime(isoString: string, locale?: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffMins < 1) return rtf.format(-diffSecs, 'second');
  if (diffMins < 60) return rtf.format(-diffMins, 'minute');
  if (diffHours < 24) return rtf.format(-diffHours, 'hour');
  return rtf.format(-diffDays, 'day');
}

/**
 * Format an ISO date string to a localized date/time string using the browser's locale.
 */
export function formatDateTime(isoString: string, locale?: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
