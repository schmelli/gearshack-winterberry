/**
 * useVipLoadoutsAdmin Hook
 *
 * Admin hook for managing VIP loadouts with full CRUD operations.
 * Provides loadout list, create, update, delete, and publish functionality.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VipLoadout, VipLoadoutSummary } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface UseVipLoadoutsAdminState {
  status: 'idle' | 'loading' | 'success' | 'error';
  loadouts: VipLoadoutSummary[];
  error: string | null;
}

interface UseVipLoadoutsAdminReturn extends UseVipLoadoutsAdminState {
  refetch: () => Promise<void>;
  createLoadout: (vipId: string, data: CreateLoadoutData) => Promise<string>;
  updateLoadout: (id: string, data: Partial<CreateLoadoutData>) => Promise<void>;
  deleteLoadout: (id: string) => Promise<void>;
  publishLoadout: (id: string) => Promise<void>;
  unpublishLoadout: (id: string) => Promise<void>;
}

interface CreateLoadoutData {
  name: string;
  sourceUrl: string;
  description?: string;
  tripType?: string;
  dateRange?: string;
}

// =============================================================================
// Hook
// =============================================================================

export function useVipLoadoutsAdmin(vipId?: string): UseVipLoadoutsAdminReturn {
  const [state, setState] = useState<UseVipLoadoutsAdminState>({
    status: 'idle',
    loadouts: [],
    error: null,
  });

  const supabase = createClient();

  // Fetch all loadouts or loadouts for a specific VIP
  const fetchLoadouts = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      let query = supabase
        .from('vip_loadouts')
        .select(`
          *,
          vip_loadout_items(count)
        `)
        .order('created_at', { ascending: false });

      // Filter by VIP if provided
      if (vipId) {
        query = query.eq('vip_id', vipId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate summary statistics
      const loadoutsWithStats: VipLoadoutSummary[] = await Promise.all(
        (data || []).map(async (loadout) => {
          // Get total weight
          const { data: items } = await supabase
            .from('vip_loadout_items')
            .select('weight_grams, quantity')
            .eq('vip_loadout_id', loadout.id);

          const totalWeightGrams = (items || []).reduce(
            (sum, item) => sum + item.weight_grams * item.quantity,
            0
          );

          return {
            id: loadout.id,
            vipId: loadout.vip_id,
            name: loadout.name,
            slug: loadout.slug,
            sourceUrl: loadout.source_url,
            description: loadout.description,
            tripType: loadout.trip_type,
            dateRange: loadout.date_range,
            status: loadout.status,
            isSourceAvailable: loadout.is_source_available,
            sourceCheckedAt: loadout.source_checked_at,
            createdBy: loadout.created_by,
            createdAt: loadout.created_at,
            updatedAt: loadout.updated_at,
            publishedAt: loadout.published_at,
            totalWeightGrams,
            itemCount: Array.isArray(loadout.vip_loadout_items)
              ? loadout.vip_loadout_items.length
              : loadout.vip_loadout_items?.count || 0,
          };
        })
      );

      setState({
        status: 'success',
        loadouts: loadoutsWithStats,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load loadouts';
      console.error('Error loading VIP loadouts:', err);
      setState({
        status: 'error',
        loadouts: [],
        error: message,
      });
    }
  }, [vipId, supabase]);

  // Create new loadout
  const createLoadout = useCallback(
    async (vipId: string, data: CreateLoadoutData): Promise<string> => {
      // Generate slug from name
      const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const { data: loadout, error } = await supabase
        .from('vip_loadouts')
        .insert({
          vip_id: vipId,
          name: data.name,
          slug,
          source_url: data.sourceUrl,
          description: data.description || null,
          trip_type: data.tripType || null,
          date_range: data.dateRange || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create loadout: ${error.message}`);

      await fetchLoadouts();
      return loadout.id;
    },
    [supabase, fetchLoadouts]
  );

  // Update loadout
  const updateLoadout = useCallback(
    async (id: string, data: Partial<CreateLoadoutData>) => {
      const updateData: Record<string, unknown> = {};

      if (data.name) {
        updateData.name = data.name;
        updateData.slug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      }
      if (data.sourceUrl) updateData.source_url = data.sourceUrl;
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.tripType !== undefined) updateData.trip_type = data.tripType || null;
      if (data.dateRange !== undefined) updateData.date_range = data.dateRange || null;

      const { error } = await supabase
        .from('vip_loadouts')
        .update(updateData)
        .eq('id', id);

      if (error) throw new Error(`Failed to update loadout: ${error.message}`);

      await fetchLoadouts();
    },
    [supabase, fetchLoadouts]
  );

  // Delete loadout
  const deleteLoadout = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('vip_loadouts').delete().eq('id', id);

      if (error) throw new Error(`Failed to delete loadout: ${error.message}`);

      await fetchLoadouts();
    },
    [supabase, fetchLoadouts]
  );

  // Publish loadout
  const publishLoadout = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('vip_loadouts')
        .update({ status: 'published' })
        .eq('id', id);

      if (error) throw new Error(`Failed to publish loadout: ${error.message}`);

      await fetchLoadouts();
    },
    [supabase, fetchLoadouts]
  );

  // Unpublish loadout
  const unpublishLoadout = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('vip_loadouts')
        .update({ status: 'draft' })
        .eq('id', id);

      if (error) throw new Error(`Failed to unpublish loadout: ${error.message}`);

      await fetchLoadouts();
    },
    [supabase, fetchLoadouts]
  );

  // Fetch on mount or when vipId changes
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
