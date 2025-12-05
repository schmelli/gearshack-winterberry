/**
 * Store Types and Interfaces
 *
 * Feature: 005-loadout-management
 * Constitution: Types MUST be defined in @/types directory
 */

import type { GearItem } from '@/types/gear';
import type { Loadout, ActivityType, Season } from '@/types/loadout';
import type { SyncState } from '@/types/sync';

// =============================================================================
// GearshackStore Interface
// =============================================================================

export interface GearshackStore {
  // ==========================================================================
  // State
  // ==========================================================================

  /** All gear items in the inventory */
  items: GearItem[];

  /** All user-created loadouts */
  loadouts: Loadout[];

  /** Whether store has been initialized (for migration check) */
  _initialized: boolean;

  /** Sync state for Firestore synchronization (Feature: 010-firestore-sync) */
  syncState: SyncState;

  // ==========================================================================
  // Item Actions (T013-T015: Now async with Firestore persistence)
  // ==========================================================================

  /**
   * Add a new gear item to the store (async - persists to Firestore)
   * @returns Promise resolving to the generated item ID
   */
  addItem: (item: Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;

  /**
   * Update an existing gear item (async - persists to Firestore)
   * @param id - Item ID to update
   * @param updates - Partial item data to merge
   */
  updateItem: (id: string, updates: Partial<Omit<GearItem, 'id' | 'createdAt'>>) => Promise<void>;

  /**
   * Delete a gear item (async - persists to Firestore, also removes from all loadouts)
   * @param id - Item ID to delete
   */
  deleteItem: (id: string) => Promise<void>;

  // ==========================================================================
  // Loadout Actions (T017: Now async with Firestore persistence)
  // ==========================================================================

  /**
   * Create a new loadout (async - persists to Firestore)
   * @param name - Loadout name
   * @param tripDate - Optional trip date
   * @returns Promise resolving to the generated loadout ID
   */
  createLoadout: (name: string, tripDate?: Date | null) => Promise<string>;

  /**
   * Update loadout metadata (async - persists to Firestore)
   * @param id - Loadout ID
   * @param updates - Partial loadout data to merge
   */
  updateLoadout: (id: string, updates: Partial<Pick<Loadout, 'name' | 'tripDate' | 'description'>>) => Promise<void>;

  /**
   * Delete a loadout (async - persists to Firestore)
   * @param id - Loadout ID to delete
   */
  deleteLoadout: (id: string) => Promise<void>;

  /**
   * Add an item to a loadout (idempotent - ignores duplicates)
   * @param loadoutId - Target loadout ID
   * @param itemId - Item ID to add
   */
  addItemToLoadout: (loadoutId: string, itemId: string) => void;

  /**
   * Remove an item from a loadout
   * @param loadoutId - Target loadout ID
   * @param itemId - Item ID to remove
   */
  removeItemFromLoadout: (loadoutId: string, itemId: string) => void;

  /**
   * Update loadout metadata (activity types, seasons) (FR-010)
   * @param id - Loadout ID
   * @param metadata - Activity types and/or seasons to set
   */
  updateLoadoutMetadata: (
    id: string,
    metadata: { activityTypes?: ActivityType[]; seasons?: Season[] }
  ) => void;

  // ==========================================================================
  // Item State Actions (Feature: 007-grand-polish-sprint)
  // ==========================================================================

  /**
   * Set worn state for an item in a loadout
   * @param loadoutId - Target loadout
   * @param itemId - Item to update
   * @param isWorn - New worn state
   */
  setItemWorn: (loadoutId: string, itemId: string, isWorn: boolean) => void;

  /**
   * Set consumable state for an item in a loadout
   * @param loadoutId - Target loadout
   * @param itemId - Item to update
   * @param isConsumable - New consumable state
   */
  setItemConsumable: (loadoutId: string, itemId: string, isConsumable: boolean) => void;

  // ==========================================================================
  // Sync Actions (Feature: 010-firestore-sync)
  // ==========================================================================

  /**
   * Update sync state with partial updates
   * @param updates - Partial sync state to merge
   */
  setSyncState: (updates: Partial<SyncState>) => void;

  /**
   * Replace all gear items with remote data from Firestore
   * @param items - Complete gear items array from Firestore
   */
  setRemoteGearItems: (items: GearItem[]) => void;

  /**
   * Replace all loadouts with remote data from Firestore
   * @param loadouts - Complete loadouts array from Firestore
   */
  setRemoteLoadouts: (loadouts: Loadout[]) => void;

  /**
   * Increment pending operations counter and set status to syncing
   */
  incrementPendingOps: () => void;

  /**
   * Decrement pending operations counter. Sets status to idle when reaching 0.
   */
  decrementPendingOps: () => void;

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize store with mock data (called once on first load)
   * @param items - Initial gear items
   */
  initializeWithMockData: (items: GearItem[]) => void;
}
