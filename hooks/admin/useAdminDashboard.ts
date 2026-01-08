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

      // Parallel queries for all stats
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
        // For averages
        usersWithGearResult,
        usersWithLoadoutsResult,
      ] = await Promise.all([
        // Total users
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        // New users (7 days)
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
        // New users (30 days)
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo),
        // Admins
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin'),
        // Trailblazers
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('subscription_tier', 'trailblazer'),
        // VIPs (from vip_accounts table)
        supabase
          .from('vip_accounts')
          .select('id', { count: 'exact', head: true }),
        // Merchants
        supabase
          .from('merchants')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved'),
        // Suspended users
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_status', 'suspended'),
        // Banned users
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_status', 'banned'),
        // Total gear items
        supabase
          .from('gear_items')
          .select('*', { count: 'exact', head: true }),
        // Total loadouts
        supabase.from('loadouts').select('*', { count: 'exact', head: true }),
        // Total wiki pages
        supabase
          .from('wiki_pages')
          .select('*', { count: 'exact', head: true }),
        // Total bulletin posts
        supabase
          .from('bulletin_posts')
          .select('*', { count: 'exact', head: true }),
        // Total shakedowns
        supabase.from('shakedowns').select('*', { count: 'exact', head: true }),
        // New gear items (7 days)
        supabase
          .from('gear_items')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
        // New loadouts (7 days)
        supabase
          .from('loadouts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
        // New posts (7 days)
        supabase
          .from('bulletin_posts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
        // Users with gear (for average calculation)
        supabase.from('gear_items').select('user_id').limit(10000),
        // Users with loadouts (for average calculation)
        supabase.from('loadouts').select('user_id').limit(10000),
      ]);

      // Calculate averages
      const gearItems = gearItemsResult.count || 0;
      const loadouts = loadoutsResult.count || 0;

      // Count unique users with gear/loadouts
      const uniqueGearUsers = new Set(
        (usersWithGearResult.data || []).map((r) => r.user_id)
      ).size;
      const uniqueLoadoutUsers = new Set(
        (usersWithLoadoutsResult.data || []).map((r) => r.user_id)
      ).size;

      // Averages (per user that has at least one item)
      const avgGearPerUser =
        uniqueGearUsers > 0 ? gearItems / uniqueGearUsers : 0;
      const avgLoadoutsPerUser =
        uniqueLoadoutUsers > 0 ? loadouts / uniqueLoadoutUsers : 0;

      // Get active users (users who logged in the last 7 days)
      // This would require a last_login field - for now estimate from new content
      const activeUsers7d = Math.max(
        newUsers7dResult.count || 0,
        newGear7dResult.count || 0,
        newLoadouts7dResult.count || 0
      );

      setStats({
        // User stats
        totalUsers: totalUsersResult.count || 0,
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
    fetchStats();
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
