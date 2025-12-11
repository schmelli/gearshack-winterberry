/**
 * useSupabaseStore - Zustand Store with Supabase Sync
 *
 * Feature: 040-supabase-migration
 * Tasks: T033, T034, T035, T036
 *
 * Provides a zustand store compatible with the existing UI components
 * but backed by Supabase instead of Firebase.
 *
 * Replaces: hooks/useStore.ts (Firebase version)
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  gearItemToDbInsert,
  gearItemToDbUpdate,
} from '@/lib/supabase/transformers';
import type { GearItem } from '@/types/gear';
import type { TablesInsert, TablesUpdate } from '@/types/database';
import type { ActivityType, Season } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

interface LoadoutLocal {
  id: string;
  name: string;
  tripDate: Date | null;
  itemIds: string[];
  description: string | null;
  activityTypes: ActivityType[];
  seasons: Season[];
  itemStates: ItemState[];
  createdAt: Date;
  updatedAt: Date;
}

interface ItemState {
  itemId: string;
  isWorn: boolean;
  isConsumable: boolean;
}

interface SyncState {
  status: 'idle' | 'syncing' | 'error';
  error: string | null;
  lastSyncedAt: Date | null;
  pendingOperations: number;
}

const DEFAULT_SYNC_STATE: SyncState = {
  status: 'idle',
  error: null,
  lastSyncedAt: null,
  pendingOperations: 0,
};

interface SupabaseStore {
  // State
  items: GearItem[];
  loadouts: LoadoutLocal[];
  userId: string | null;
  _initialized: boolean;
  syncState: SyncState;

  // User Actions
  setUserId: (userId: string | null) => void;

  // Item Actions
  addItem: (item: Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateItem: (id: string, updates: Partial<GearItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // Loadout Actions
  createLoadout: (name: string, tripDate?: Date | null) => Promise<string>;
  updateLoadout: (id: string, updates: Partial<LoadoutLocal>) => Promise<void>;
  deleteLoadout: (id: string) => Promise<void>;
  addItemToLoadout: (loadoutId: string, itemId: string) => void;
  removeItemFromLoadout: (loadoutId: string, itemId: string) => void;
  updateLoadoutMetadata: (id: string, metadata: Partial<LoadoutLocal>) => void;

  // Item State Actions
  setItemWorn: (loadoutId: string, itemId: string, isWorn: boolean) => void;
  setItemConsumable: (loadoutId: string, itemId: string, isConsumable: boolean) => void;

  // Sync Actions
  setSyncState: (updates: Partial<SyncState>) => void;
  setRemoteGearItems: (items: GearItem[]) => void;
  setRemoteLoadouts: (loadouts: LoadoutLocal[]) => void;

  // Initialize
  initializeWithMockData: (items: GearItem[]) => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useSupabaseStore = create<SupabaseStore>()(
  persist(
    (set, get) => ({
      // State
      items: [],
      loadouts: [],
      userId: null,
      _initialized: false,
      syncState: DEFAULT_SYNC_STATE,

      // User Actions
      setUserId: (userId) => {
        set({ userId });
      },

      // Item Actions
      addItem: async (item) => {
        const { userId } = get();
        if (!userId) {
          toast.error('Please sign in to add items');
          throw new Error('User not authenticated');
        }

        const supabase = createClient();
        const id = crypto.randomUUID();
        const now = new Date();

        // Create optimistic item
        const newItem: GearItem = {
          ...item,
          id,
          createdAt: now,
          updatedAt: now,
        };

        // Optimistic update
        set((state) => ({
          items: [...state.items, newItem],
          syncState: { ...state.syncState, status: 'syncing', pendingOperations: state.syncState.pendingOperations + 1 },
        }));

        try {
          const insertData = gearItemToDbInsert(item, userId);
          insertData.id = id; // Use our generated ID

          const { error } = await supabase
            .from('gear_items')
            .insert(insertData as TablesInsert<'gear_items'>);

          if (error) throw error;

          set((state) => ({
            syncState: {
              ...state.syncState,
              status: 'idle',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
              lastSyncedAt: new Date(),
            },
          }));

          return id;
        } catch (error) {
          // Rollback
          set((state) => ({
            items: state.items.filter((i) => i.id !== id),
            syncState: {
              ...state.syncState,
              status: 'error',
              error: 'Failed to save item',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
            },
          }));
          toast.error('Failed to save item');
          console.error('[SupabaseStore] addItem error:', error);
          throw error;
        }
      },

      updateItem: async (id, updates) => {
        const { userId } = get();
        if (!userId) {
          toast.error('Please sign in to update items');
          return;
        }

        const supabase = createClient();
        const previousItem = get().items.find((item) => item.id === id);
        if (!previousItem) return;

        const now = new Date();

        // Optimistic update
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: now } : item
          ),
          syncState: { ...state.syncState, status: 'syncing', pendingOperations: state.syncState.pendingOperations + 1 },
        }));

        try {
          const updateData = gearItemToDbUpdate(updates);

          const { error } = await supabase
            .from('gear_items')
            .update(updateData as TablesUpdate<'gear_items'>)
            .eq('id', id)
            .eq('user_id', userId);

          if (error) throw error;

          set((state) => ({
            syncState: {
              ...state.syncState,
              status: 'idle',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
              lastSyncedAt: new Date(),
            },
          }));
        } catch (error) {
          // Rollback
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? previousItem : item
            ),
            syncState: {
              ...state.syncState,
              status: 'error',
              error: 'Failed to update item',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
            },
          }));
          toast.error('Failed to update item');
          console.error('[SupabaseStore] updateItem error:', error);
        }
      },

      deleteItem: async (id) => {
        const { userId } = get();
        if (!userId) {
          toast.error('Please sign in to delete items');
          return;
        }

        const supabase = createClient();
        const deletedItem = get().items.find((item) => item.id === id);
        const previousLoadouts = get().loadouts;

        if (!deletedItem) return;

        // Optimistic update
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          loadouts: state.loadouts.map((loadout) => ({
            ...loadout,
            itemIds: loadout.itemIds.filter((itemId) => itemId !== id),
            updatedAt: new Date(),
          })),
          syncState: { ...state.syncState, status: 'syncing', pendingOperations: state.syncState.pendingOperations + 1 },
        }));

        try {
          const { error } = await supabase
            .from('gear_items')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

          if (error) throw error;

          set((state) => ({
            syncState: {
              ...state.syncState,
              status: 'idle',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
              lastSyncedAt: new Date(),
            },
          }));
        } catch (error) {
          // Rollback
          set((state) => ({
            items: [...state.items, deletedItem].sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
            ),
            loadouts: previousLoadouts,
            syncState: {
              ...state.syncState,
              status: 'error',
              error: 'Failed to delete item',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
            },
          }));
          toast.error('Failed to delete item');
          console.error('[SupabaseStore] deleteItem error:', error);
        }
      },

      // Loadout Actions
      createLoadout: async (name, tripDate = null) => {
        const { userId } = get();
        if (!userId) {
          toast.error('Please sign in to create loadouts');
          throw new Error('User not authenticated');
        }

        const supabase = createClient();
        const id = crypto.randomUUID();
        const now = new Date();

        const newLoadout: LoadoutLocal = {
          id,
          name,
          tripDate,
          itemIds: [],
          description: null,
          activityTypes: [],
          seasons: [],
          itemStates: [],
          createdAt: now,
          updatedAt: now,
        };

        // Optimistic update
        set((state) => ({
          loadouts: [...state.loadouts, newLoadout],
          syncState: { ...state.syncState, status: 'syncing', pendingOperations: state.syncState.pendingOperations + 1 },
        }));

        try {
          const { error } = await supabase
            .from('loadouts')
            .insert({
              id,
              user_id: userId,
              name,
              trip_date: tripDate?.toISOString().split('T')[0] ?? null,
            });

          if (error) throw error;

          set((state) => ({
            syncState: {
              ...state.syncState,
              status: 'idle',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
              lastSyncedAt: new Date(),
            },
          }));

          return id;
        } catch (error) {
          // Rollback
          set((state) => ({
            loadouts: state.loadouts.filter((l) => l.id !== id),
            syncState: {
              ...state.syncState,
              status: 'error',
              error: 'Failed to save loadout',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
            },
          }));
          toast.error('Failed to save loadout');
          console.error('[SupabaseStore] createLoadout error:', error);
          throw error;
        }
      },

      updateLoadout: async (id, updates) => {
        const { userId } = get();
        if (!userId) return;

        const supabase = createClient();
        const previousLoadout = get().loadouts.find((l) => l.id === id);
        if (!previousLoadout) return;

        const now = new Date();

        // Optimistic update
        set((state) => ({
          loadouts: state.loadouts.map((loadout) =>
            loadout.id === id ? { ...loadout, ...updates, updatedAt: now } : loadout
          ),
        }));

        try {
          const updateData: TablesUpdate<'loadouts'> = {};
          if (updates.name !== undefined) updateData.name = updates.name;
          if (updates.description !== undefined) updateData.description = updates.description;
          if (updates.tripDate !== undefined) {
            updateData.trip_date = updates.tripDate?.toISOString().split('T')[0] ?? null;
          }

          const { error } = await supabase
            .from('loadouts')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId);

          if (error) throw error;
        } catch (error) {
          // Rollback
          set((state) => ({
            loadouts: state.loadouts.map((loadout) =>
              loadout.id === id ? previousLoadout : loadout
            ),
          }));
          toast.error('Failed to update loadout');
          console.error('[SupabaseStore] updateLoadout error:', error);
        }
      },

      deleteLoadout: async (id) => {
        const { userId } = get();
        if (!userId) return;

        const supabase = createClient();
        const deletedLoadout = get().loadouts.find((l) => l.id === id);
        if (!deletedLoadout) return;

        // Optimistic update
        set((state) => ({
          loadouts: state.loadouts.filter((loadout) => loadout.id !== id),
        }));

        try {
          const { error } = await supabase
            .from('loadouts')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

          if (error) throw error;
        } catch (error) {
          // Rollback
          set((state) => ({
            loadouts: [...state.loadouts, deletedLoadout].sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
            ),
          }));
          toast.error('Failed to delete loadout');
          console.error('[SupabaseStore] deleteLoadout error:', error);
        }
      },

      addItemToLoadout: (loadoutId, itemId) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => {
            if (loadout.id !== loadoutId) return loadout;
            if (loadout.itemIds.includes(itemId)) return loadout;
            return {
              ...loadout,
              itemIds: [...loadout.itemIds, itemId],
              updatedAt: new Date(),
            };
          }),
        }));
        // TODO: Sync with Supabase loadout_items table
      },

      removeItemFromLoadout: (loadoutId, itemId) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => {
            if (loadout.id !== loadoutId) return loadout;
            return {
              ...loadout,
              itemIds: loadout.itemIds.filter((id) => id !== itemId),
              updatedAt: new Date(),
            };
          }),
        }));
        // TODO: Sync with Supabase loadout_items table
      },

      updateLoadoutMetadata: (id, metadata) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => {
            if (loadout.id !== id) return loadout;
            return {
              ...loadout,
              ...metadata,
              updatedAt: new Date(),
            };
          }),
        }));
      },

      setItemWorn: (loadoutId, itemId, isWorn) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => {
            if (loadout.id !== loadoutId) return loadout;
            const existingIndex = loadout.itemStates.findIndex(s => s.itemId === itemId);
            const newItemStates = [...loadout.itemStates];

            if (existingIndex >= 0) {
              newItemStates[existingIndex] = { ...newItemStates[existingIndex], isWorn };
            } else {
              newItemStates.push({ itemId, isWorn, isConsumable: false });
            }

            return { ...loadout, itemStates: newItemStates, updatedAt: new Date() };
          }),
        }));
      },

      setItemConsumable: (loadoutId, itemId, isConsumable) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => {
            if (loadout.id !== loadoutId) return loadout;
            const existingIndex = loadout.itemStates.findIndex(s => s.itemId === itemId);
            const newItemStates = [...loadout.itemStates];

            if (existingIndex >= 0) {
              newItemStates[existingIndex] = { ...newItemStates[existingIndex], isConsumable };
            } else {
              newItemStates.push({ itemId, isWorn: false, isConsumable });
            }

            return { ...loadout, itemStates: newItemStates, updatedAt: new Date() };
          }),
        }));
      },

      setSyncState: (updates) => {
        set((state) => ({
          syncState: { ...state.syncState, ...updates },
        }));
      },

      setRemoteGearItems: (items) => {
        set({ items });
      },

      setRemoteLoadouts: (loadouts) => {
        set({ loadouts });
      },

      initializeWithMockData: (items) => {
        const state = get();
        if (!state._initialized && state.items.length === 0) {
          set({ items, _initialized: true });
        }
      },
    }),
    {
      name: 'gearshack-supabase-store',
      partialize: (state) => ({
        items: state.items,
        loadouts: state.loadouts,
        _initialized: state._initialized,
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
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
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);

// =============================================================================
// Selector Hooks
// =============================================================================

export function useSupabaseItems() {
  return useSupabaseStore((state) => state.items);
}

export function useSupabaseLoadouts() {
  return useSupabaseStore((state) => state.loadouts);
}

export function useSupabaseLoadout(id: string) {
  return useSupabaseStore((state) => state.loadouts.find((l) => l.id === id));
}

export function useSupabaseLoadoutItems(loadoutId: string) {
  return useSupabaseStore((state) => {
    const loadout = state.loadouts.find((l) => l.id === loadoutId);
    if (!loadout) return [];
    return state.items.filter((item) => loadout.itemIds.includes(item.id));
  });
}

export function useSupabaseSyncState() {
  return useSupabaseStore((state) => state.syncState);
}

// =============================================================================
// Compatibility Exports (match old useStore.ts API)
// =============================================================================

/** @deprecated Use useSupabaseStore directly */
export const useStore = useSupabaseStore;

/** @deprecated Use useSupabaseItems */
export const useItems = useSupabaseItems;

/** @deprecated Use useSupabaseLoadouts */
export const useLoadouts = useSupabaseLoadouts;

/** @deprecated Use useSupabaseLoadout */
export const useLoadout = useSupabaseLoadout;

/** @deprecated Use useSupabaseLoadoutItems */
export const useLoadoutItems = useSupabaseLoadoutItems;

/** @deprecated Use useSupabaseSyncState */
export const useSyncState = useSupabaseSyncState;
