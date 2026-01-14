/**
 * useAdminUsers Hook
 *
 * Feature: Admin Section Enhancement
 *
 * Admin hook for user management including listing, filtering,
 * role/tier changes, and suspension/ban functionality.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  AdminUserView,
  UserFilter,
  UserSort,
  ChangeRoleInput,
  ChangeTierInput,
  SuspendUserInput,
  BanUserInput,
  UseAdminUsersReturn,
  SuspensionDuration,
} from '@/types/admin';

// =============================================================================
// Constants
// =============================================================================

const PAGE_SIZE = 20;

const DURATION_MS: Record<SuspensionDuration, number | null> = {
  indefinite: null,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAdminUsers(): UseAdminUsersReturn {
  const supabase = useMemo(() => createClient(), []);

  // State
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>({});
  const [sort, setSort] = useState<UserSort>({
    field: 'created_at',
    direction: 'desc',
  });

  // Derived state
  const hasMore = users.length < total;

  // ---------------------------------------------------------------------------
  // Fetch Users
  // ---------------------------------------------------------------------------

  const fetchUsers = useCallback(
    async (reset = true) => {
      setIsLoading(true);
      setError(null);
      const currentOffset = reset ? 0 : offset;

      try {
        // Build query
        let query = supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .order(sort.field, { ascending: sort.direction === 'asc' })
          .range(currentOffset, currentOffset + PAGE_SIZE - 1);

        // Apply search
        if (searchQuery.trim()) {
          query = query.or(
            `display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,trail_name.ilike.%${searchQuery}%`
          );
        }

        // Apply filters
        if (filter.role && filter.role !== 'all') {
          query = query.eq('role', filter.role);
        }
        if (filter.tier && filter.tier !== 'all') {
          query = query.eq('subscription_tier', filter.tier);
        }
        if (filter.status && filter.status !== 'all') {
          query = query.eq('account_status', filter.status);
        }
        if (filter.accountType && filter.accountType !== 'all') {
          query = query.eq('account_type', filter.accountType);
        }

        const { data, error: fetchError, count } = await query;

        if (fetchError) throw fetchError;

        // Get activity counts for each user
        const usersWithStats = await Promise.all(
          (data || []).map(async (user) => {
            const [gearCount, loadoutCount] = await Promise.all([
              supabase
                .from('gear_items')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id),
              supabase
                .from('loadouts')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id),
            ]);

            // Cast to unknown record to handle fields that may not exist in DB yet
            const userData = user as Record<string, unknown>;
            return {
              ...user,
              // These fields are added by migration and may not exist yet
              account_status: (userData.account_status as string) || 'active',
              suspended_at: (userData.suspended_at as string | null) ?? null,
              suspended_until: (userData.suspended_until as string | null) ?? null,
              suspension_reason: (userData.suspension_reason as string | null) ?? null,
              suspended_by: (userData.suspended_by as string | null) ?? null,
              gear_items_count: gearCount.count || 0,
              loadouts_count: loadoutCount.count || 0,
            } as AdminUserView;
          })
        );

        if (reset) {
          setUsers(usersWithStats);
          setOffset(PAGE_SIZE);
        } else {
          setUsers((prev) => [...prev, ...usersWithStats]);
          setOffset((prev) => prev + PAGE_SIZE);
        }
        setTotal(count || 0);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch users';
        setError(message);
        console.error('[useAdminUsers] Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, searchQuery, filter, sort, offset]
  );

  // ---------------------------------------------------------------------------
  // Log Admin Action
  // ---------------------------------------------------------------------------

  const logAction = useCallback(
    async (
      actionType: string,
      targetUserId: string,
      oldValue: Record<string, unknown> | null,
      newValue: Record<string, unknown> | null,
      reason?: string
    ) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('admin_activity_logs').insert({
          admin_id: user.id,
          action_type: actionType,
          target_user_id: targetUserId,
          old_value: oldValue,
          new_value: newValue,
          reason: reason || null,
        });
      } catch (err) {
        console.error('[useAdminUsers] Failed to log action:', err);
      }
    },
    [supabase]
  );

  // ---------------------------------------------------------------------------
  // Change Role
  // ---------------------------------------------------------------------------

  const changeRole = useCallback(
    async (input: ChangeRoleInput) => {
      const { userId, newRole, reason } = input;

      try {
        // Get current role
        const { data: current, error: fetchErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (fetchErr) throw fetchErr;

        // Update role
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', userId);

        if (updateErr) throw updateErr;

        // Log action
        await logAction(
          'role_change',
          userId,
          { role: current?.role },
          { role: newRole },
          reason
        );

        // Optimistic update
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to change role';
        throw new Error(message);
      }
    },
    [supabase, logAction]
  );

  // ---------------------------------------------------------------------------
  // Change Tier
  // ---------------------------------------------------------------------------

  const changeTier = useCallback(
    async (input: ChangeTierInput) => {
      const { userId, newTier, reason } = input;

      try {
        const { data: current, error: fetchErr } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', userId)
          .single();

        if (fetchErr) throw fetchErr;

        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ subscription_tier: newTier })
          .eq('id', userId);

        if (updateErr) throw updateErr;

        await logAction(
          'tier_change',
          userId,
          { subscription_tier: current?.subscription_tier },
          { subscription_tier: newTier },
          reason
        );

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, subscription_tier: newTier } : u
          )
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to change tier';
        throw new Error(message);
      }
    },
    [supabase, logAction]
  );

  // ---------------------------------------------------------------------------
  // Suspend User
  // ---------------------------------------------------------------------------

  const suspendUser = useCallback(
    async (input: SuspendUserInput) => {
      const { userId, reason, duration } = input;

      try {
        const {
          data: { user: admin },
        } = await supabase.auth.getUser();
        if (!admin) throw new Error('Not authenticated');

        const now = new Date();
        const durationMs = DURATION_MS[duration];
        const suspendedUntil = durationMs
          ? new Date(now.getTime() + durationMs).toISOString()
          : null;

        // Use type assertion for fields added by migration
         
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            account_status: 'suspended',
            suspended_at: now.toISOString(),
            suspended_until: suspendedUntil,
            suspension_reason: reason,
            suspended_by: admin.id,
          } as Record<string, unknown>)
          .eq('id', userId);

        if (updateErr) throw updateErr;

        await logAction(
          'suspend',
          userId,
          { account_status: 'active' },
          {
            account_status: 'suspended',
            suspended_until: suspendedUntil,
            duration,
          },
          reason
        );

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  account_status: 'suspended' as const,
                  suspended_at: now.toISOString(),
                  suspended_until: suspendedUntil,
                  suspension_reason: reason,
                }
              : u
          )
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to suspend user';
        throw new Error(message);
      }
    },
    [supabase, logAction]
  );

  // ---------------------------------------------------------------------------
  // Unsuspend User
  // ---------------------------------------------------------------------------

  const unsuspendUser = useCallback(
    async (userId: string, reason?: string) => {
      try {
        // Use type assertion for fields added by migration
         
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            account_status: 'active',
            suspended_at: null,
            suspended_until: null,
            suspension_reason: null,
            suspended_by: null,
          } as Record<string, unknown>)
          .eq('id', userId);

        if (updateErr) throw updateErr;

        await logAction(
          'unsuspend',
          userId,
          { account_status: 'suspended' },
          { account_status: 'active' },
          reason
        );

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  account_status: 'active' as const,
                  suspended_at: null,
                  suspended_until: null,
                  suspension_reason: null,
                }
              : u
          )
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to unsuspend user';
        throw new Error(message);
      }
    },
    [supabase, logAction]
  );

  // ---------------------------------------------------------------------------
  // Ban User
  // ---------------------------------------------------------------------------

  const banUser = useCallback(
    async (input: BanUserInput) => {
      const { userId, reason } = input;

      try {
        const {
          data: { user: admin },
        } = await supabase.auth.getUser();
        if (!admin) throw new Error('Not authenticated');

        // Use type assertion since account_status is added by migration
        const { data: current, error: fetchErr } = await supabase
          .from('profiles')
          .select('account_status')
          .eq('id', userId)
          .single();

        if (fetchErr) throw fetchErr;

        // Use type assertion for fields added by migration
         
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            account_status: 'banned',
            suspended_at: new Date().toISOString(),
            suspended_until: null,
            suspension_reason: reason,
            suspended_by: admin.id,
          } as Record<string, unknown>)
          .eq('id', userId);

        if (updateErr) throw updateErr;

        await logAction(
          'ban',
          userId,
          { account_status: (current as Record<string, unknown>)?.account_status },
          { account_status: 'banned' },
          reason
        );

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, account_status: 'banned' as const, suspension_reason: reason }
              : u
          )
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to ban user';
        throw new Error(message);
      }
    },
    [supabase, logAction]
  );

  // ---------------------------------------------------------------------------
  // Unban User
  // ---------------------------------------------------------------------------

  const unbanUser = useCallback(
    async (userId: string, reason?: string) => {
      try {
        // Use type assertion for fields added by migration
         
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            account_status: 'active',
            suspended_at: null,
            suspended_until: null,
            suspension_reason: null,
            suspended_by: null,
          } as Record<string, unknown>)
          .eq('id', userId);

        if (updateErr) throw updateErr;

        await logAction(
          'unban',
          userId,
          { account_status: 'banned' },
          { account_status: 'active' },
          reason
        );

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  account_status: 'active' as const,
                  suspended_at: null,
                  suspension_reason: null,
                }
              : u
          )
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to unban user';
        throw new Error(message);
      }
    },
    [supabase, logAction]
  );

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchUsers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filter, sort]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    users,
    isLoading,
    error,
    total,
    hasMore,
    searchQuery,
    filter,
    sort,
    search: setSearchQuery,
    setFilter,
    setSort,
    loadMore: () => fetchUsers(false),
    refetch: () => fetchUsers(true),
    changeRole,
    changeTier,
    suspendUser,
    unsuspendUser,
    banUser,
    unbanUser,
  };
}
