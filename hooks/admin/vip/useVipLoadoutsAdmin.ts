/**
 * useVipLoadoutsAdmin Hook (NEW VERSION - Feature 052)
 *
 * Admin hook for managing VIP loadouts in the unified user system.
 * VIPs are now regular users with account_type='vip', owning regular loadouts
 * marked with is_vip_loadout=true.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

// =============================================================================
// Types
// =============================================================================

export interface VipLoadoutSummary {
  id: string;
  userId: string; // VIP user ID
  name: string;
  description: string | null;
  sourceAttribution: {
    type: string;
    url?: string;
    checkedAt?: string;
  } | null;
  activityTypes: string[] | null;
  seasons: string[] | null;
  isVipLoadout: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  totalWeightGrams: number;
  itemCount: number;
  // VIP profile info
  vipDisplayName: string;
  vipAvatarUrl: string | null;
}

interface UseVipLoadoutsAdminState {
  status: 'idle' | 'loading' | 'success' | 'error';
  loadouts: VipLoadoutSummary[];
  error: string | null;
}

interface UseVipLoadoutsAdminReturn extends UseVipLoadoutsAdminState {
  refetch: () => Promise<void>;
  createLoadout: (userId: string, data: CreateLoadoutData) => Promise<string>;
  updateLoadout: (id: string, data: Partial<CreateLoadoutData>) => Promise<void>;
  deleteLoadout: (id: string) => Promise<void>;
  publishLoadout: (id: string) => Promise<void>;
  unpublishLoadout: (id: string) => Promise<void>;
}

interface CreateLoadoutData {
  name: string;
  sourceUrl?: string;
  description?: string;
  activityTypes?: string[];
  seasons?: string[];
}

// =============================================================================
// Hook
// =============================================================================

export function useVipLoadoutsAdmin(userId?: string): UseVipLoadoutsAdminReturn {
  const [state, setState] = useState<UseVipLoadoutsAdminState>({
    status: 'idle',
    loadouts: [],
    error: null,
  });

  const supabase = createClient();

  // Fetch all VIP loadouts or loadouts for a specific VIP user
  const fetchLoadouts = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      // If userId provided, just fetch loadouts for that user
      // Otherwise, first get VIP user IDs then fetch their loadouts
      let targetUserIds: string[] = [];

      if (userId) {
        targetUserIds = [userId];
      } else {
        // Get all VIP user IDs first
        const { data: vipProfiles, error: vipError } = await supabase
          .from('profiles')
          .select('id')
          .eq('account_type', 'vip');

        if (vipError) throw vipError;
        targetUserIds = (vipProfiles || []).map((p) => p.id);
      }

      if (targetUserIds.length === 0) {
        setState({ status: 'success', loadouts: [], error: null });
        return;
      }

      // Query loadouts for VIP users
      const { data, error } = await supabase
        .from('loadouts')
        .select(`
          *,
          profiles(
            id,
            display_name,
            avatar_url,
            account_type
          ),
          loadout_items(
            count
          )
        `)
        .in('user_id', targetUserIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate summary statistics for each loadout
      const loadoutsWithStats: VipLoadoutSummary[] = await Promise.all(
        (data || []).map(async (loadout: any) => {
          // Get total weight from loadout items
          const { data: items } = await supabase
            .from('loadout_items')
            .select(`
              quantity,
              gear_items(weight_grams)
            `)
            .eq('loadout_id', loadout.id);

          const totalWeightGrams = (items || []).reduce((sum, item: any) => {
            const weight = item.gear_items?.weight_grams || 0;
            const quantity = item.quantity || 1;
            return sum + weight * quantity;
          }, 0);

          // Get item count
          const itemCount = Array.isArray(loadout.loadout_items)
            ? (loadout.loadout_items[0]?.count as number) || 0
            : 0;

          return {
            id: loadout.id,
            userId: loadout.user_id,
            name: loadout.name,
            description: loadout.description,
            sourceAttribution: loadout.source_attribution,
            activityTypes: loadout.activity_types,
            seasons: loadout.seasons,
            isVipLoadout: loadout.is_vip_loadout,
            createdAt: loadout.created_at,
            updatedAt: loadout.updated_at,
            totalWeightGrams,
            itemCount,
            vipDisplayName: loadout.profiles?.display_name || 'Unknown VIP',
            vipAvatarUrl: loadout.profiles?.avatar_url ?? null,
          };
        })
      );

      setState({
        status: 'success',
        loadouts: loadoutsWithStats,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load VIP loadouts';
      console.error('Error loading VIP loadouts:', err);
      setState({
        status: 'error',
        loadouts: [],
        error: message,
      });
    }
  }, [userId, supabase]);

  // Create new VIP loadout
  const createLoadout = useCallback(
    async (userId: string, data: CreateLoadoutData): Promise<string> => {
      // Build source attribution object
      const sourceAttribution = data.sourceUrl
        ? {
            type: 'vip_curated',
            url: data.sourceUrl,
            checkedAt: new Date().toISOString(),
          }
        : null;

      const insertData: Database['public']['Tables']['loadouts']['Insert'] = {
        user_id: userId,
        name: data.name,
        description: data.description || null,
        activity_types: (data.activityTypes as any) || null,
        seasons: (data.seasons as any) || null,
        is_vip_loadout: false, // Start as draft (unpublished)
        source_attribution: sourceAttribution as any, // JSONB type
      };

      const { data: loadout, error } = await supabase
        .from('loadouts')
        .insert(insertData)
        .select()
        .single();

      if (error) throw new Error(`Failed to create loadout: ${error.message}`);

      await fetchLoadouts();
      return loadout.id;
    },
    [supabase, fetchLoadouts]
  );

  // Update VIP loadout
  const updateLoadout = useCallback(
    async (id: string, data: Partial<CreateLoadoutData>) => {
      const updateData: Record<string, unknown> = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.activityTypes !== undefined) updateData.activity_types = data.activityTypes || null;
      if (data.seasons !== undefined) updateData.seasons = data.seasons || null;

      // Update source attribution if sourceUrl provided
      if (data.sourceUrl !== undefined) {
        updateData.source_attribution = data.sourceUrl
          ? {
              type: 'vip_curated',
              url: data.sourceUrl,
              checkedAt: new Date().toISOString(),
            }
          : null;
      }

      const { error } = await supabase
        .from('loadouts')
        .update(updateData)
        .eq('id', id);

      if (error) throw new Error(`Failed to update loadout: ${error.message}`);

      await fetchLoadouts();
    },
    [supabase, fetchLoadouts]
  );

  // Delete VIP loadout
  const deleteLoadout = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('loadouts').delete().eq('id', id);

      if (error) throw new Error(`Failed to delete loadout: ${error.message}`);

      await fetchLoadouts();
    },
    [supabase, fetchLoadouts]
  );

  // Publish loadout (make visible to all users)
  const publishLoadout = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('loadouts')
        .update({ is_vip_loadout: true })
        .eq('id', id);

      if (error) throw new Error(`Failed to publish loadout: ${error.message}`);

      await fetchLoadouts();
    },
    [supabase, fetchLoadouts]
  );

  // Unpublish loadout (hide from public)
  const unpublishLoadout = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('loadouts')
        .update({ is_vip_loadout: false })
        .eq('id', id);

      if (error) throw new Error(`Failed to unpublish loadout: ${error.message}`);

      await fetchLoadouts();
    },
    [supabase, fetchLoadouts]
  );

  // Fetch on mount or when userId changes
  useEffect(() => {
    fetchLoadouts();
  }, [fetchLoadouts]);

  return {
    ...state,
    refetch: fetchLoadouts,
    createLoadout,
    updateLoadout,
    deleteLoadout,
    publishLoadout,
    unpublishLoadout,
  };
}

export default useVipLoadoutsAdmin;
