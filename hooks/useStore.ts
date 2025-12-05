/**
 * useStore - Zustand Store with localStorage Persistence
 *
 * Feature: 005-loadout-management
 * Constitution: ALL business logic MUST reside in dedicated hook files under `hooks/`
 *
 * Implements FR-001, FR-002, FR-003, FR-004
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GearItem } from '@/types/gear';
import type { Loadout } from '@/types/loadout';
import type { GearshackStore } from '@/types/store';

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

      // =========================================================================
      // Item Actions
      // =========================================================================

      addItem: (item) => {
        const id = generateId();
        const now = new Date();
        const newItem: GearItem = {
          ...item,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          items: [...state.items, newItem],
        }));
        return id;
      },

      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date() }
              : item
          ),
        }));
      },

      deleteItem: (id) => {
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
      },

      // =========================================================================
      // Loadout Actions
      // =========================================================================

      createLoadout: (name, tripDate = null) => {
        const id = generateId();
        const now = new Date();
        const newLoadout: Loadout = {
          id,
          name,
          tripDate,
          itemIds: [],
          description: null,
          itemStates: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          loadouts: [...state.loadouts, newLoadout],
        }));
        return id;
      },

      updateLoadout: (id, updates) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) =>
            loadout.id === id
              ? { ...loadout, ...updates, updatedAt: new Date() }
              : loadout
          ),
        }));
      },

      deleteLoadout: (id) => {
        set((state) => ({
          loadouts: state.loadouts.filter((loadout) => loadout.id !== id),
        }));
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
