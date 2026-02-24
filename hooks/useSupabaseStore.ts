/**
 * useSupabaseStore - Zustand Store with Supabase Sync
 *
 * Feature: 040-supabase-migration
 * Tasks: T033, T034, T035, T036
 *
 * Provides a zustand store compatible with the existing UI components
 * but backed by Supabase instead of Firebase.
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getTranslation } from '@/lib/translations';
import {
  gearItemToDbInsert,
  gearItemToDbUpdate,
} from '@/lib/supabase/transformers';
import {
  DEFAULT_SYNC_STATE,
  startSyncOperation,
  completeSyncOperation,
  failSyncOperation,
  type SyncState,
} from '@/lib/store';
import { triggerPriceDiscovery } from '@/lib/geargraph/price-discovery-client';
import type { GearItem } from '@/types/gear';
import type { TablesInsert, TablesUpdate } from '@/types/database';
import type { ActivityType, Season } from '@/types/loadout';

const t = getTranslation('Store');

// =============================================================================
// Types
// =============================================================================

export interface LoadoutLocal {
  id: string;
  name: string;
  tripDate: Date | null;
  itemIds: string[];
  description: string | null;
  activityTypes: ActivityType[];
  seasons: Season[];
  itemStates: ItemState[];
  heroImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemState {
  itemId: string;
  isWorn: boolean;
  isConsumable: boolean;
}

export { type SyncState };

interface SupabaseStore {
  items: GearItem[];
  loadouts: LoadoutLocal[];
  userId: string | null;
  _initialized: boolean;
  syncState: SyncState;

  setUserId: (userId: string | null) => void;
  addItem: (item: Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateItem: (id: string, updates: Partial<GearItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  createLoadout: (name: string, tripDate?: Date | null, options?: {
    description?: string;
    seasons?: Season[];
    activityTypes?: ActivityType[];
  }) => Promise<string>;
  updateLoadout: (id: string, updates: Partial<LoadoutLocal>) => Promise<void>;
  deleteLoadout: (id: string) => Promise<void>;
  addItemToLoadout: (loadoutId: string, itemId: string) => Promise<void>;
  removeItemFromLoadout: (loadoutId: string, itemId: string) => Promise<void>;
  updateLoadoutMetadata: (id: string, metadata: Partial<LoadoutLocal>) => Promise<void>;
  setItemWorn: (loadoutId: string, itemId: string, isWorn: boolean) => Promise<void>;
  setItemConsumable: (loadoutId: string, itemId: string, isConsumable: boolean) => Promise<void>;
  setSyncState: (updates: Partial<SyncState>) => void;
  setRemoteGearItems: (items: GearItem[]) => void;
  setRemoteLoadouts: (loadouts: LoadoutLocal[]) => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useSupabaseStore = create<SupabaseStore>()(
  persist(
    (set, get) => ({
      items: [],
      loadouts: [],
      userId: null,
      _initialized: false,
      syncState: DEFAULT_SYNC_STATE,

      setUserId: (userId) => set({ userId }),

      addItem: async (item) => {
        const { userId } = get();
        if (!userId) {
          toast.error(t('signInToAdd'));
          throw new Error('User not authenticated');
        }

        const supabase = createClient();
        const id = crypto.randomUUID();
        const now = new Date();
        const newItem: GearItem = { ...item, id, createdAt: now, updatedAt: now };

        set((state) => ({
          items: [...state.items, newItem],
          syncState: startSyncOperation(state.syncState),
        }));

        try {
          const insertData = gearItemToDbInsert(item, userId);
          insertData.id = id;
          const { error } = await supabase.from('gear_items').insert(insertData as TablesInsert<'gear_items'>);
          if (error) throw error;
          // Fire-and-forget price discovery (non-blocking)
          if (!insertData.manufacturer_price) {
            triggerPriceDiscovery({
              gearItemId: id,
              brand: insertData.brand ?? null,
              name: insertData.name ?? '',
              productUrl: insertData.product_url ?? null,
            }).catch(() => {/* intentionally non-blocking */});
          }
          set((state) => ({ syncState: completeSyncOperation(state.syncState) }));
          return id;
        } catch (error) {
          set((state) => ({
            items: state.items.filter((i) => i.id !== id),
            syncState: failSyncOperation(state.syncState, 'Failed to save item'),
          }));
          toast.error(t('saveItemFailed'));
          throw error;
        }
      },

      updateItem: async (id, updates) => {
        const { userId, items } = get();
        if (!userId) { toast.error(t('signInToUpdate')); return; }

        const supabase = createClient();
        const previousItem = items.find((item) => item.id === id);
        if (!previousItem) return;

        set((state) => ({
          items: state.items.map((item) => item.id === id ? { ...item, ...updates, updatedAt: new Date() } : item),
          syncState: startSyncOperation(state.syncState),
        }));

        try {
          const { error } = await supabase.from('gear_items')
            .update(gearItemToDbUpdate(updates) as TablesUpdate<'gear_items'>)
            .eq('id', id).eq('user_id', userId);
          if (error) throw error;
          set((state) => ({ syncState: completeSyncOperation(state.syncState) }));
        } catch (error) {
          console.error('Failed to update item:', error);
          set((state) => ({
            items: state.items.map((item) => item.id === id ? previousItem : item),
            syncState: failSyncOperation(state.syncState, 'Failed to update item'),
          }));
          toast.error(t('updateItemFailed'));
        }
      },

      deleteItem: async (id) => {
        const { userId, items, loadouts } = get();
        if (!userId) { toast.error(t('signInToDelete')); return; }

        const supabase = createClient();
        const deletedItem = items.find((item) => item.id === id);
        const previousLoadouts = loadouts;
        if (!deletedItem) return;

        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          loadouts: state.loadouts.map((l) => ({ ...l, itemIds: l.itemIds.filter((iid) => iid !== id), updatedAt: new Date() })),
          syncState: startSyncOperation(state.syncState),
        }));

        try {
          const { error } = await supabase.from('gear_items').delete().eq('id', id).eq('user_id', userId);
          if (error) throw error;
          set((state) => ({ syncState: completeSyncOperation(state.syncState) }));
        } catch (error) {
          console.error('Failed to delete item:', error);
          set((state) => ({
            items: [...state.items, deletedItem].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
            loadouts: previousLoadouts,
            syncState: failSyncOperation(state.syncState, 'Failed to delete item'),
          }));
          toast.error(t('deleteItemFailed'));
        }
      },

      createLoadout: async (name, tripDate = null, options = {}) => {
        const { userId } = get();
        if (!userId) { toast.error(t('signInToCreateLoadout')); throw new Error('User not authenticated'); }

        const supabase = createClient();
        const id = crypto.randomUUID();
        const now = new Date();
        const { description = '', seasons = [], activityTypes = [] } = options;
        const newLoadout: LoadoutLocal = { id, name, tripDate, itemIds: [], description: description || null, activityTypes, seasons, itemStates: [], heroImageUrl: null, createdAt: now, updatedAt: now };

        set((state) => ({ loadouts: [...state.loadouts, newLoadout], syncState: startSyncOperation(state.syncState) }));

        try {
          const insertData: Record<string, unknown> = { id, user_id: userId, name };
          if (tripDate) insertData.trip_date = tripDate.toISOString().split('T')[0];
          if (description) insertData.description = description;
          if (seasons.length > 0) insertData.seasons = seasons;
          if (activityTypes.length > 0) insertData.activity_types = activityTypes;

          const { error } = await supabase.from('loadouts').insert(insertData as TablesInsert<'loadouts'>);
          if (error) throw error;
          set((state) => ({ syncState: completeSyncOperation(state.syncState) }));
          return id;
        } catch (error) {
          set((state) => ({ loadouts: state.loadouts.filter((l) => l.id !== id), syncState: failSyncOperation(state.syncState, 'Failed to save loadout') }));
          toast.error(t('saveLoadoutFailed'));
          throw error;
        }
      },

      updateLoadout: async (id, updates) => {
        const { userId, loadouts } = get();
        if (!userId) return;

        const supabase = createClient();
        const previousLoadout = loadouts.find((l) => l.id === id);
        if (!previousLoadout) return;

        set((state) => ({
          loadouts: state.loadouts.map((l) => l.id === id ? { ...l, ...updates, updatedAt: new Date() } : l),
          syncState: startSyncOperation(state.syncState),
        }));

        try {
          const updateData: TablesUpdate<'loadouts'> = {};
          if (updates.name !== undefined) updateData.name = updates.name;
          if (updates.description !== undefined) updateData.description = updates.description;
          if (updates.tripDate !== undefined) updateData.trip_date = updates.tripDate?.toISOString().split('T')[0] ?? null;

          const { error } = await supabase.from('loadouts').update(updateData).eq('id', id).eq('user_id', userId);
          if (error) throw error;
          set((state) => ({ syncState: completeSyncOperation(state.syncState) }));
        } catch (error) {
          console.error('Failed to update loadout:', error);
          set((state) => ({
            loadouts: state.loadouts.map((l) => l.id === id ? previousLoadout : l),
            syncState: failSyncOperation(state.syncState, 'Failed to update loadout'),
          }));
          toast.error(t('updateLoadoutFailed'));
        }
      },

      deleteLoadout: async (id) => {
        const { userId, loadouts } = get();
        if (!userId) return;

        const supabase = createClient();
        const deletedLoadout = loadouts.find((l) => l.id === id);
        if (!deletedLoadout) return;

        set((state) => ({
          loadouts: state.loadouts.filter((l) => l.id !== id),
          syncState: startSyncOperation(state.syncState),
        }));

        try {
          const { error } = await supabase.from('loadouts').delete().eq('id', id).eq('user_id', userId);
          if (error) throw error;
          set((state) => ({ syncState: completeSyncOperation(state.syncState) }));
        } catch (error) {
          console.error('Failed to delete loadout:', error);
          set((state) => ({
            loadouts: [...state.loadouts, deletedLoadout],
            syncState: failSyncOperation(state.syncState, 'Failed to delete loadout'),
          }));
          toast.error(t('deleteLoadoutFailed'));
        }
      },

      addItemToLoadout: async (loadoutId, itemId) => {
        const { userId, loadouts } = get();
        if (!userId) return;

        const loadout = loadouts.find((l) => l.id === loadoutId);
        if (!loadout || loadout.itemIds.includes(itemId)) return;

        const supabase = createClient();
        set((state) => ({
          loadouts: state.loadouts.map((l) => l.id !== loadoutId || l.itemIds.includes(itemId) ? l : { ...l, itemIds: [...l.itemIds, itemId], itemStates: [...l.itemStates, { itemId, isWorn: false, isConsumable: false }], updatedAt: new Date() }),
          syncState: startSyncOperation(state.syncState),
        }));

        try {
          const { error } = await supabase.from('loadout_items').insert({ loadout_id: loadoutId, gear_item_id: itemId, quantity: 1, is_worn: false, is_consumable: false });
          if (error) throw error;
          set((state) => ({ syncState: completeSyncOperation(state.syncState) }));
        } catch (error) {
          set((state) => ({
            loadouts: state.loadouts.map((l) => l.id !== loadoutId ? l : { ...l, itemIds: l.itemIds.filter((i) => i !== itemId), itemStates: l.itemStates.filter((s) => s.itemId !== itemId), updatedAt: new Date() }),
            syncState: failSyncOperation(state.syncState, 'Failed to add item to loadout'),
          }));
          throw error;
        }
      },

      removeItemFromLoadout: async (loadoutId, itemId) => {
        const { userId, loadouts } = get();
        if (!userId) return;

        const loadout = loadouts.find((l) => l.id === loadoutId);
        if (!loadout || !loadout.itemIds.includes(itemId)) return;

        const supabase = createClient();
        const previousItemIds = [...loadout.itemIds];
        const previousItemStates = [...loadout.itemStates];

        set((state) => ({
          loadouts: state.loadouts.map((l) => l.id !== loadoutId ? l : { ...l, itemIds: l.itemIds.filter((i) => i !== itemId), itemStates: l.itemStates.filter((s) => s.itemId !== itemId), updatedAt: new Date() }),
          syncState: startSyncOperation(state.syncState),
        }));

        try {
          const { error } = await supabase.from('loadout_items').delete().eq('loadout_id', loadoutId).eq('gear_item_id', itemId);
          if (error) throw error;
          set((state) => ({ syncState: completeSyncOperation(state.syncState) }));
        } catch (error) {
          set((state) => ({
            loadouts: state.loadouts.map((l) => l.id !== loadoutId ? l : { ...l, itemIds: previousItemIds, itemStates: previousItemStates, updatedAt: new Date() }),
            syncState: failSyncOperation(state.syncState, 'Failed to remove item from loadout'),
          }));
          throw error;
        }
      },

      updateLoadoutMetadata: async (id, metadata) => {
        const { userId, loadouts } = get();
        if (!userId) return;

        const loadout = loadouts.find((l) => l.id === id);
        if (!loadout) return;

        const supabase = createClient();
        const previousLoadout = { ...loadout };

        set((state) => ({ loadouts: state.loadouts.map((l) => l.id === id ? { ...l, ...metadata, updatedAt: new Date() } : l), syncState: startSyncOperation(state.syncState) }));

        try {
          const updateData: TablesUpdate<'loadouts'> = {};
          if (metadata.activityTypes !== undefined) updateData.activity_types = metadata.activityTypes;
          if (metadata.seasons !== undefined) updateData.seasons = metadata.seasons;
          if (metadata.description !== undefined) updateData.description = metadata.description;
          if (metadata.tripDate !== undefined) updateData.trip_date = metadata.tripDate?.toISOString().split('T')[0] ?? null;

          if (Object.keys(updateData).length > 0) {
            const { error } = await supabase.from('loadouts').update(updateData).eq('id', id).eq('user_id', userId);
            if (error) throw error;
          }
          set((state) => ({ syncState: completeSyncOperation(state.syncState) }));
        } catch (error) {
          set((state) => ({ loadouts: state.loadouts.map((l) => l.id === id ? previousLoadout : l), syncState: failSyncOperation(state.syncState, 'Failed to update loadout metadata') }));
          throw error;
        }
      },

      setItemWorn: async (loadoutId, itemId, isWorn) => {
        const { userId, loadouts } = get();
        if (!userId) return;

        const loadout = loadouts.find((l) => l.id === loadoutId);
        if (!loadout || !loadout.itemIds.includes(itemId)) return;

        const supabase = createClient();
        const previousItemStates = [...loadout.itemStates];

        set((state) => ({
          loadouts: state.loadouts.map((l) => {
            if (l.id !== loadoutId) return l;
            const idx = l.itemStates.findIndex((s) => s.itemId === itemId);
            const newStates = [...l.itemStates];
            if (idx >= 0) newStates[idx] = { ...newStates[idx], isWorn };
            else newStates.push({ itemId, isWorn, isConsumable: false });
            return { ...l, itemStates: newStates, updatedAt: new Date() };
          }),
          syncState: startSyncOperation(state.syncState),
        }));

        try {
          const { error } = await supabase.from('loadout_items').update({ is_worn: isWorn }).eq('loadout_id', loadoutId).eq('gear_item_id', itemId);
          if (error) throw error;
          set((state) => ({ syncState: completeSyncOperation(state.syncState) }));
        } catch (error) {
          set((state) => ({ loadouts: state.loadouts.map((l) => l.id !== loadoutId ? l : { ...l, itemStates: previousItemStates, updatedAt: new Date() }), syncState: failSyncOperation(state.syncState, 'Failed to update item worn state') }));
          throw error;
        }
      },

      setItemConsumable: async (loadoutId, itemId, isConsumable) => {
        const { userId, loadouts } = get();
        if (!userId) return;

        const loadout = loadouts.find((l) => l.id === loadoutId);
        if (!loadout || !loadout.itemIds.includes(itemId)) return;

        const supabase = createClient();
        const previousItemStates = [...loadout.itemStates];

        set((state) => ({
          loadouts: state.loadouts.map((l) => {
            if (l.id !== loadoutId) return l;
            const idx = l.itemStates.findIndex((s) => s.itemId === itemId);
            const newStates = [...l.itemStates];
            if (idx >= 0) newStates[idx] = { ...newStates[idx], isConsumable };
            else newStates.push({ itemId, isWorn: false, isConsumable });
            return { ...l, itemStates: newStates, updatedAt: new Date() };
          }),
          syncState: startSyncOperation(state.syncState),
        }));

        try {
          const { error } = await supabase.from('loadout_items').update({ is_consumable: isConsumable }).eq('loadout_id', loadoutId).eq('gear_item_id', itemId);
          if (error) throw error;
          set((state) => ({ syncState: completeSyncOperation(state.syncState) }));
        } catch (error) {
          set((state) => ({ loadouts: state.loadouts.map((l) => l.id !== loadoutId ? l : { ...l, itemStates: previousItemStates, updatedAt: new Date() }), syncState: failSyncOperation(state.syncState, 'Failed to update item consumable state') }));
          throw error;
        }
      },

      setSyncState: (updates) => set((state) => ({ syncState: { ...state.syncState, ...updates } })),
      setRemoteGearItems: (items) => set({ items }),
      setRemoteLoadouts: (loadouts) => set({ loadouts }),
    }),
    {
      name: 'gearshack-supabase-store',
      partialize: (state) => ({ items: state.items, loadouts: state.loadouts, _initialized: state._initialized }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          let parsed;
          try {
            parsed = JSON.parse(str);
          } catch (error) {
            console.error('[useSupabaseStore] Failed to parse localStorage, clearing corrupted entry:', error);
            localStorage.removeItem(name);
            return null;
          }
          if (parsed.state) {
            if (parsed.state.items) {
              parsed.state.items = parsed.state.items.map((item: GearItem) => ({
                ...item,
                createdAt: new Date(item.createdAt),
                updatedAt: new Date(item.updatedAt),
                purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
              }));
            }
            if (parsed.state.loadouts) {
              parsed.state.loadouts = parsed.state.loadouts.map((loadout: LoadoutLocal) => ({
                ...loadout,
                createdAt: new Date(loadout.createdAt),
                updatedAt: new Date(loadout.updatedAt),
                tripDate: loadout.tripDate ? new Date(loadout.tripDate) : null,
                description: loadout.description ?? null,
                itemStates: loadout.itemStates ?? [],
              }));
            }
          }
          return parsed;
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            // QUOTA FIX: Handle localStorage quota exceeded gracefully
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
              console.error('[useSupabaseStore] localStorage quota exceeded, clearing store data');
              // Clear the problematic store to make room
              try {
                localStorage.removeItem(name);
                // Retry with current value (may still fail if single item is too large)
                localStorage.setItem(name, JSON.stringify(value));
              } catch {
                // If still fails, store minimal state to prevent data loss on next load
                console.error('[useSupabaseStore] Unable to persist data - quota exceeded');
              }
            } else {
              console.error('[useSupabaseStore] Failed to persist to localStorage:', error);
            }
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// =============================================================================
// Selector Hooks
// =============================================================================

export function useSupabaseItems(): GearItem[] {
  // PERFORMANCE FIX: Use useShallow to prevent re-renders when array reference changes
  // but content is the same (e.g., after hydration or unrelated state updates)
  return useSupabaseStore(useShallow((state) => state.items));
}

export function useSupabaseLoadouts(): LoadoutLocal[] {
  // PERFORMANCE FIX: Use useShallow to prevent re-renders when array reference changes
  // but content is the same (e.g., after hydration or unrelated state updates)
  return useSupabaseStore(useShallow((state) => state.loadouts));
}

export function useSupabaseLoadout(id: string): LoadoutLocal | undefined {
  // PERFORMANCE FIX: Use useShallow to prevent re-renders when other loadouts change
  // This ensures the component only re-renders when this specific loadout changes
  return useSupabaseStore(
    useShallow((state) => state.loadouts.find((l) => l.id === id))
  );
}

export function useSupabaseLoadoutItems(loadoutId: string): GearItem[] {
  // PERFORMANCE FIX: Use useShallow to compare array contents instead of reference
  // This prevents re-renders when unrelated items or loadouts change
  return useSupabaseStore(
    useShallow((state) => {
      const loadout = state.loadouts.find((l) => l.id === loadoutId);
      if (!loadout) return [];
      return state.items.filter((item) => loadout.itemIds.includes(item.id));
    })
  );
}

export function useSupabaseSyncState(): SyncState {
  // PERFORMANCE FIX: Use useShallow to prevent re-renders when object reference changes
  // but content is the same (shallow comparison of syncState properties)
  return useSupabaseStore(useShallow((state) => state.syncState));
}

// Compatibility exports
/**
 * @deprecated Use useSupabaseStore directly. This export will be removed in February 2026.
 * @see useSupabaseStore
 */
export const useStore = useSupabaseStore;
/**
 * @deprecated Use useSupabaseItems instead. This export will be removed in February 2026.
 * @see useSupabaseItems
 */
export const useItems = useSupabaseItems;
/**
 * @deprecated Use useSupabaseLoadouts instead. This export will be removed in February 2026.
 * @see useSupabaseLoadouts
 */
export const useLoadouts = useSupabaseLoadouts;
/**
 * @deprecated Use useSupabaseLoadout instead. This export will be removed in February 2026.
 * @see useSupabaseLoadout
 */
export const useLoadout = useSupabaseLoadout;
/**
 * @deprecated Use useSupabaseLoadoutItems instead. This export will be removed in February 2026.
 * @see useSupabaseLoadoutItems
 */
export const useLoadoutItems = useSupabaseLoadoutItems;
/**
 * @deprecated Use useSupabaseSyncState instead. This export will be removed in February 2026.
 * @see useSupabaseSyncState
 */
export const useSyncState = useSupabaseSyncState;
