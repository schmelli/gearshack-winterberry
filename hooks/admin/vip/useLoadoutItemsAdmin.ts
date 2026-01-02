/**
 * useLoadoutItemsAdmin Hook (NEW VERSION - Feature 052)
 *
 * Admin hook for managing items within a VIP loadout using the unified schema.
 * VIP loadouts now use regular loadout_items table that references gear_items.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

// =============================================================================
// Types
// =============================================================================

type LoadoutItemRow = Database['public']['Tables']['loadout_items']['Row'];
type GearItemRow = Database['public']['Tables']['gear_items']['Row'];

export interface LoadoutItem {
  id: string;
  loadoutId: string;
  gearItemId: string;
  quantity: number;
  // Denormalized from gear_items for display
  name: string;
  brand: string | null;
  weightGrams: number | null;
  productTypeId: string | null;
  primaryImageUrl: string | null;
}

interface UseLoadoutItemsAdminState {
  status: 'idle' | 'loading' | 'success' | 'error';
  items: LoadoutItem[];
  error: string | null;
}

interface UseLoadoutItemsAdminReturn extends UseLoadoutItemsAdminState {
  refetch: () => Promise<void>;
  addItem: (gearItemId: string, quantity?: number) => Promise<void>;
  updateItem: (id: string, quantity: number) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export interface CreateItemData {
  gearItemId: string;
  quantity?: number;
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
        .from('loadout_items')
        .select(`
          *,
          gear_items(
            id,
            name,
            brand,
            weight_grams,
            product_type_id,
            primary_image_url
          )
        `)
        .eq('loadout_id', loadoutId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const items: LoadoutItem[] = (data || []).map((item: any) => ({
        id: item.id,
        loadoutId: item.loadout_id,
        gearItemId: item.gear_item_id,
        quantity: item.quantity,
        // Denormalized fields from gear_items
        name: item.gear_items?.name || 'Unknown Item',
        brand: item.gear_items?.brand || null,
        weightGrams: item.gear_items?.weight_grams || null,
        productTypeId: item.gear_items?.product_type_id || null,
        primaryImageUrl: item.gear_items?.primary_image_url || null,
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

  // Add item (must reference existing gear_item)
  const addItem = useCallback(
    async (gearItemId: string, quantity: number = 1) => {
      const insertData: Database['public']['Tables']['loadout_items']['Insert'] = {
        loadout_id: loadoutId,
        gear_item_id: gearItemId,
        quantity,
      };

      const { error } = await supabase
        .from('loadout_items')
        .insert(insertData);

      if (error) throw new Error(`Failed to add item: ${error.message}`);

      await fetchItems();
    },
    [loadoutId, supabase, fetchItems]
  );

  // Update item (only quantity can be updated; to change the gear item, delete and re-add)
  const updateItem = useCallback(
    async (id: string, quantity: number) => {
      const { error } = await supabase
        .from('loadout_items')
        .update({ quantity })
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
        .from('loadout_items')
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Failed to delete item: ${error.message}`);

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
  };
}

export default useLoadoutItemsAdmin;
