/**
 * Store Types and Interfaces
 *
 * Feature: 005-loadout-management
 * Constitution: Types MUST be defined in @/types directory
 */

import type { GearItem } from '@/types/gear';
import type { Loadout, ActivityType, Season } from '@/types/loadout';

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

  // ==========================================================================
  // Item Actions
  // ==========================================================================

  /**
   * Add a new gear item to the store
   * @returns The generated item ID
   */
  addItem: (item: Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'>) => string;

  /**
   * Update an existing gear item
   * @param id - Item ID to update
   * @param updates - Partial item data to merge
   */
  updateItem: (id: string, updates: Partial<Omit<GearItem, 'id' | 'createdAt'>>) => void;

  /**
   * Delete a gear item (also removes from all loadouts)
   * @param id - Item ID to delete
   */
  deleteItem: (id: string) => void;

  // ==========================================================================
  // Loadout Actions
  // ==========================================================================

  /**
   * Create a new loadout
   * @param name - Loadout name
   * @param tripDate - Optional trip date
   * @returns The generated loadout ID
   */
  createLoadout: (name: string, tripDate?: Date | null) => string;

  /**
   * Update loadout metadata (name, date, description)
   * @param id - Loadout ID
   * @param updates - Partial loadout data to merge
   */
  updateLoadout: (id: string, updates: Partial<Pick<Loadout, 'name' | 'tripDate' | 'description'>>) => void;

  /**
   * Delete a loadout
   * @param id - Loadout ID to delete
   */
  deleteLoadout: (id: string) => void;

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
  // Initialization
  // ==========================================================================

  /**
   * Initialize store with mock data (called once on first load)
   * @param items - Initial gear items
   */
  initializeWithMockData: (items: GearItem[]) => void;
}
