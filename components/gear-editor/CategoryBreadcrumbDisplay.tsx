/**
 * CategoryBreadcrumbDisplay Component
 *
 * Feature: Cascading Category Refactor (Phase 3)
 *
 * Displays just the Product Type label after selection is complete.
 * Shows an edit button to allow changing the selection.
 */

'use client';

import { Pencil } from 'lucide-react';
import { useCategoryBreadcrumb } from '@/hooks/useCategoryBreadcrumb';

interface CategoryBreadcrumbDisplayProps {
  /** The selected product type (level 3) category ID */
  productTypeId: string;
  /** Callback when edit button is clicked */
  onEdit: () => void;
}

/**
 * Displays product type label with edit button.
 *
 * @example
 * ```tsx
 * <CategoryBreadcrumbDisplay
 *   productTypeId={selectedProductTypeId}
 *   onEdit={() => setIsEditing(true)}
 * />
 * // Shows: "Dome Tents [pencil icon]"
 * ```
 */
export function CategoryBreadcrumbDisplay({
  productTypeId,
  onEdit,
}: CategoryBreadcrumbDisplayProps) {
  const { productTypeLabel, isLoading } = useCategoryBreadcrumb(productTypeId);

  if (isLoading || !productTypeLabel) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-secondary text-sm hover:bg-secondary/80 transition-colors"
      aria-label="Edit product type selection"
    >
      <span className="font-medium">{productTypeLabel}</span>
      <Pencil className="h-3 w-3 ml-2 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}
