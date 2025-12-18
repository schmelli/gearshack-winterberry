/**
 * ClassificationSection Component
 *
 * Feature: 001-gear-item-editor, Cascading Category Refactor
 * Task: T037, T038, Phase 3
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays the progressive category selector for gear items.
 * Uses ONE morphing dropdown: Category → Subcategory → Product Type.
 */

'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ProgressiveCategorySelect } from '@/components/gear-editor/ProgressiveCategorySelect';
import type { GearItemFormData } from '@/types/gear';

// =============================================================================
// Component
// =============================================================================

export function ClassificationSection() {
  const form = useFormContext<GearItemFormData>();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Classification</h3>
      <p className="text-muted-foreground text-sm mb-4">
        Classify your gear to help organize your inventory and enable better
        filtering and search.
      </p>

      {/* Progressive category selection - now ONE dropdown instead of three */}
      <FormField
        control={form.control}
        name="productTypeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Type *</FormLabel>
            <ProgressiveCategorySelect
              initialProductTypeId={field.value || undefined}
              onComplete={(id) => field.onChange(id)}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
