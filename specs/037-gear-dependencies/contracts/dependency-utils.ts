/**
 * Dependency Utilities Contract
 *
 * Feature: 037-gear-dependencies
 * Purpose: Define the interface for dependency resolution and validation utilities
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
// Function Contracts
// =============================================================================

/**
 * Resolves all transitive dependencies for a gear item.
 *
 * @param itemId - The gear item to resolve dependencies for
 * @param itemsMap - Map of all gear items by ID for efficient lookup
 * @returns Resolution result with direct, transitive, and broken dependencies
 *
 * @example
 * const result = resolveDependencies('packraft-123', itemsMap);
 * // result.allDependencies = ['paddle-456', 'pfd-789', 'paddle-bag-012']
 */
export type ResolveDependenciesFn = (
  itemId: string,
  itemsMap: Map<string, GearItem>
) => DependencyResolutionResult;

/**
 * Validates whether a dependency link can be created.
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
export type ValidateDependencyLinkFn = (
  parentId: string,
  candidateDepId: string,
  itemsMap: Map<string, GearItem>
) => DependencyValidationResult;

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
export type CheckMissingDependenciesFn = (
  itemId: string,
  currentLoadoutItemIds: string[],
  itemsMap: Map<string, GearItem>
) => MissingDependenciesResult | null;

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
export type CleanBrokenDependenciesFn = (
  item: GearItem,
  itemsMap: Map<string, GearItem>
) => { cleanedIds: string[]; removedCount: number };

// =============================================================================
// Utility Functions Contract
// =============================================================================

/**
 * Creates a Map from an array of gear items for efficient lookup.
 *
 * @param items - Array of gear items
 * @returns Map with item ID as key
 */
export type CreateItemsMapFn = (items: GearItem[]) => Map<string, GearItem>;
