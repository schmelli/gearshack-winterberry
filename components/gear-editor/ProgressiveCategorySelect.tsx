/**
 * ProgressiveCategorySelect Component
 *
 * Feature: Cascading Category Refactor (Phase 3)
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * ONE morphing dropdown for progressive category selection (1 → 2 → 3).
 * Replaces the 3-dropdown TaxonomySelect component.
 *
 * Shows:
 * - Level 1: "Select a category..." (no back button)
 * - Level 2: "← Select a subcategory..." (Breadcrumb: "Shelter")
 * - Level 3: "← Select a product type..." (Breadcrumb: "Shelter › Tents")
 * - Complete: CategoryBreadcrumbDisplay with edit button
 */

'use client';

import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategoryBreadcrumbDisplay } from './CategoryBreadcrumbDisplay';
import { useProgressiveCategorySelect } from '@/hooks/useProgressiveCategorySelect';
import { useCategoryBreadcrumb } from '@/hooks/useCategoryBreadcrumb';
import { useTranslations } from 'next-intl';

interface ProgressiveCategorySelectProps {
  /** Pre-populate with existing product type (for editing) */
  initialProductTypeId?: string;
  /** Callback when product type (level 3) is selected */
  onComplete: (productTypeId: string) => void;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Progressive category selection with one morphing dropdown.
 *
 * @example
 * ```tsx
 * <FormField
 *   control={form.control}
 *   name="productTypeId"
 *   render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>Product Type *</FormLabel>
 *       <ProgressiveCategorySelect
 *         initialProductTypeId={field.value || undefined}
 *         onComplete={(id) => field.onChange(id)}
 *       />
 *     </FormItem>
 *   )}
 * />
 * ```
 */
export function ProgressiveCategorySelect({
  initialProductTypeId,
  onComplete,
  disabled = false,
}: ProgressiveCategorySelectProps) {
  const t = useTranslations('GearEditor');

  // Track whether user is editing an existing selection
  const [isEditing, setIsEditing] = useState(false);

  const {
    currentLevel,
    currentOptions,
    selectOption,
    navigateBack,
    canNavigateBack,
    isComplete,
    isLoading,
    reset,
  } = useProgressiveCategorySelect(initialProductTypeId, (productTypeId) => {
    onComplete(productTypeId);
    setIsEditing(false);
  });

  // Get breadcrumb for current progress (for display above dropdown)
  const { breadcrumb } = useCategoryBreadcrumb(
    currentLevel === 2 && currentOptions.length > 0 && currentOptions[0].parentId
      ? currentOptions[0].parentId
      : currentLevel === 3 && currentOptions.length > 0 && currentOptions[0].parentId
      ? currentOptions[0].parentId
      : null
  );

  // Handle edit button click
  const handleEdit = () => {
    setIsEditing(true);
    reset();
  };

  // If complete and not editing, show breadcrumb display
  if (isComplete && !isEditing && initialProductTypeId) {
    return (
      <CategoryBreadcrumbDisplay productTypeId={initialProductTypeId} onEdit={handleEdit} />
    );
  }

  // Otherwise, show the morphing dropdown
  const placeholders: Record<1 | 2 | 3, string> = {
    1: t('selectCategory', { defaultValue: 'Select a category...' }),
    2: t('selectSubcategory', { defaultValue: 'Select a subcategory...' }),
    3: t('selectProductType', { defaultValue: 'Select a product type...' }),
  };

  return (
    <div className="space-y-3">
      {/* Breadcrumb progress indicator */}
      {breadcrumb.length > 0 && currentLevel > 1 && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {breadcrumb.map((label, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>›</span>}
              <span>{label}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Morphing dropdown with back button */}
      <div className="flex gap-2">
        {/* Back button (only show when level > 1) */}
        {canNavigateBack && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={navigateBack}
            disabled={disabled || isLoading}
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* The morphing dropdown */}
        <Select
          onValueChange={selectOption}
          value=""
          disabled={disabled || isLoading || currentOptions.length === 0}
        >
          <SelectTrigger className="flex-1">
            <SelectValue
              placeholder={
                isLoading
                  ? t('loading', { defaultValue: 'Loading...' })
                  : currentOptions.length === 0
                  ? t('noOptions', { defaultValue: 'No options available' })
                  : placeholders[currentLevel]
              }
            />
          </SelectTrigger>
          <SelectContent>
            {currentOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description based on current level */}
      <p className="text-xs text-muted-foreground">
        {currentLevel === 1 && t('categoryDescription', { defaultValue: 'Select the main gear category' })}
        {currentLevel === 2 && t('subcategoryDescription', { defaultValue: 'Select a more specific type' })}
        {currentLevel === 3 && t('productTypeDescription', { defaultValue: 'Select the exact product type' })}
      </p>
    </div>
  );
}
