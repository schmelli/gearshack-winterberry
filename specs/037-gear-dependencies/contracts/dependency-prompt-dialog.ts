/**
 * DependencyPromptDialog Component Contract
 *
 * Feature: 037-gear-dependencies
 * Purpose: Define the interface for the dependency prompt modal component
 */

import type { UseDependencyPromptReturn } from './use-dependency-prompt';

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for the DependencyPromptDialog component.
 * Receives all state and actions from useDependencyPrompt hook.
 */
export type DependencyPromptDialogProps = Pick<
  UseDependencyPromptReturn,
  | 'isOpen'
  | 'pendingDependencies'
  | 'triggeringItem'
  | 'totalCount'
  | 'selectedCount'
  | 'toggleSelection'
  | 'selectAll'
  | 'deselectAll'
  | 'onAddAll'
  | 'onAddSelected'
  | 'onSkip'
  | 'onCancel'
>;

// =============================================================================
// Component Structure
// =============================================================================

/**
 * DependencyPromptDialog Component
 *
 * A modal dialog that appears when adding a gear item with dependencies
 * to a loadout. Shows missing dependencies and allows the user to:
 * - Add all dependencies
 * - Select specific dependencies to add
 * - Skip dependencies entirely
 *
 * UI Structure:
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │ [X]                    Add Dependencies?                │
 * ├─────────────────────────────────────────────────────────┤
 * │                                                         │
 * │  "Packraft" has 3 items that typically go with it:      │
 * │                                                         │
 * │  ┌─────────────────────────────────────────────────┐   │
 * │  │ [✓] Paddle                            Weight    │   │
 * │  │     Direct dependency                           │   │
 * │  ├─────────────────────────────────────────────────┤   │
 * │  │ [✓] PFD                               Weight    │   │
 * │  │     Direct dependency                           │   │
 * │  ├─────────────────────────────────────────────────┤   │
 * │  │ [✓] Paddle Bag                        Weight    │   │
 * │  │     Via Paddle (transitive)                     │   │
 * │  └─────────────────────────────────────────────────┘   │
 * │                                                         │
 * │  [Select All] [Deselect All]                           │
 * │                                                         │
 * ├─────────────────────────────────────────────────────────┤
 * │  [Skip]              [Add Selected (2)]    [Add All]   │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * Accessibility:
 * - Focus trap within modal
 * - Escape key to cancel
 * - Checkbox labels are associated with items
 * - Screen reader announces item count
 *
 * @example
 * <DependencyPromptDialog
 *   isOpen={dependencyPrompt.isOpen}
 *   pendingDependencies={dependencyPrompt.pendingDependencies}
 *   triggeringItem={dependencyPrompt.triggeringItem}
 *   totalCount={dependencyPrompt.totalCount}
 *   selectedCount={dependencyPrompt.selectedCount}
 *   toggleSelection={dependencyPrompt.toggleSelection}
 *   selectAll={dependencyPrompt.selectAll}
 *   deselectAll={dependencyPrompt.deselectAll}
 *   onAddAll={dependencyPrompt.onAddAll}
 *   onAddSelected={dependencyPrompt.onAddSelected}
 *   onSkip={dependencyPrompt.onSkip}
 *   onCancel={dependencyPrompt.onCancel}
 * />
 */
export type DependencyPromptDialogComponent = React.FC<DependencyPromptDialogProps>;

// =============================================================================
// Styling Notes
// =============================================================================

/**
 * Component Styling Guidelines (Constitution Principle III):
 *
 * - Uses shadcn/ui Dialog component as base
 * - Checkbox from shadcn/ui for selection
 * - Card-like list items for dependency display
 * - Button variants:
 *   - Skip: variant="ghost"
 *   - Add Selected: variant="secondary"
 *   - Add All: variant="default" (primary)
 * - Tailwind classes only (no custom CSS)
 * - Responsive: full-width on mobile, max-w-md on desktop
 */
