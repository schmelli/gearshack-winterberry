/**
 * useAdminDashboard Hook
 *
 * Feature: Admin Section Enhancement
 *
 * Admin hook for fetching dashboard statistics from Supabase.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  AdminDashboardStats,
  VercelAnalytics,
  SentryMetrics,
  UseAdminDashboardReturn,
} from '@/types/admin';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get date N days ago
 */
function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAdminDashboard(): UseAdminDashboardReturn {
  const supabase = useMemo(() => createClient(), []);

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [vercelAnalytics] = useState<VercelAnalytics | null>(null);
  const [sentryMetrics] = useState<SentryMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sevenDaysAgo = getDaysAgo(7);
      const thirtyDaysAgo = getDaysAgo(30);

      // Parallel queries for all stats - using COUNT queries only (no row fetching)
      // All queries use { count: 'exact', head: true } for optimal performance
      const [
        // User stats
        totalUsersResult,
        newUsers7dResult,
        newUsers30dResult,
        adminsResult,
        trailblazersResult,
        vipsResult,
        merchantsResult,
        suspendedResult,
        bannedResult,
        // Content stats
        gearItemsResult,
        loadoutsResult,
        wikiPagesResult,
        bulletinPostsResult,
        shakedownsResult,
        // New content stats (7 days)
        newGear7dResult,
        newLoadouts7dResult,
        newPosts7dResult,
      ] = await Promise.all([
        // Total users
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        // New users (7 days)
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
        // New users (30 days)
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo),
        // Admins
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin'),
        // Trailblazers
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('subscription_tier', 'trailblazer'),
        // VIPs (from vip_accounts table)
        supabase
          .from('vip_accounts')
          .select('id', { count: 'exact', head: true }),
        // Merchants
        supabase
          .from('merchants')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved'),
        // Suspended users
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('account_status', 'suspended'),
        // Banned users
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('account_status', 'banned'),
        // Total gear items
        supabase
          .from('gear_items')
          .select('id', { count: 'exact', head: true }),
        // Total loadouts
        supabase.from('loadouts').select('id', { count: 'exact', head: true }),
        // Total wiki pages
        supabase
          .from('wiki_pages')
          .select('id', { count: 'exact', head: true }),
        // Total bulletin posts
        supabase
          .from('bulletin_posts')
          .select('id', { count: 'exact', head: true }),
        // Total shakedowns
        supabase.from('shakedowns').select('id', { count: 'exact', head: true }),
        // New gear items (7 days)
        supabase
          .from('gear_items')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
        // New loadouts (7 days)
        supabase
          .from('loadouts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
        // New posts (7 days)
        supabase
          .from('bulletin_posts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
      ]);

      // Extract counts
      const totalUsers = totalUsersResult.count || 0;
      const gearItems = gearItemsResult.count || 0;
      const loadouts = loadoutsResult.count || 0;

      // Calculate averages per total user (avoids fetching rows for distinct count)
      // Note: This gives average across all users, not just users with items
      const avgGearPerUser = totalUsers > 0 ? gearItems / totalUsers : 0;
      const avgLoadoutsPerUser = totalUsers > 0 ? loadouts / totalUsers : 0;

      // Estimate active users from recent activity
      // Note: A proper implementation would track last_login in profiles
      const activeUsers7d = Math.max(
        newUsers7dResult.count || 0,
        newGear7dResult.count || 0,
        newLoadouts7dResult.count || 0
      );

      setStats({
        // User stats
        totalUsers,
        newUsers7d: newUsers7dResult.count || 0,
        newUsers30d: newUsers30dResult.count || 0,
        activeUsers7d,
        adminCount: adminsResult.count || 0,
        trailblazerCount: trailblazersResult.count || 0,
        vipCount: vipsResult.count || 0,
        merchantCount: merchantsResult.count || 0,
        suspendedCount: suspendedResult.count || 0,
        bannedCount: bannedResult.count || 0,
        // Content stats
        totalGearItems: gearItems,
        totalLoadouts: loadouts,
        totalWikiPages: wikiPagesResult.count || 0,
        totalBulletinPosts: bulletinPostsResult.count || 0,
        totalShakedowns: shakedownsResult.count || 0,
        // Recent activity
        newGearItems7d: newGear7dResult.count || 0,
        newLoadouts7d: newLoadouts7dResult.count || 0,
        newPosts7d: newPosts7dResult.count || 0,
        // Averages
        avgGearPerUser: Math.round(avgGearPerUser * 10) / 10,
        avgLoadoutsPerUser: Math.round(avgLoadoutsPerUser * 10) / 10,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch dashboard stats';
      setError(message);
      console.error('[useAdminDashboard] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let isCancelled = false;

    const loadStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await fetchStats();
      } catch {
        // Error already handled in fetchStats
      }
    };

    loadStats();

    return () => {
      isCancelled = true;
      // Note: isCancelled is set but individual state updates in fetchStats
      // may still occur if the Promise.all completes. This is acceptable
      // as React handles state updates on unmounted components gracefully.
    };
  }, [fetchStats]);

  return {
    stats,
    vercelAnalytics,
    sentryMetrics,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
