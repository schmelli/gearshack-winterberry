/**
 * useStore - Zustand Store with localStorage Persistence + Firestore Sync
 *
 * Feature: 005-loadout-management, 010-firestore-sync
 * Constitution: ALL business logic MUST reside in dedicated hook files under `hooks/`
 *
 * Implements FR-001, FR-002, FR-003, FR-004
 * Implements T013-T017: Firestore persistence for all CRUD operations
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import type { GearItem } from '@/types/gear';
import type { Loadout } from '@/types/loadout';
import type { GearshackStore } from '@/types/store';
import { DEFAULT_SYNC_STATE } from '@/types/sync';
import { auth, db } from '@/lib/firebase/config';
import {
  prepareGearItemForFirestore,
  prepareLoadoutForFirestore,
} from '@/lib/firebase/adapter';
import {
  markPendingGearWrite,
  clearPendingGearWrite,
  markPendingLoadoutWrite,
  clearPendingLoadoutWrite,
} from '@/hooks/useFirestoreSync';

// =============================================================================
// UUID Generator
// =============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useStore = create<GearshackStore>()(
  persist(
    (set, get) => ({
      // =========================================================================
      // State
      // =========================================================================
      items: [],
      loadouts: [],
      _initialized: false,
      syncState: DEFAULT_SYNC_STATE,

      // =========================================================================
      // Item Actions (T013-T015: Firestore Persistence)
      // =========================================================================

      addItem: async (item) => {
        const id = generateId();
        const now = new Date();
        const newItem: GearItem = {
          ...item,
          id,
          createdAt: now,
          updatedAt: now,
        };

        // Optimistic update - apply immediately
        set((state) => ({
          items: [...state.items, newItem],
        }));

        // Persist to Firestore if user is logged in
        const userId = auth.currentUser?.uid;
        if (userId) {
          markPendingGearWrite(id);
          try {
            const docRef = doc(db, `userBase/${userId}/gearInventory`, id);
            await setDoc(docRef, prepareGearItemForFirestore(newItem));
            console.log(`[useStore] Item ${id} saved to Firestore`);
          } catch (error) {
            // Rollback - remove item from local state
            set((state) => ({
              items: state.items.filter((i) => i.id !== id),
            }));
            set((state) => ({
              syncState: {
                ...state.syncState,
                status: 'error',
                error: 'Failed to save item',
              },
            }));
            toast.error('Failed to save item to cloud');
            console.error('[useStore] addItem error:', error);
          } finally {
            clearPendingGearWrite(id);
          }
        }

        return id;
      },

      updateItem: async (id, updates) => {
        // Store previous state for rollback
        const previousItem = get().items.find((item) => item.id === id);
        if (!previousItem) {
          console.warn(`[useStore] updateItem: Item ${id} not found`);
          return;
        }

        // Optimistic update - apply immediately
        const now = new Date();
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: now } : item
          ),
        }));

        // Persist to Firestore if user is logged in
        const userId = auth.currentUser?.uid;
        if (userId) {
          markPendingGearWrite(id);
          try {
            const docRef = doc(db, `userBase/${userId}/gearInventory`, id);
            await updateDoc(docRef, {
              ...updates,
              updated_at: now,
            });
            console.log(`[useStore] Item ${id} updated in Firestore`);
          } catch (error) {
            // Rollback - restore previous state
            set((state) => ({
              items: state.items.map((item) =>
                item.id === id ? previousItem : item
              ),
            }));
            set((state) => ({
              syncState: {
                ...state.syncState,
                status: 'error',
                error: 'Failed to update item',
              },
            }));
            toast.error('Failed to update item in cloud');
            console.error('[useStore] updateItem error:', error);
          } finally {
            clearPendingGearWrite(id);
          }
        }
      },

      deleteItem: async (id) => {
        // Store item and affected loadouts for rollback
        const deletedItem = get().items.find((item) => item.id === id);
        const previousLoadouts = get().loadouts;

        if (!deletedItem) {
          console.warn(`[useStore] deleteItem: Item ${id} not found`);
          return;
        }

        // Optimistic update - remove immediately
        set((state) => ({
          // Remove item from items array
          items: state.items.filter((item) => item.id !== id),
          // Remove item ID from all loadouts
          loadouts: state.loadouts.map((loadout) => ({
            ...loadout,
            itemIds: loadout.itemIds.filter((itemId) => itemId !== id),
            updatedAt: new Date(),
          })),
        }));

        // Persist to Firestore if user is logged in
        const userId = auth.currentUser?.uid;
        if (userId) {
          markPendingGearWrite(id);
          try {
            const docRef = doc(db, `userBase/${userId}/gearInventory`, id);
            await deleteDoc(docRef);
            console.log(`[useStore] Item ${id} deleted from Firestore`);
          } catch (error) {
            // Rollback - restore item and loadouts
            set((state) => ({
              items: [...state.items, deletedItem].sort(
                (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
              ),
              loadouts: previousLoadouts,
            }));
            set((state) => ({
              syncState: {
                ...state.syncState,
                status: 'error',
                error: 'Failed to delete item',
              },
            }));
            toast.error('Failed to delete item from cloud');
            console.error('[useStore] deleteItem error:', error);
          } finally {
            clearPendingGearWrite(id);
          }
        }
      },

      // =========================================================================
      // Loadout Actions (T017: Firestore Persistence)
      // =========================================================================

      createLoadout: async (name, tripDate = null) => {
        const id = generateId();
        const now = new Date();
        const newLoadout: Loadout = {
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

        // Optimistic update - apply immediately
        set((state) => ({
          loadouts: [...state.loadouts, newLoadout],
        }));

        // Persist to Firestore if user is logged in
        const userId = auth.currentUser?.uid;
        if (userId) {
          markPendingLoadoutWrite(id);
          try {
            const docRef = doc(db, `userBase/${userId}/loadouts`, id);
            await setDoc(docRef, prepareLoadoutForFirestore(newLoadout));
            console.log(`[useStore] Loadout ${id} saved to Firestore`);
          } catch (error) {
            // Rollback - remove loadout from local state
            set((state) => ({
              loadouts: state.loadouts.filter((l) => l.id !== id),
            }));
            set((state) => ({
              syncState: {
                ...state.syncState,
                status: 'error',
                error: 'Failed to save loadout',
              },
            }));
            toast.error('Failed to save loadout to cloud');
            console.error('[useStore] createLoadout error:', error);
          } finally {
            clearPendingLoadoutWrite(id);
          }
        }

        return id;
      },

      updateLoadout: async (id, updates) => {
        // Store previous state for rollback
        const previousLoadout = get().loadouts.find((l) => l.id === id);
        if (!previousLoadout) {
          console.warn(`[useStore] updateLoadout: Loadout ${id} not found`);
          return;
        }

        // Optimistic update - apply immediately
        const now = new Date();
        set((state) => ({
          loadouts: state.loadouts.map((loadout) =>
            loadout.id === id
              ? { ...loadout, ...updates, updatedAt: now }
              : loadout
          ),
        }));

        // Persist to Firestore if user is logged in
        const userId = auth.currentUser?.uid;
        if (userId) {
          markPendingLoadoutWrite(id);
          try {
            const docRef = doc(db, `userBase/${userId}/loadouts`, id);
            await updateDoc(docRef, {
              ...updates,
              updated_at: now,
            });
            console.log(`[useStore] Loadout ${id} updated in Firestore`);
          } catch (error) {
            // Rollback - restore previous state
            set((state) => ({
              loadouts: state.loadouts.map((loadout) =>
                loadout.id === id ? previousLoadout : loadout
              ),
            }));
            set((state) => ({
              syncState: {
                ...state.syncState,
                status: 'error',
                error: 'Failed to update loadout',
              },
            }));
            toast.error('Failed to update loadout in cloud');
            console.error('[useStore] updateLoadout error:', error);
          } finally {
            clearPendingLoadoutWrite(id);
          }
        }
      },

      deleteLoadout: async (id) => {
        // Store loadout for rollback
        const deletedLoadout = get().loadouts.find((l) => l.id === id);
        if (!deletedLoadout) {
          console.warn(`[useStore] deleteLoadout: Loadout ${id} not found`);
          return;
        }

        // Optimistic update - remove immediately
        set((state) => ({
          loadouts: state.loadouts.filter((loadout) => loadout.id !== id),
        }));

        // Persist to Firestore if user is logged in
        const userId = auth.currentUser?.uid;
        if (userId) {
          markPendingLoadoutWrite(id);
          try {
            const docRef = doc(db, `userBase/${userId}/loadouts`, id);
            await deleteDoc(docRef);
            console.log(`[useStore] Loadout ${id} deleted from Firestore`);
          } catch (error) {
            // Rollback - restore loadout
            set((state) => ({
              loadouts: [...state.loadouts, deletedLoadout].sort(
                (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
              ),
            }));
            set((state) => ({
              syncState: {
                ...state.syncState,
                status: 'error',
                error: 'Failed to delete loadout',
              },
            }));
            toast.error('Failed to delete loadout from cloud');
            console.error('[useStore] deleteLoadout error:', error);
          } finally {
            clearPendingLoadoutWrite(id);
          }
        }
      },

      addItemToLoadout: (loadoutId, itemId) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => {
            if (loadout.id !== loadoutId) return loadout;
            // Idempotent: ignore if item already in loadout (FR-026)
            if (loadout.itemIds.includes(itemId)) return loadout;
            return {
              ...loadout,
              itemIds: [...loadout.itemIds, itemId],
              updatedAt: new Date(),
            };
          }),
        }));
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

      // =========================================================================
      // Item State Actions (Feature: 007-grand-polish-sprint)
      // =========================================================================

      setItemWorn: (loadoutId, itemId, isWorn) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => {
            if (loadout.id !== loadoutId) return loadout;
            // Find existing state or create new one
            const existingIndex = loadout.itemStates.findIndex(s => s.itemId === itemId);
            const newItemStates = [...loadout.itemStates];

            if (existingIndex >= 0) {
              newItemStates[existingIndex] = {
                ...newItemStates[existingIndex],
                isWorn,
              };
            } else {
              newItemStates.push({
                itemId,
                isWorn,
                isConsumable: false,
              });
            }

            return {
              ...loadout,
              itemStates: newItemStates,
              updatedAt: new Date(),
            };
          }),
        }));
      },

      setItemConsumable: (loadoutId, itemId, isConsumable) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => {
            if (loadout.id !== loadoutId) return loadout;
            // Find existing state or create new one
            const existingIndex = loadout.itemStates.findIndex(s => s.itemId === itemId);
            const newItemStates = [...loadout.itemStates];

            if (existingIndex >= 0) {
              newItemStates[existingIndex] = {
                ...newItemStates[existingIndex],
                isConsumable,
              };
            } else {
              newItemStates.push({
                itemId,
                isWorn: false,
                isConsumable,
              });
            }

            return {
              ...loadout,
              itemStates: newItemStates,
              updatedAt: new Date(),
            };
          }),
        }));
      },

      // =========================================================================
      // Sync Actions (Feature: 010-firestore-sync)
      // =========================================================================

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

      incrementPendingOps: () => {
        set((state) => ({
          syncState: {
            ...state.syncState,
            status: 'syncing',
            pendingOperations: state.syncState.pendingOperations + 1,
          },
        }));
      },

      decrementPendingOps: () => {
        set((state) => {
          const newPending = Math.max(0, state.syncState.pendingOperations - 1);
          return {
            syncState: {
              ...state.syncState,
              status: newPending === 0 ? 'idle' : 'syncing',
              pendingOperations: newPending,
              lastSyncedAt: newPending === 0 ? new Date() : state.syncState.lastSyncedAt,
            },
          };
        });
      },

      // =========================================================================
      // Initialization
      // =========================================================================

      initializeWithMockData: (items) => {
        const state = get();
        // Only initialize if store is empty (first load)
        if (!state._initialized && state.items.length === 0) {
          set({
            items,
            _initialized: true,
          });
        }
      },
    }),
    {
      name: 'gearshack-store',
      // Don't persist syncState - it's transient
      partialize: (state) => ({
        items: state.items,
        loadouts: state.loadouts,
        _initialized: state._initialized,
      }),
      // Handle Date serialization/deserialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Rehydrate Date objects
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
              parsed.state.loadouts = parsed.state.loadouts.map((loadout: Loadout) => ({
                ...loadout,
                createdAt: new Date(loadout.createdAt),
                updatedAt: new Date(loadout.updatedAt),
                tripDate: loadout.tripDate ? new Date(loadout.tripDate) : null,
                // Migration: Add default values for new fields (Feature: 007)
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
// Selector Hooks for Performance
// =============================================================================

/**
 * Get all items from the store
 */
export function useItems() {
  return useStore((state) => state.items);
}

/**
 * Get all loadouts from the store
 */
export function useLoadouts() {
  return useStore((state) => state.loadouts);
}

/**
 * Get a specific loadout by ID
 */
export function useLoadout(id: string) {
  return useStore((state) => state.loadouts.find((l) => l.id === id));
}

/**
 * Get items for a specific loadout
 */
export function useLoadoutItems(loadoutId: string) {
  return useStore((state) => {
    const loadout = state.loadouts.find((l) => l.id === loadoutId);
    if (!loadout) return [];
    return state.items.filter((item) => loadout.itemIds.includes(item.id));
  });
}

/**
 * Get sync state from the store (Feature: 010-firestore-sync)
 */
export function useSyncState() {
  return useStore((state) => state.syncState);
}
