/**
 * useLoadoutItemsAdmin Hook
 *
 * Admin hook for managing individual items within a VIP loadout.
 * Provides full CRUD operations for loadout items.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VipLoadoutItem } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface UseLoadoutItemsAdminState {
  status: 'idle' | 'loading' | 'success' | 'error';
  items: VipLoadoutItem[];
  error: string | null;
}

interface UseLoadoutItemsAdminReturn extends UseLoadoutItemsAdminState {
  refetch: () => Promise<void>;
  addItem: (data: CreateItemData) => Promise<void>;
  updateItem: (id: string, data: Partial<CreateItemData>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  reorderItems: (itemIds: string[]) => Promise<void>;
}

export interface CreateItemData {
  name: string;
  brand?: string;
  weightGrams: number;
  quantity: number;
  category: string;
  notes?: string;
  gearItemId?: string;
}

// =============================================================================
// Hook
// =============================================================================

export function useLoadoutItemsAdmin(
  loadoutId: string
): UseLoadoutItemsAdminReturn {
  const [state, setState] = useState<UseLoadoutItemsAdminState>({
    status: 'idle',
    items: [],
    error: null,
  });

  const supabase = createClient();

  // Fetch items for the loadout
  const fetchItems = useCallback(async () => {
    if (!loadoutId) {
      setState({ status: 'success', items: [], error: null });
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const { data, error } = await supabase
        .from('vip_loadout_items')
        .select('*')
        .eq('vip_loadout_id', loadoutId)
        .order('sort_order', { ascending: true })
        .order('category', { ascending: true });

      if (error) throw error;

      const items: VipLoadoutItem[] = (data || []).map((item) => ({
        id: item.id,
        vipLoadoutId: item.vip_loadout_id,
        gearItemId: item.gear_item_id || undefined,
        name: item.name,
        brand: item.brand || undefined,
        weightGrams: item.weight_grams,
        quantity: item.quantity,
        notes: item.notes || undefined,
        category: item.category,
        sortOrder: item.sort_order,
        createdAt: item.created_at,
      }));

      setState({
        status: 'success',
        items,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load items';
      console.error('Error loading loadout items:', err);
      setState({
        status: 'error',
        items: [],
        error: message,
      });
    }
  }, [loadoutId, supabase]);

  // Add new item
  const addItem = useCallback(
    async (data: CreateItemData) => {
      // Get the max sort_order to append to the end
      const { data: maxOrder } = await supabase
        .from('vip_loadout_items')
        .select('sort_order')
        .eq('vip_loadout_id', loadoutId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSortOrder = (maxOrder?.sort_order ?? -1) + 1;

      const { error } = await supabase.from('vip_loadout_items').insert({
        vip_loadout_id: loadoutId,
        gear_item_id: data.gearItemId || null,
        name: data.name,
        brand: data.brand || null,
        weight_grams: data.weightGrams,
        quantity: data.quantity,
        notes: data.notes || null,
        category: data.category,
        sort_order: nextSortOrder,
      });

      if (error) throw new Error(`Failed to add item: ${error.message}`);

      await fetchItems();
    },
    [loadoutId, supabase, fetchItems]
  );

  // Update item
  const updateItem = useCallback(
    async (id: string, data: Partial<CreateItemData>) => {
      const updateData: Record<string, unknown> = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.brand !== undefined) updateData.brand = data.brand || null;
      if (data.weightGrams !== undefined) updateData.weight_grams = data.weightGrams;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.notes !== undefined) updateData.notes = data.notes || null;
      if (data.gearItemId !== undefined) updateData.gear_item_id = data.gearItemId || null;

      const { error } = await supabase
        .from('vip_loadout_items')
        .update(updateData)
        .eq('id', id);

      if (error) throw new Error(`Failed to update item: ${error.message}`);

      await fetchItems();
    },
    [supabase, fetchItems]
  );

  // Delete item
  const deleteItem = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('vip_loadout_items')
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Failed to delete item: ${error.message}`);

      await fetchItems();
    },
    [supabase, fetchItems]
  );

  // Reorder items
  const reorderItems = useCallback(
    async (itemIds: string[]) => {
      // Update sort_order for each item based on array position
      const updates = itemIds.map((id, index) =>
        supabase
          .from('vip_loadout_items')
          .update({ sort_order: index })
          .eq('id', id)
      );

      await Promise.all(updates);
      await fetchItems();
    },
    [supabase, fetchItems]
  );

  // Fetch on mount or when loadoutId changes
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    ...state,
    refetch: fetchItems,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
  };
}

export default useLoadoutItemsAdmin;
