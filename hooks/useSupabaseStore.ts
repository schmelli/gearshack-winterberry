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
import { getTranslation } from '@/lib/translations';

// Create translator for store messages (runs outside React context)
const t = getTranslation('Store');
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
  /** Hero image URL from AI generation (Feature 048) */
  heroImageUrl: string | null;
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
  createLoadout: (
    name: string,
    tripDate?: Date | null,
    options?: {
      description?: string;
      seasons?: Season[];
      activityTypes?: ActivityType[];
    }
  ) => Promise<string>;
  updateLoadout: (id: string, updates: Partial<LoadoutLocal>) => Promise<void>;
  deleteLoadout: (id: string) => Promise<void>;
  addItemToLoadout: (loadoutId: string, itemId: string) => Promise<void>;
  removeItemFromLoadout: (loadoutId: string, itemId: string) => Promise<void>;
  updateLoadoutMetadata: (id: string, metadata: Partial<LoadoutLocal>) => Promise<void>;

  // Item State Actions
  setItemWorn: (loadoutId: string, itemId: string, isWorn: boolean) => Promise<void>;
  setItemConsumable: (loadoutId: string, itemId: string, isConsumable: boolean) => Promise<void>;

  // Sync Actions
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
        console.log('[SupabaseStore] addItem called, userId:', userId);
        if (!userId) {
          toast.error(t('signInToAdd'));
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
          console.log('[SupabaseStore] Inserting gear item:', { id, userId, name: item.name });

          const { error } = await supabase
            .from('gear_items')
            .insert(insertData as TablesInsert<'gear_items'>);

          if (error) {
            console.error('[SupabaseStore] Supabase insert error:', error);
            throw error;
          }

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
          toast.error(t('saveItemFailed'));
          console.error('[SupabaseStore] addItem error:', error);
          throw error;
        }
      },

      updateItem: async (id, updates) => {
        const { userId } = get();
        if (!userId) {
          toast.error(t('signInToUpdate'));
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
          toast.error(t('updateItemFailed'));
          console.error('[SupabaseStore] updateItem error:', error);
        }
      },

      deleteItem: async (id) => {
        const { userId } = get();
        if (!userId) {
          toast.error(t('signInToDelete'));
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
          toast.error(t('deleteItemFailed'));
          console.error('[SupabaseStore] deleteItem error:', error);
        }
      },

      // Loadout Actions
      createLoadout: async (name, tripDate = null, options = {}) => {
        const { userId } = get();
        if (!userId) {
          toast.error(t('signInToCreateLoadout'));
          throw new Error('User not authenticated');
        }

        const supabase = createClient();
        const id = crypto.randomUUID();
        const now = new Date();

        const { description = '', seasons = [], activityTypes = [] } = options;

        const newLoadout: LoadoutLocal = {
          id,
          name,
          tripDate,
          itemIds: [],
          description: description || null,
          activityTypes,
          seasons,
          itemStates: [],
          heroImageUrl: null, // New loadouts don't have hero images yet
          createdAt: now,
          updatedAt: now,
        };

        // Optimistic update
        set((state) => ({
          loadouts: [...state.loadouts, newLoadout],
          syncState: { ...state.syncState, status: 'syncing', pendingOperations: state.syncState.pendingOperations + 1 },
        }));

        try {
          // Build insert data object - only include optional fields if they have values
          const insertData: {
            id: string;
            user_id: string;
            name: string;
            trip_date?: string | null;
            description?: string | null;
            seasons?: typeof seasons;
            activity_types?: typeof activityTypes;
          } = {
            id,
            user_id: userId,
            name,
          };

          // Add optional fields only if they have values
          if (tripDate) {
            insertData.trip_date = tripDate.toISOString().split('T')[0];
          }
          if (description) {
            insertData.description = description;
          }
          if (seasons.length > 0) {
            insertData.seasons = seasons;
          }
          if (activityTypes.length > 0) {
            insertData.activity_types = activityTypes;
          }

          const { error } = await supabase.from('loadouts').insert(insertData);

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
          toast.error(t('saveLoadoutFailed'));
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
          toast.error(t('updateLoadoutFailed'));
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
          toast.error(t('deleteLoadoutFailed'));
          console.error('[SupabaseStore] deleteLoadout error:', error);
        }
      },

      addItemToLoadout: async (loadoutId, itemId) => {
        const { userId } = get();
        if (!userId) return;

        const loadout = get().loadouts.find((l) => l.id === loadoutId);
        if (!loadout || loadout.itemIds.includes(itemId)) return;

        const supabase = createClient();

        // Optimistic update
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => {
            if (loadout.id !== loadoutId) return loadout;
            if (loadout.itemIds.includes(itemId)) return loadout;
            return {
              ...loadout,
              itemIds: [...loadout.itemIds, itemId],
              itemStates: [...loadout.itemStates, { itemId, isWorn: false, isConsumable: false }],
              updatedAt: new Date(),
            };
          }),
          syncState: { ...state.syncState, status: 'syncing', pendingOperations: state.syncState.pendingOperations + 1 },
        }));

        try {
          // Insert into loadout_items table
          const { error } = await supabase
            .from('loadout_items')
            .insert({
              loadout_id: loadoutId,
              gear_item_id: itemId,
              quantity: 1,
              is_worn: false,
              is_consumable: false,
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
        } catch (error) {
          // Rollback optimistic update
          set((state) => ({
            loadouts: state.loadouts.map((loadout) => {
              if (loadout.id !== loadoutId) return loadout;
              return {
                ...loadout,
                itemIds: loadout.itemIds.filter((id) => id !== itemId),
                itemStates: loadout.itemStates.filter((s) => s.itemId !== itemId),
                updatedAt: new Date(),
              };
            }),
            syncState: {
              ...state.syncState,
              status: 'error',
              error: 'Failed to add item to loadout',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
            },
          }));
          console.error('[SupabaseStore] addItemToLoadout error:', error);
          throw error;
        }
      },

      removeItemFromLoadout: async (loadoutId, itemId) => {
        const { userId } = get();
        if (!userId) return;

        const loadout = get().loadouts.find((l) => l.id === loadoutId);
        if (!loadout || !loadout.itemIds.includes(itemId)) return;

        const supabase = createClient();

        // Store previous state for rollback
        const previousItemIds = [...loadout.itemIds];
        const previousItemStates = [...loadout.itemStates];

        // Optimistic update
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => {
            if (loadout.id !== loadoutId) return loadout;
            return {
              ...loadout,
              itemIds: loadout.itemIds.filter((id) => id !== itemId),
              itemStates: loadout.itemStates.filter((s) => s.itemId !== itemId),
              updatedAt: new Date(),
            };
          }),
          syncState: { ...state.syncState, status: 'syncing', pendingOperations: state.syncState.pendingOperations + 1 },
        }));

        try {
          // Delete from loadout_items table
          const { error } = await supabase
            .from('loadout_items')
            .delete()
            .eq('loadout_id', loadoutId)
            .eq('gear_item_id', itemId);

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
          // Rollback optimistic update
          set((state) => ({
            loadouts: state.loadouts.map((loadout) => {
              if (loadout.id !== loadoutId) return loadout;
              return {
                ...loadout,
                itemIds: previousItemIds,
                itemStates: previousItemStates,
                updatedAt: new Date(),
              };
            }),
            syncState: {
              ...state.syncState,
              status: 'error',
              error: 'Failed to remove item from loadout',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
            },
          }));
          console.error('[SupabaseStore] removeItemFromLoadout error:', error);
          throw error;
        }
      },

      updateLoadoutMetadata: async (id, metadata) => {
        const { userId } = get();
        if (!userId) return;

        const loadout = get().loadouts.find((l) => l.id === id);
        if (!loadout) return;

        const supabase = createClient();
        const previousLoadout = { ...loadout };

        // Optimistic update
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => {
            if (loadout.id !== id) return loadout;
            return {
              ...loadout,
              ...metadata,
              updatedAt: new Date(),
            };
          }),
          syncState: { ...state.syncState, status: 'syncing', pendingOperations: state.syncState.pendingOperations + 1 },
        }));

        try {
          // Build update data for loadouts table
          const updateData: TablesUpdate<'loadouts'> = {};
          if (metadata.activityTypes !== undefined) {
            updateData.activity_types = metadata.activityTypes;
          }
          if (metadata.seasons !== undefined) {
            updateData.seasons = metadata.seasons;
          }
          if (metadata.description !== undefined) {
            updateData.description = metadata.description;
          }
          if (metadata.tripDate !== undefined) {
            updateData.trip_date = metadata.tripDate?.toISOString().split('T')[0] ?? null;
          }

          // Only update if there's something to update
          if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
              .from('loadouts')
              .update(updateData)
              .eq('id', id)
              .eq('user_id', userId);

            if (error) throw error;
          }

          set((state) => ({
            syncState: {
              ...state.syncState,
              status: 'idle',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
              lastSyncedAt: new Date(),
            },
          }));
        } catch (error) {
          // Rollback optimistic update
          set((state) => ({
            loadouts: state.loadouts.map((loadout) => {
              if (loadout.id !== id) return loadout;
              return previousLoadout;
            }),
            syncState: {
              ...state.syncState,
              status: 'error',
              error: 'Failed to update loadout metadata',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
            },
          }));
          console.error('[SupabaseStore] updateLoadoutMetadata error:', error);
          throw error;
        }
      },

      setItemWorn: async (loadoutId, itemId, isWorn) => {
        const { userId } = get();
        if (!userId) return;

        const loadout = get().loadouts.find((l) => l.id === loadoutId);
        if (!loadout || !loadout.itemIds.includes(itemId)) return;

        const supabase = createClient();
        const previousItemStates = [...loadout.itemStates];

        // Optimistic update
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
          syncState: { ...state.syncState, status: 'syncing', pendingOperations: state.syncState.pendingOperations + 1 },
        }));

        try {
          // Update loadout_items table
          const { error } = await supabase
            .from('loadout_items')
            .update({ is_worn: isWorn })
            .eq('loadout_id', loadoutId)
            .eq('gear_item_id', itemId);

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
          // Rollback optimistic update
          set((state) => ({
            loadouts: state.loadouts.map((loadout) => {
              if (loadout.id !== loadoutId) return loadout;
              return { ...loadout, itemStates: previousItemStates, updatedAt: new Date() };
            }),
            syncState: {
              ...state.syncState,
              status: 'error',
              error: 'Failed to update item worn state',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
            },
          }));
          console.error('[SupabaseStore] setItemWorn error:', error);
          throw error;
        }
      },

      setItemConsumable: async (loadoutId, itemId, isConsumable) => {
        const { userId } = get();
        if (!userId) return;

        const loadout = get().loadouts.find((l) => l.id === loadoutId);
        if (!loadout || !loadout.itemIds.includes(itemId)) return;

        const supabase = createClient();
        const previousItemStates = [...loadout.itemStates];

        // Optimistic update
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
          syncState: { ...state.syncState, status: 'syncing', pendingOperations: state.syncState.pendingOperations + 1 },
        }));

        try {
          // Update loadout_items table
          const { error } = await supabase
            .from('loadout_items')
            .update({ is_consumable: isConsumable })
            .eq('loadout_id', loadoutId)
            .eq('gear_item_id', itemId);

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
          // Rollback optimistic update
          set((state) => ({
            loadouts: state.loadouts.map((loadout) => {
              if (loadout.id !== loadoutId) return loadout;
              return { ...loadout, itemStates: previousItemStates, updatedAt: new Date() };
            }),
            syncState: {
              ...state.syncState,
              status: 'error',
              error: 'Failed to update item consumable state',
              pendingOperations: Math.max(0, state.syncState.pendingOperations - 1),
            },
          }));
          console.error('[SupabaseStore] setItemConsumable error:', error);
          throw error;
        }
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
