/**
 * ClassificationSection Component
 *
 * Feature: 001-gear-item-editor
 * Task: T037, T038
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays the taxonomy classification selector for gear items.
 * Uses cascading Category → Subcategory → Product Type selection.
 */

'use client';

import { TaxonomySelect } from '@/components/gear-editor/TaxonomySelect';

// =============================================================================
// Component
// =============================================================================

export function ClassificationSection() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Classification</h3>
      <p className="text-muted-foreground text-sm mb-4">
        Classify your gear to help organize your inventory and enable better
        filtering and search.
      </p>
      <TaxonomySelect />
    </div>
  );
}
