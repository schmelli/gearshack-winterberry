/**
 * useDependencyPrompt Hook
 *
 * Feature: 037-gear-dependencies
 * Tasks: T023-T026, T031-T034
 * Constitution: All form/business logic MUST reside in hooks
 *
 * Manages the dependency prompt modal state when adding items
 * to loadouts. Detects missing dependencies and provides
 * actions for Add All, Add Selected, Skip, and Cancel.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { GearItem } from '@/types/gear';
import {
  createItemsMap,
  checkMissingDependencies,
  resolveDependencies,
} from '@/lib/dependency-utils';
import { formatWeightForDisplay } from '@/lib/gear-utils';

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

/**
 * Return type for the useDependencyPrompt hook
 */
export interface UseDependencyPromptReturn {
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
  /** Check for dependencies and open modal if any are missing */
  triggerCheck: (itemId: string) => boolean;
  /** Toggle selection state of a specific dependency */
  toggleSelection: (itemId: string) => void;
  /** Select all pending dependencies */
  selectAll: () => void;
  /** Deselect all pending dependencies */
  deselectAll: () => void;
  /** Add all pending dependencies to the loadout and close modal */
  onAddAll: () => void;
  /** Add only selected dependencies to the loadout and close modal */
  onAddSelected: () => void;
  /** Skip adding dependencies and close modal (add only triggering item) */
  onSkip: () => void;
  /** Cancel the operation entirely (don't add anything) */
  onCancel: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useDependencyPrompt(
  options: UseDependencyPromptOptions
): UseDependencyPromptReturn {
  const { loadoutId, addItemToLoadout, currentLoadoutItemIds, allItems } =
    options;

  // Create items map for efficient lookup
  const itemsMap = useMemo(() => createItemsMap(allItems), [allItems]);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [triggeringItem, setTriggeringItem] = useState<GearItem | null>(null);
  const [pendingDependencies, setPendingDependencies] = useState<
    DependencyPromptItem[]
  >([]);

  // Computed values
  const totalCount = pendingDependencies.length;
  const selectedCount = pendingDependencies.filter((d) => d.isSelected).length;

  /**
   * Check for dependencies and open modal if any are missing.
   * Returns true if modal was opened, false if item can be added directly.
   */
  const triggerCheck = useCallback(
    (itemId: string): boolean => {
      const item = itemsMap.get(itemId);
      if (!item) return false;

      // Check for missing dependencies
      const missing = checkMissingDependencies(
        itemId,
        currentLoadoutItemIds,
        itemsMap
      );

      // No missing dependencies - allow direct add
      if (!missing || missing.count === 0) {
        return false;
      }

      // Get direct dependencies for labeling
      const resolution = resolveDependencies(itemId, itemsMap);
      const directIds = new Set(resolution.directDependencies);

      // Build prompt items with direct/transitive labeling
      const promptItems: DependencyPromptItem[] = missing.missingItems.map(
        (depItem) => ({
          item: depItem,
          isSelected: true, // Default to selected
          isDirect: directIds.has(depItem.id),
          sourceItemName: item.name,
        })
      );

      // Sort: direct dependencies first, then by name
      promptItems.sort((a, b) => {
        if (a.isDirect !== b.isDirect) {
          return a.isDirect ? -1 : 1;
        }
        return a.item.name.localeCompare(b.item.name);
      });

      // Open modal with dependencies
      setTriggeringItem(item);
      setPendingDependencies(promptItems);
      setIsOpen(true);

      return true;
    },
    [currentLoadoutItemIds, itemsMap]
  );

  /**
   * Toggle selection state of a specific dependency
   */
  const toggleSelection = useCallback((itemId: string) => {
    setPendingDependencies((prev) =>
      prev.map((dep) =>
        dep.item.id === itemId ? { ...dep, isSelected: !dep.isSelected } : dep
      )
    );
  }, []);

  /**
   * Select all pending dependencies
   */
  const selectAll = useCallback(() => {
    setPendingDependencies((prev) =>
      prev.map((dep) => ({ ...dep, isSelected: true }))
    );
  }, []);

  /**
   * Deselect all pending dependencies
   */
  const deselectAll = useCallback(() => {
    setPendingDependencies((prev) =>
      prev.map((dep) => ({ ...dep, isSelected: false }))
    );
  }, []);

  /**
   * Close modal and reset state
   */
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setTriggeringItem(null);
    setPendingDependencies([]);
  }, []);

  /**
   * Add all pending dependencies to the loadout and close modal
   */
  const onAddAll = useCallback(() => {
    if (!triggeringItem) return;

    // Add the triggering item first
    addItemToLoadout(loadoutId, triggeringItem.id);

    // Add all dependencies
    for (const dep of pendingDependencies) {
      addItemToLoadout(loadoutId, dep.item.id);
    }

    // Calculate total weight of added items
    const totalWeight =
      (triggeringItem.weightGrams ?? 0) +
      pendingDependencies.reduce(
        (sum, dep) => sum + (dep.item.weightGrams ?? 0),
        0
      );

    toast.success(
      `Added ${triggeringItem.name} + ${pendingDependencies.length} accessories`,
      {
        description: totalWeight > 0 ? formatWeightForDisplay(totalWeight) : undefined,
      }
    );

    closeModal();
  }, [
    triggeringItem,
    pendingDependencies,
    loadoutId,
    addItemToLoadout,
    closeModal,
  ]);

  /**
   * Add only selected dependencies to the loadout and close modal
   */
  const onAddSelected = useCallback(() => {
    if (!triggeringItem) return;

    // Add the triggering item first
    addItemToLoadout(loadoutId, triggeringItem.id);

    // Add selected dependencies only
    const selectedDeps = pendingDependencies.filter((d) => d.isSelected);
    for (const dep of selectedDeps) {
      addItemToLoadout(loadoutId, dep.item.id);
    }

    // Calculate total weight of added items
    const totalWeight =
      (triggeringItem.weightGrams ?? 0) +
      selectedDeps.reduce((sum, dep) => sum + (dep.item.weightGrams ?? 0), 0);

    if (selectedDeps.length > 0) {
      toast.success(
        `Added ${triggeringItem.name} + ${selectedDeps.length} selected`,
        {
          description: totalWeight > 0 ? formatWeightForDisplay(totalWeight) : undefined,
        }
      );
    } else {
      toast.success(`Added ${triggeringItem.name}`, {
        description:
          triggeringItem.weightGrams
            ? formatWeightForDisplay(triggeringItem.weightGrams)
            : undefined,
      });
    }

    closeModal();
  }, [
    triggeringItem,
    pendingDependencies,
    loadoutId,
    addItemToLoadout,
    closeModal,
  ]);

  /**
   * Skip adding dependencies and close modal (add only triggering item)
   */
  const onSkip = useCallback(() => {
    if (!triggeringItem) return;

    // Add only the triggering item
    addItemToLoadout(loadoutId, triggeringItem.id);

    toast.success(`Added ${triggeringItem.name}`, {
      description: triggeringItem.weightGrams
        ? formatWeightForDisplay(triggeringItem.weightGrams)
        : undefined,
    });

    closeModal();
  }, [triggeringItem, loadoutId, addItemToLoadout, closeModal]);

  /**
   * Cancel the operation entirely (don't add anything)
   */
  const onCancel = useCallback(() => {
    closeModal();
  }, [closeModal]);

  return {
    isOpen,
    pendingDependencies,
    triggeringItem,
    totalCount,
    selectedCount,
    triggerCheck,
    toggleSelection,
    selectAll,
    deselectAll,
    onAddAll,
    onAddSelected,
    onSkip,
    onCancel,
  };
}
