/**
 * useLoadouts Hook
 *
 * Feature: 040-supabase-migration
 * Provides loadout CRUD operations using Supabase with weight calculation functions.
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

export interface LoadoutItem {
  id: string;
  loadoutId: string;
  gearItemId: string;
  quantity: number;
  isWorn: boolean;
  isConsumable: boolean;
  createdAt: Date;
}

export interface CreateLoadoutData {
  name: string;
  description?: string;
  tripDate?: Date;
  activityTypes?: string[];
  seasons?: string[];
}

export interface AddLoadoutItemData {
  gearItemId: string;
  quantity?: number;
  isWorn?: boolean;
  isConsumable?: boolean;
}

export interface UseLoadoutsReturn {
  loadouts: Loadout[];
  isLoading: boolean;
  error: string | null;
  fetchLoadouts: () => Promise<void>;
  createLoadout: (data: CreateLoadoutData) => Promise<Loadout | null>;
  updateLoadout: (id: string, data: Partial<CreateLoadoutData>) => Promise<Loadout | null>;
  deleteLoadout: (id: string) => Promise<boolean>;
  addItem: (loadoutId: string, data: AddLoadoutItemData) => Promise<LoadoutItem | null>;
  removeItem: (loadoutId: string, gearItemId: string) => Promise<boolean>;
  updateItemState: (loadoutId: string, gearItemId: string, data: Partial<Pick<LoadoutItem, 'quantity' | 'isWorn' | 'isConsumable'>>) => Promise<LoadoutItem | null>;
  calculateWeight: (loadoutId: string, gearItems: Map<string, number>) => WeightSummary;
  getLoadout: (id: string) => Loadout | undefined;
}

// =============================================================================
// Helpers
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
    items: items.map((item) => ({
      id: item.id,
      loadoutId: item.loadout_id,
      gearItemId: item.gear_item_id,
      quantity: item.quantity,
      isWorn: item.is_worn,
      isConsumable: item.is_consumable,
      createdAt: new Date(item.created_at),
    })),
  };
}

function getErrorMsg(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLoadouts(userId: string | null): UseLoadoutsReturn {
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchLoadouts = useCallback(async () => {
    if (!userId) { setLoadouts([]); setIsLoading(false); return; }

    setIsLoading(true);
    setError(null);

    try {
      const { data: loadoutData, error: loadoutError } = await supabase
        .from('loadouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (loadoutError) { setError(loadoutError.message); return; }

      const typedLoadoutData = (loadoutData || []) as LoadoutRow[];
      if (typedLoadoutData.length === 0) { setLoadouts([]); return; }

      const loadoutIds = typedLoadoutData.map((l) => l.id);
      const { data: itemsData } = await supabase.from('loadout_items').select('*').in('loadout_id', loadoutIds);

      const typedItemsData = (itemsData || []) as LoadoutItemRow[];
      const itemsByLoadout = new Map<string, LoadoutItemRow[]>();
      typedItemsData.forEach((item) => {
        const existing = itemsByLoadout.get(item.loadout_id) || [];
        existing.push(item);
        itemsByLoadout.set(item.loadout_id, existing);
      });

      setLoadouts(typedLoadoutData.map((row) => loadoutFromDb(row, itemsByLoadout.get(row.id) || [])));
    } catch (err) {
      setError(getErrorMsg(err, 'Failed to fetch loadouts'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  const createLoadout = useCallback(async (data: CreateLoadoutData): Promise<Loadout | null> => {
    if (!userId) { setError('User not authenticated'); return null; }
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

      const { data: newData, error: insertError } = await supabase.from('loadouts').insert(insertData).select().single();
      if (insertError) { setError(insertError.message); return null; }

      const newLoadout = loadoutFromDb(newData as LoadoutRow, []);
      setLoadouts((prev) => [newLoadout, ...prev]);
      return newLoadout;
    } catch (err) {
      setError(getErrorMsg(err, 'Failed to create loadout'));
      return null;
    }
  }, [userId, supabase]);

  const updateLoadout = useCallback(async (id: string, data: Partial<CreateLoadoutData>): Promise<Loadout | null> => {
    if (!userId) { setError('User not authenticated'); return null; }
    setError(null);

    try {
      const updateData: TablesUpdate<'loadouts'> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.tripDate !== undefined) updateData.trip_date = data.tripDate?.toISOString().split('T')[0] ?? null;
      if (data.activityTypes !== undefined) updateData.activity_types = data.activityTypes as never[];
      if (data.seasons !== undefined) updateData.seasons = data.seasons as never[];

      const { data: updatedData, error: updateError } = await supabase.from('loadouts').update(updateData).eq('id', id).eq('user_id', userId).select().single();
      if (updateError) { setError(updateError.message); return null; }

      const existingLoadout = loadouts.find((l) => l.id === id);
      const updatedLoadout = loadoutFromDb(
        updatedData as LoadoutRow,
        existingLoadout?.items.map((i) => ({
          id: i.id, loadout_id: i.loadoutId, gear_item_id: i.gearItemId, quantity: i.quantity,
          is_worn: i.isWorn, is_consumable: i.isConsumable, created_at: i.createdAt.toISOString(),
        })) || []
      );

      setLoadouts((prev) => prev.map((l) => (l.id === id ? updatedLoadout : l)));
      return updatedLoadout;
    } catch (err) {
      setError(getErrorMsg(err, 'Failed to update loadout'));
      return null;
    }
  }, [userId, supabase, loadouts]);

  const deleteLoadout = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) { setError('User not authenticated'); return false; }
    setError(null);

    try {
      const { error: deleteError } = await supabase.from('loadouts').delete().eq('id', id).eq('user_id', userId);
      if (deleteError) { setError(deleteError.message); return false; }
      setLoadouts((prev) => prev.filter((l) => l.id !== id));
      return true;
    } catch (err) {
      setError(getErrorMsg(err, 'Failed to delete loadout'));
      return false;
    }
  }, [userId, supabase]);

  const addItem = useCallback(async (loadoutId: string, data: AddLoadoutItemData): Promise<LoadoutItem | null> => {
    setError(null);

    try {
      const insertData: TablesInsert<'loadout_items'> = {
        loadout_id: loadoutId,
        gear_item_id: data.gearItemId,
        quantity: data.quantity ?? 1,
        is_worn: data.isWorn ?? false,
        is_consumable: data.isConsumable ?? false,
      };

      const { data: newData, error: insertError } = await supabase.from('loadout_items').insert(insertData).select().single();
      if (insertError) { setError(insertError.message); return null; }

      const row = newData as LoadoutItemRow;
      const newItem: LoadoutItem = {
        id: row.id, loadoutId: row.loadout_id, gearItemId: row.gear_item_id, quantity: row.quantity,
        isWorn: row.is_worn, isConsumable: row.is_consumable, createdAt: new Date(row.created_at),
      };

      setLoadouts((prev) => prev.map((l) => l.id === loadoutId ? { ...l, items: [...l.items, newItem] } : l));
      return newItem;
    } catch (err) {
      setError(getErrorMsg(err, 'Failed to add item to loadout'));
      return null;
    }
  }, [supabase]);

  const removeItem = useCallback(async (loadoutId: string, gearItemId: string): Promise<boolean> => {
    setError(null);

    try {
      const { error: deleteError } = await supabase.from('loadout_items').delete().eq('loadout_id', loadoutId).eq('gear_item_id', gearItemId);
      if (deleteError) { setError(deleteError.message); return false; }
      setLoadouts((prev) => prev.map((l) => l.id === loadoutId ? { ...l, items: l.items.filter((i) => i.gearItemId !== gearItemId) } : l));
      return true;
    } catch (err) {
      setError(getErrorMsg(err, 'Failed to remove item from loadout'));
      return false;
    }
  }, [supabase]);

  const updateItemState = useCallback(async (
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

      const { data: updatedData, error: updateError } = await supabase.from('loadout_items').update(updateData).eq('loadout_id', loadoutId).eq('gear_item_id', gearItemId).select().single();
      if (updateError) { setError(updateError.message); return null; }

      const row = updatedData as LoadoutItemRow;
      const updatedItem: LoadoutItem = {
        id: row.id, loadoutId: row.loadout_id, gearItemId: row.gear_item_id, quantity: row.quantity,
        isWorn: row.is_worn, isConsumable: row.is_consumable, createdAt: new Date(row.created_at),
      };

      setLoadouts((prev) => prev.map((l) => l.id === loadoutId ? { ...l, items: l.items.map((i) => i.gearItemId === gearItemId ? updatedItem : i) } : l));
      return updatedItem;
    } catch (err) {
      setError(getErrorMsg(err, 'Failed to update loadout item'));
      return null;
    }
  }, [supabase]);

  const calculateWeight = useCallback((loadoutId: string, gearItems: Map<string, number>): WeightSummary => {
    const loadout = loadouts.find((l) => l.id === loadoutId);
    if (!loadout) return calculateWeightSummary(0, 0, 0);

    let totalGrams = 0, wornGrams = 0, consumableGrams = 0;
    loadout.items.forEach((item) => {
      const itemWeight = (gearItems.get(item.gearItemId) ?? 0) * item.quantity;
      totalGrams += itemWeight;
      if (item.isWorn) wornGrams += itemWeight;
      if (item.isConsumable) consumableGrams += itemWeight;
    });

    return calculateWeightSummary(totalGrams, wornGrams, consumableGrams);
  }, [loadouts]);

  const getLoadout = useCallback((id: string): Loadout | undefined => loadouts.find((l) => l.id === id), [loadouts]);

  useEffect(() => { fetchLoadouts(); }, [fetchLoadouts]);

  return {
    loadouts, isLoading, error, fetchLoadouts, createLoadout, updateLoadout, deleteLoadout,
    addItem, removeItem, updateItemState, calculateWeight, getLoadout,
  };
}
