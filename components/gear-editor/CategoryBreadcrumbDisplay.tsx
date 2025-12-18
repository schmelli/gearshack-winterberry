/**
 * CategoryBreadcrumbDisplay Component
 *
 * Feature: Cascading Category Refactor (Phase 3)
 *
 * Displays the full category breadcrumb path after selection is complete.
 * Shows an edit button to allow changing the selection.
 */

'use client';

import React from 'react';
import { ChevronRight, Pencil } from 'lucide-react';
import { useCategoryBreadcrumb } from '@/hooks/useCategoryBreadcrumb';

interface CategoryBreadcrumbDisplayProps {
  /** The selected product type (level 3) category ID */
  productTypeId: string;
  /** Callback when edit button is clicked */
  onEdit: () => void;
}

/**
 * Displays category breadcrumb with edit button.
 *
 * @example
 * ```tsx
 * <CategoryBreadcrumbDisplay
 *   productTypeId={selectedProductTypeId}
 *   onEdit={() => setIsEditing(true)}
 * />
 * // Shows: "Shelter › Tents › Dome Tents [pencil icon]"
 * ```
 */
export function CategoryBreadcrumbDisplay({
  productTypeId,
  onEdit,
}: CategoryBreadcrumbDisplayProps) {
  const { breadcrumb, isLoading } = useCategoryBreadcrumb(productTypeId);

  if (isLoading || breadcrumb.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-secondary text-sm hover:bg-secondary/80 transition-colors"
      aria-label="Edit category selection"
    >
      {breadcrumb.map((label, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
          <span className={idx === breadcrumb.length - 1 ? 'font-medium' : 'text-muted-foreground'}>
            {label}
          </span>
        </React.Fragment>
      ))}
      <Pencil className="h-3 w-3 ml-2 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}
