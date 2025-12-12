/**
 * DependenciesSection Component Contract
 *
 * Feature: 037-gear-dependencies
 * Purpose: Define the interface for the gear editor dependencies tab
 */

import type { GearItem } from '@/types/gear';

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for the DependenciesSection component.
 *
 * Note: This component follows the existing section pattern where
 * form state is accessed via FormContext (useFormContext from react-hook-form).
 * No explicit form prop is passed.
 */
export interface DependenciesSectionProps {
  /** All available gear items for the dependency picker (excluding current item) */
  availableItems: GearItem[];
  /** The ID of the current item being edited (to exclude from picker) */
  currentItemId?: string;
}

// =============================================================================
// Component Structure
// =============================================================================

/**
 * DependenciesSection Component
 *
 * A tab section in the Gear Editor that allows users to link
 * accessory items as dependencies of the current item.
 *
 * UI Structure:
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │ Linked Accessories                                      │
 * │                                                         │
 * │ Items that should go with this gear:                    │
 * │                                                         │
 * │ ┌─────────────────────────────────────────────────────┐ │
 * │ │ [🔍 Search for items to link...]              [▼]  │ │
 * │ └─────────────────────────────────────────────────────┘ │
 * │                                                         │
 * │ Linked Items:                                          │
 * │                                                         │
 * │ ┌─────────────────────────────────────────────────┐   │
 * │ │ 🏷️ Paddle                                   [×] │   │
 * │ │    Alpacka Mule                                  │   │
 * │ └─────────────────────────────────────────────────┘   │
 * │                                                         │
 * │ ┌─────────────────────────────────────────────────┐   │
 * │ │ 🏷️ PFD                                      [×] │   │
 * │ │    Astral V-Eight                               │   │
 * │ └─────────────────────────────────────────────────┘   │
 * │                                                         │
 * │ ⚠️ Circular dependency warning (if applicable)        │
 * │                                                         │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * Features:
 * - Combobox with search/filter for item selection
 * - Excludes current item from picker (no self-reference)
 * - Shows warning if selection would create circular reference
 * - Displays linked items as removable badges/chips
 * - Shows item name and brand for context
 *
 * @example
 * // In GearEditorForm.tsx, add new TabsContent:
 * <TabsContent value="dependencies" className="mt-0">
 *   <DependenciesSection
 *     availableItems={allItems.filter(i => i.id !== currentItemId)}
 *     currentItemId={currentItemId}
 *   />
 * </TabsContent>
 */
export type DependenciesSectionComponent = React.FC<DependenciesSectionProps>;

// =============================================================================
// Internal State (via useFormContext)
// =============================================================================

/**
 * The component accesses form state via useFormContext:
 *
 * const form = useFormContext<GearItemFormData>();
 * const dependencyIds = form.watch('dependencyIds');
 *
 * To add a dependency:
 *   form.setValue('dependencyIds', [...dependencyIds, newId]);
 *
 * To remove a dependency:
 *   form.setValue('dependencyIds', dependencyIds.filter(id => id !== removeId));
 */

// =============================================================================
// Validation Integration
// =============================================================================

/**
 * Validation Notes:
 *
 * 1. Self-reference check:
 *    - Filtered out in availableItems prop
 *    - Additional check in onChange handler as safety
 *
 * 2. Circular reference check:
 *    - Use validateDependencyLink() from dependency-utils
 *    - Show inline warning if circular would result
 *    - Prevent selection from being added
 *
 * 3. Broken link display:
 *    - If dependencyIds contains IDs not in availableItems,
 *      show them as "Item not found" with option to remove
 */

// =============================================================================
// Styling Notes
// =============================================================================

/**
 * Component Styling Guidelines (Constitution Principle III):
 *
 * - Uses shadcn/ui components:
 *   - Combobox (Popover + Command) for item search
 *   - Badge for linked items display
 *   - Button (ghost, icon) for remove action
 *   - Alert for circular dependency warning
 * - Follows existing section pattern from other *Section.tsx files
 * - FormField wrapper for react-hook-form integration
 * - Tailwind classes only
 */
