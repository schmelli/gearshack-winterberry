/**
 * Dependency Utilities
 *
 * Feature: 037-gear-dependencies
 * Purpose: Dependency resolution and validation for gear items
 *
 * Key features:
 * - DFS traversal with visited set for transitive dependencies
 * - Circular reference detection and prevention
 * - Broken link detection and cleanup
 * - Loadout dependency checking
 */

import type { GearItem } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of dependency resolution for a gear item
 */
export interface DependencyResolutionResult {
  /** Direct dependencies (first level only) */
  directDependencies: string[];
  /** All dependencies including transitive (recursive) */
  allDependencies: string[];
  /** IDs that no longer exist (broken links) */
  brokenLinks: string[];
  /** Whether circular reference was detected and broken */
  hadCircularReference: boolean;
}

/**
 * Result of missing dependencies check for loadout
 */
export interface MissingDependenciesResult {
  /** Item that was being added */
  sourceItemId: string;
  /** Dependencies not yet in the loadout */
  missingItems: GearItem[];
  /** Total count of missing items */
  count: number;
}

/**
 * Validation result for adding a dependency
 */
export interface DependencyValidationResult {
  /** Whether the dependency can be added */
  isValid: boolean;
  /** Error message if invalid */
  errorMessage?: string;
  /** Type of error */
  errorType?: 'self_reference' | 'circular' | 'not_found';
}

// =============================================================================
// Helper: Create Items Map
// =============================================================================

/**
 * Creates a Map from an array of gear items for efficient lookup.
 *
 * @param items - Array of gear items
 * @returns Map with item ID as key
 */
export function createItemsMap(items: GearItem[]): Map<string, GearItem> {
  return new Map(items.map((item) => [item.id, item]));
}

// =============================================================================
// Core: Resolve Dependencies (DFS with visited set)
// =============================================================================

/**
 * Resolves all transitive dependencies for a gear item using DFS traversal.
 *
 * @param itemId - The gear item to resolve dependencies for
 * @param itemsMap - Map of all gear items by ID for efficient lookup
 * @returns Resolution result with direct, transitive, and broken dependencies
 *
 * @example
 * const result = resolveDependencies('packraft-123', itemsMap);
 * // result.allDependencies = ['paddle-456', 'pfd-789', 'paddle-bag-012']
 */
export function resolveDependencies(
  itemId: string,
  itemsMap: Map<string, GearItem>
): DependencyResolutionResult {
  const item = itemsMap.get(itemId);

  // Item not found - return empty result
  if (!item) {
    return {
      directDependencies: [],
      allDependencies: [],
      brokenLinks: [],
      hadCircularReference: false,
    };
  }

  const directDependencies: string[] = [];
  const allDependencies: string[] = [];
  const brokenLinks: string[] = [];
  const visited = new Set<string>();
  let hadCircularReference = false;

  // Track first level separately
  for (const depId of item.dependencyIds) {
    if (itemsMap.has(depId)) {
      directDependencies.push(depId);
    } else {
      brokenLinks.push(depId);
    }
  }

  // DFS traversal for all transitive dependencies
  function dfs(currentId: string): void {
    // Skip if already visited (prevents infinite loops)
    if (visited.has(currentId)) {
      hadCircularReference = true;
      return;
    }

    visited.add(currentId);
    const current = itemsMap.get(currentId);

    if (!current) {
      return;
    }

    for (const depId of current.dependencyIds) {
      // Skip self-reference
      if (depId === itemId) {
        hadCircularReference = true;
        continue;
      }

      if (itemsMap.has(depId)) {
        // Only add if not already in the list (dedupe)
        if (!allDependencies.includes(depId)) {
          allDependencies.push(depId);
        }
        // Continue DFS
        dfs(depId);
      } else if (!brokenLinks.includes(depId)) {
        brokenLinks.push(depId);
      }
    }
  }

  // Start DFS from the root item
  visited.add(itemId); // Mark root as visited
  for (const depId of directDependencies) {
    if (!allDependencies.includes(depId)) {
      allDependencies.push(depId);
    }
    dfs(depId);
  }

  return {
    directDependencies,
    allDependencies,
    brokenLinks,
    hadCircularReference,
  };
}

// =============================================================================
// Validation: Check if dependency link is valid
// =============================================================================

/**
 * Validates whether a dependency link can be created.
 * Checks for self-reference and circular dependencies.
 *
 * @param parentId - The item that will have the dependency
 * @param candidateDepId - The item being added as a dependency
 * @param itemsMap - Map of all gear items by ID
 * @returns Validation result indicating if link is allowed
 *
 * @example
 * const result = validateDependencyLink('packraft-123', 'paddle-456', itemsMap);
 * if (!result.isValid) {
 *   toast.error(result.errorMessage);
 * }
 */
export function validateDependencyLink(
  parentId: string,
  candidateDepId: string,
  itemsMap: Map<string, GearItem>
): DependencyValidationResult {
  // Check: Self-reference
  if (parentId === candidateDepId) {
    return {
      isValid: false,
      errorMessage: 'An item cannot depend on itself',
      errorType: 'self_reference',
    };
  }

  // Check: Candidate exists
  const candidate = itemsMap.get(candidateDepId);
  if (!candidate) {
    return {
      isValid: false,
      errorMessage: 'The selected item no longer exists',
      errorType: 'not_found',
    };
  }

  // Check: Would create circular reference
  // If candidate already (directly or transitively) depends on parent,
  // adding this link would create a cycle
  const candidateDeps = resolveDependencies(candidateDepId, itemsMap);
  if (candidateDeps.allDependencies.includes(parentId)) {
    return {
      isValid: false,
      errorMessage: 'This would create a circular dependency',
      errorType: 'circular',
    };
  }

  return { isValid: true };
}

// =============================================================================
// Loadout: Check for missing dependencies
// =============================================================================

/**
 * Checks for missing dependencies when adding an item to a loadout.
 *
 * @param itemId - The item being added to the loadout
 * @param currentLoadoutItemIds - IDs of items already in the loadout
 * @param itemsMap - Map of all gear items by ID
 * @returns Missing dependencies result, or null if no missing deps
 *
 * @example
 * const missing = checkMissingDependencies('packraft-123', loadout.itemIds, itemsMap);
 * if (missing && missing.count > 0) {
 *   openDependencyPromptModal(missing);
 * }
 */
export function checkMissingDependencies(
  itemId: string,
  currentLoadoutItemIds: string[],
  itemsMap: Map<string, GearItem>
): MissingDependenciesResult | null {
  const item = itemsMap.get(itemId);

  // Item not found or has no dependencies
  if (!item || item.dependencyIds.length === 0) {
    return null;
  }

  // Resolve all transitive dependencies
  const resolution = resolveDependencies(itemId, itemsMap);

  // Create set of existing loadout items for efficient lookup
  const loadoutSet = new Set(currentLoadoutItemIds);
  // Include the item being added (it won't be missing)
  loadoutSet.add(itemId);

  // Find dependencies not in the loadout
  const missingIds = resolution.allDependencies.filter(
    (depId) => !loadoutSet.has(depId)
  );

  if (missingIds.length === 0) {
    return null;
  }

  // Map IDs to full items
  const missingItems = missingIds
    .map((id) => itemsMap.get(id))
    .filter((item): item is GearItem => item !== undefined);

  return {
    sourceItemId: itemId,
    missingItems,
    count: missingItems.length,
  };
}

// =============================================================================
// Cleanup: Remove broken dependency links
// =============================================================================

/**
 * Cleans up broken dependency links from a gear item.
 *
 * @param item - The gear item to clean
 * @param itemsMap - Map of all gear items by ID
 * @returns Cleaned dependencyIds array and count of removed links
 *
 * @example
 * const { cleanedIds, removedCount } = cleanBrokenDependencies(item, itemsMap);
 * if (removedCount > 0) {
 *   toast.info(`Removed ${removedCount} broken dependency link(s)`);
 *   await updateItem(item.id, { dependencyIds: cleanedIds });
 * }
 */
export function cleanBrokenDependencies(
  item: GearItem,
  itemsMap: Map<string, GearItem>
): { cleanedIds: string[]; removedCount: number } {
  const cleanedIds = item.dependencyIds.filter((depId) => itemsMap.has(depId));
  const removedCount = item.dependencyIds.length - cleanedIds.length;

  return {
    cleanedIds,
    removedCount,
  };
}
