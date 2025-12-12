/**
 * useLoadouts Hook
 *
 * Feature: 040-supabase-migration
 * Tasks: T044, T045, T046, T047
 *
 * Provides loadout CRUD operations using Supabase.
 * Includes weight calculation functions.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';
import type { WeightSummary } from '@/lib/utils/weight';
import { calculateWeightSummary } from '@/lib/utils/weight';

// =============================================================================
// Types
// =============================================================================

type LoadoutRow = Tables<'loadouts'>;
type LoadoutItemRow = Tables<'loadout_items'>;

/** Loadout with items and calculated weights */
export interface Loadout {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  tripDate: Date | null;
  activityTypes: string[];
  seasons: string[];
  createdAt: Date;
  updatedAt: Date;
  items: LoadoutItem[];
}

/** Item within a loadout */
export interface LoadoutItem {
  id: string;
  loadoutId: string;
  gearItemId: string;
  quantity: number;
  isWorn: boolean;
  isConsumable: boolean;
  createdAt: Date;
}

/** Data for creating a new loadout */
export interface CreateLoadoutData {
  name: string;
  description?: string;
  tripDate?: Date;
  activityTypes?: string[];
  seasons?: string[];
}

/** Data for adding an item to a loadout */
export interface AddLoadoutItemData {
  gearItemId: string;
  quantity?: number;
  isWorn?: boolean;
  isConsumable?: boolean;
}

export interface UseLoadoutsReturn {
  /** List of loadouts */
  loadouts: Loadout[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Fetch all loadouts */
  fetchLoadouts: () => Promise<void>;
  /** Create a new loadout */
  createLoadout: (data: CreateLoadoutData) => Promise<Loadout | null>;
  /** Update a loadout */
  updateLoadout: (id: string, data: Partial<CreateLoadoutData>) => Promise<Loadout | null>;
  /** Delete a loadout */
  deleteLoadout: (id: string) => Promise<boolean>;
  /** Add item to loadout (T046) */
  addItem: (loadoutId: string, data: AddLoadoutItemData) => Promise<LoadoutItem | null>;
  /** Remove item from loadout (T046) */
  removeItem: (loadoutId: string, gearItemId: string) => Promise<boolean>;
  /** Update item state in loadout (T046) */
  updateItemState: (
    loadoutId: string,
    gearItemId: string,
    data: Partial<Pick<LoadoutItem, 'quantity' | 'isWorn' | 'isConsumable'>>
  ) => Promise<LoadoutItem | null>;
  /** Calculate weight for a loadout (T047) */
  calculateWeight: (loadoutId: string, gearItems: Map<string, number>) => WeightSummary;
  /** Get loadout by ID */
  getLoadout: (id: string) => Loadout | undefined;
}

// =============================================================================
// Transformers
// =============================================================================

function loadoutFromDb(row: LoadoutRow, items: LoadoutItemRow[] = []): Loadout {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    tripDate: row.trip_date ? new Date(row.trip_date) : null,
    activityTypes: row.activity_types || [],
    seasons: row.seasons || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    items: items.map(loadoutItemFromDb),
  };
}

function loadoutItemFromDb(row: LoadoutItemRow): LoadoutItem {
  return {
    id: row.id,
    loadoutId: row.loadout_id,
    gearItemId: row.gear_item_id,
    quantity: row.quantity,
    isWorn: row.is_worn,
    isConsumable: row.is_consumable,
    createdAt: new Date(row.created_at),
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLoadouts(userId: string | null): UseLoadoutsReturn {
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch all loadouts with their items
  const fetchLoadouts = useCallback(async () => {
    if (!userId) {
      setLoadouts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch loadouts
      const { data: loadoutData, error: loadoutError } = await supabase
        .from('loadouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (loadoutError) {
        console.error('Error fetching loadouts:', loadoutError);
        setError(loadoutError.message);
        return;
      }

      const typedLoadoutData = (loadoutData || []) as LoadoutRow[];
      if (typedLoadoutData.length === 0) {
        setLoadouts([]);
        return;
      }

      // Fetch all loadout items for these loadouts
      const loadoutIds = typedLoadoutData.map((l) => l.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from('loadout_items')
        .select('*')
        .in('loadout_id', loadoutIds);

      if (itemsError) {
        console.error('Error fetching loadout items:', itemsError);
        // Continue without items rather than failing entirely
      }

      // Group items by loadout ID
      const typedItemsData = (itemsData || []) as LoadoutItemRow[];
      const itemsByLoadout = new Map<string, LoadoutItemRow[]>();
      typedItemsData.forEach((item) => {
        const existing = itemsByLoadout.get(item.loadout_id) || [];
        existing.push(item);
        itemsByLoadout.set(item.loadout_id, existing);
      });

      // Transform to Loadout objects
      const loadoutsWithItems = typedLoadoutData.map((row) =>
        loadoutFromDb(row, itemsByLoadout.get(row.id) || [])
      );

      setLoadouts(loadoutsWithItems);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch loadouts';
      console.error('Unexpected error fetching loadouts:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  // Create loadout
  const createLoadout = useCallback(
    async (data: CreateLoadoutData): Promise<Loadout | null> => {
      if (!userId) {
        setError('User not authenticated');
        return null;
      }

      setError(null);

      try {
        const insertData: TablesInsert<'loadouts'> = {
          user_id: userId,
          name: data.name,
          description: data.description,
          trip_date: data.tripDate?.toISOString().split('T')[0],
          activity_types: data.activityTypes as never[],
          seasons: data.seasons as never[],
        };

        const { data: newData, error: insertError } = await supabase
          .from('loadouts')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating loadout:', insertError);
          setError(insertError.message);
          return null;
        }

        const newLoadout = loadoutFromDb(newData as LoadoutRow, []);
        setLoadouts((prev) => [newLoadout, ...prev]);
        return newLoadout;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create loadout';
        console.error('Unexpected error creating loadout:', err);
        setError(message);
        return null;
      }
    },
    [userId, supabase]
  );

  // Update loadout
  const updateLoadout = useCallback(
    async (id: string, data: Partial<CreateLoadoutData>): Promise<Loadout | null> => {
      if (!userId) {
        setError('User not authenticated');
        return null;
      }

      setError(null);

      try {
        const updateData: TablesUpdate<'loadouts'> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.tripDate !== undefined) {
          updateData.trip_date = data.tripDate?.toISOString().split('T')[0] ?? null;
        }
        if (data.activityTypes !== undefined) {
          updateData.activity_types = data.activityTypes as never[];
        }
        if (data.seasons !== undefined) {
          updateData.seasons = data.seasons as never[];
        }

        const { data: updatedData, error: updateError } = await supabase
          .from('loadouts')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating loadout:', updateError);
          setError(updateError.message);
          return null;
        }

        // Get existing items for this loadout
        const existingLoadout = loadouts.find((l) => l.id === id);
        const updatedLoadout = loadoutFromDb(
          updatedData as LoadoutRow,
          existingLoadout?.items.map((i) => ({
            id: i.id,
            loadout_id: i.loadoutId,
            gear_item_id: i.gearItemId,
            quantity: i.quantity,
            is_worn: i.isWorn,
            is_consumable: i.isConsumable,
            created_at: i.createdAt.toISOString(),
          })) || []
        );

        setLoadouts((prev) =>
          prev.map((l) => (l.id === id ? updatedLoadout : l))
        );
        return updatedLoadout;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update loadout';
        console.error('Unexpected error updating loadout:', err);
        setError(message);
        return null;
      }
    },
    [userId, supabase, loadouts]
  );

  // Delete loadout
  const deleteLoadout = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userId) {
        setError('User not authenticated');
        return false;
      }

      setError(null);

      try {
        const { error: deleteError } = await supabase
          .from('loadouts')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error deleting loadout:', deleteError);
          setError(deleteError.message);
          return false;
        }

        setLoadouts((prev) => prev.filter((l) => l.id !== id));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete loadout';
        console.error('Unexpected error deleting loadout:', err);
        setError(message);
        return false;
      }
    },
    [userId, supabase]
  );

  // T046: Add item to loadout
  const addItem = useCallback(
    async (loadoutId: string, data: AddLoadoutItemData): Promise<LoadoutItem | null> => {
      setError(null);

      try {
        const insertData: TablesInsert<'loadout_items'> = {
          loadout_id: loadoutId,
          gear_item_id: data.gearItemId,
          quantity: data.quantity ?? 1,
          is_worn: data.isWorn ?? false,
          is_consumable: data.isConsumable ?? false,
        };

        const { data: newData, error: insertError } = await supabase
          .from('loadout_items')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('Error adding item to loadout:', insertError);
          setError(insertError.message);
          return null;
        }

        const newItem = loadoutItemFromDb(newData as LoadoutItemRow);

        // Update local state
        setLoadouts((prev) =>
          prev.map((l) =>
            l.id === loadoutId ? { ...l, items: [...l.items, newItem] } : l
          )
        );

        return newItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add item to loadout';
        console.error('Unexpected error adding item to loadout:', err);
        setError(message);
        return null;
      }
    },
    [supabase]
  );

  // T046: Remove item from loadout
  const removeItem = useCallback(
    async (loadoutId: string, gearItemId: string): Promise<boolean> => {
      setError(null);

      try {
        const { error: deleteError } = await supabase
          .from('loadout_items')
          .delete()
          .eq('loadout_id', loadoutId)
          .eq('gear_item_id', gearItemId);

        if (deleteError) {
          console.error('Error removing item from loadout:', deleteError);
          setError(deleteError.message);
          return false;
        }

        // Update local state
        setLoadouts((prev) =>
          prev.map((l) =>
            l.id === loadoutId
              ? { ...l, items: l.items.filter((i) => i.gearItemId !== gearItemId) }
              : l
          )
        );

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove item from loadout';
        console.error('Unexpected error removing item from loadout:', err);
        setError(message);
        return false;
      }
    },
    [supabase]
  );

  // T046: Update item state in loadout
  const updateItemState = useCallback(
    async (
      loadoutId: string,
      gearItemId: string,
      data: Partial<Pick<LoadoutItem, 'quantity' | 'isWorn' | 'isConsumable'>>
    ): Promise<LoadoutItem | null> => {
      setError(null);

      try {
        const updateData: TablesUpdate<'loadout_items'> = {};
        if (data.quantity !== undefined) updateData.quantity = data.quantity;
        if (data.isWorn !== undefined) updateData.is_worn = data.isWorn;
        if (data.isConsumable !== undefined) updateData.is_consumable = data.isConsumable;

        const { data: updatedData, error: updateError } = await supabase
          .from('loadout_items')
          .update(updateData)
          .eq('loadout_id', loadoutId)
          .eq('gear_item_id', gearItemId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating loadout item:', updateError);
          setError(updateError.message);
          return null;
        }

        const updatedItem = loadoutItemFromDb(updatedData as LoadoutItemRow);

        // Update local state
        setLoadouts((prev) =>
          prev.map((l) =>
            l.id === loadoutId
              ? {
                  ...l,
                  items: l.items.map((i) =>
                    i.gearItemId === gearItemId ? updatedItem : i
                  ),
                }
              : l
          )
        );

        return updatedItem;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update loadout item';
        console.error('Unexpected error updating loadout item:', err);
        setError(message);
        return null;
      }
    },
    [supabase]
  );

  // T047: Calculate weight for a loadout
  const calculateWeight = useCallback(
    (loadoutId: string, gearItems: Map<string, number>): WeightSummary => {
      const loadout = loadouts.find((l) => l.id === loadoutId);
      if (!loadout) {
        return calculateWeightSummary(0, 0, 0);
      }

      let totalGrams = 0;
      let wornGrams = 0;
      let consumableGrams = 0;

      loadout.items.forEach((item) => {
        const weight = gearItems.get(item.gearItemId) ?? 0;
        const itemWeight = weight * item.quantity;

        totalGrams += itemWeight;
        if (item.isWorn) wornGrams += itemWeight;
        if (item.isConsumable) consumableGrams += itemWeight;
      });

      return calculateWeightSummary(totalGrams, wornGrams, consumableGrams);
    },
    [loadouts]
  );

  // Get loadout by ID
  const getLoadout = useCallback(
    (id: string): Loadout | undefined => {
      return loadouts.find((l) => l.id === id);
    },
    [loadouts]
  );

  // Initial fetch
  useEffect(() => {
    fetchLoadouts();
  }, [fetchLoadouts]);

  return {
    loadouts,
    isLoading,
    error,
    fetchLoadouts,
    createLoadout,
    updateLoadout,
    deleteLoadout,
    addItem,
    removeItem,
    updateItemState,
    calculateWeight,
    getLoadout,
  };
}
