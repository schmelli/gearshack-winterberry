/**
 * useDependencyPrompt Hook Contract
 *
 * Feature: 037-gear-dependencies
 * Purpose: Define the interface for the dependency prompt modal hook
 */

import type { GearItem } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

/**
 * State for a single dependency in the prompt
 */
export interface DependencyPromptItem {
  /** The gear item */
  item: GearItem;
  /** Whether this item is selected for addition */
  isSelected: boolean;
  /** Whether this is a direct dependency (vs transitive) */
  isDirect: boolean;
  /** Source item that requires this dependency */
  sourceItemName: string;
}

/**
 * Return type for the useDependencyPrompt hook
 */
export interface UseDependencyPromptReturn {
  // === State ===

  /** Whether the prompt modal is currently open */
  isOpen: boolean;

  /** List of pending dependencies to show in the modal */
  pendingDependencies: DependencyPromptItem[];

  /** The item that triggered the dependency check */
  triggeringItem: GearItem | null;

  /** Total count of missing dependencies */
  totalCount: number;

  /** Count of currently selected dependencies */
  selectedCount: number;

  // === Actions ===

  /**
   * Check for dependencies and open modal if any are missing.
   * Called before adding an item to the loadout.
   *
   * @param itemId - The item being added to the loadout
   * @returns true if modal was opened (has dependencies), false otherwise
   *
   * @example
   * const hasPrompt = triggerCheck('packraft-123');
   * if (!hasPrompt) {
   *   // No dependencies, add item directly
   *   addItemToLoadout(loadoutId, 'packraft-123');
   * }
   * // If hasPrompt is true, modal handles the flow
   */
  triggerCheck: (itemId: string) => boolean;

  /**
   * Toggle selection state of a specific dependency
   *
   * @param itemId - ID of the dependency to toggle
   */
  toggleSelection: (itemId: string) => void;

  /**
   * Select all pending dependencies
   */
  selectAll: () => void;

  /**
   * Deselect all pending dependencies
   */
  deselectAll: () => void;

  /**
   * Add all pending dependencies to the loadout and close modal.
   * Adds the triggering item + all dependency items.
   */
  onAddAll: () => void;

  /**
   * Add only selected dependencies to the loadout and close modal.
   * Adds the triggering item + selected dependency items.
   */
  onAddSelected: () => void;

  /**
   * Skip adding dependencies and close modal.
   * Adds only the triggering item.
   */
  onSkip: () => void;

  /**
   * Cancel the operation entirely.
   * Does not add the triggering item or any dependencies.
   */
  onCancel: () => void;
}

// =============================================================================
// Hook Options
// =============================================================================

/**
 * Options for initializing the useDependencyPrompt hook
 */
export interface UseDependencyPromptOptions {
  /** ID of the loadout being edited */
  loadoutId: string;

  /** Function to add items to the loadout */
  addItemToLoadout: (loadoutId: string, itemId: string) => void;

  /** Current item IDs in the loadout (for dependency filtering) */
  currentLoadoutItemIds: string[];

  /** All available gear items (for dependency resolution) */
  allItems: GearItem[];
}

// =============================================================================
// Hook Declaration
// =============================================================================

/**
 * Hook for managing the dependency prompt modal state and actions.
 *
 * @param options - Configuration options
 * @returns Hook state and actions
 *
 * @example
 * function LoadoutBuilder({ loadoutId }) {
 *   const loadout = useLoadout(loadoutId);
 *   const allItems = useItems();
 *   const { addItemToLoadout } = useStore();
 *
 *   const dependencyPrompt = useDependencyPrompt({
 *     loadoutId,
 *     addItemToLoadout,
 *     currentLoadoutItemIds: loadout.itemIds,
 *     allItems,
 *   });
 *
 *   const handleAddItem = (itemId: string) => {
 *     const hasPrompt = dependencyPrompt.triggerCheck(itemId);
 *     if (!hasPrompt) {
 *       addItemToLoadout(loadoutId, itemId);
 *       toast.success('Item added');
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <LoadoutPicker onAddItem={handleAddItem} ... />
 *       <DependencyPromptDialog {...dependencyPrompt} />
 *     </>
 *   );
 * }
 */
export type UseDependencyPromptFn = (
  options: UseDependencyPromptOptions
) => UseDependencyPromptReturn;
