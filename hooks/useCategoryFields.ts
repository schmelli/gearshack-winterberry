/**
 * useCategoryFields Hook
 *
 * Feature: Issue #89 - Context-aware fields
 * Constitution: Business logic MUST be in hooks
 *
 * Determines which specification fields are relevant for a given product type.
 * Used to show only contextually relevant fields in the gear editor.
 */

'use client';

import { useMemo } from 'react';
import { useCategoryBreadcrumb } from './useCategoryBreadcrumb';

/**
 * Specification fields that can be shown in the gear editor
 */
export interface CategoryFieldConfig {
  /** Show size field (clothing, footwear) */
  showSize: boolean;
  /** Show color field (clothing, tents, packs) */
  showColor: boolean;
  /** Show volume field (packs, bags, hydration) */
  showVolume: boolean;
  /** Show tent construction field (tents, shelters) */
  showTentConstruction: boolean;
  /** Show materials field (tents, packs, sleeping bags, clothing) */
  showMaterials: boolean;
  /** Show dimensions (length/width/height) */
  showDimensions: boolean;
}

/**
 * Hook to determine which fields should be shown for a product type.
 *
 * @param productTypeId - The selected product type (level 3 category)
 * @returns Configuration object indicating which fields to show
 *
 * @example
 * ```tsx
 * const fields = useCategoryFields(form.watch('productTypeId'));
 * {fields.showSize && <FormField name="size" ... />}
 * ```
 */
export function useCategoryFields(
  productTypeId: string | null
): CategoryFieldConfig {
  const { breadcrumb, isLoading } = useCategoryBreadcrumb(productTypeId);

  return useMemo(() => {
    // Default: show minimal fields
    const defaultConfig: CategoryFieldConfig = {
      showSize: false,
      showColor: false,
      showVolume: false,
      showTentConstruction: false,
      showMaterials: false,
      showDimensions: false,
    };

    // If no category selected or still loading, show all fields for backward compatibility
    if (!productTypeId || isLoading || breadcrumb.length === 0) {
      return {
        showSize: true,
        showColor: true,
        showVolume: true,
        showTentConstruction: true,
        showMaterials: true,
        showDimensions: true,
      };
    }

    // Get root category (level 1) from breadcrumb
    const rootCategory = breadcrumb[0]?.toLowerCase() || '';

    // Map category to relevant fields
    switch (rootCategory) {
      case 'clothing':
      case 'bekleidung': // German
        return {
          ...defaultConfig,
          showSize: true,
          showColor: true,
          showMaterials: true,
        };

      case 'packs':
      case 'rucksäcke': // German
        return {
          ...defaultConfig,
          showVolume: true,
          showColor: true,
          showMaterials: true,
          showDimensions: true,
        };

      case 'shelter':
      case 'unterkunft': // German
        return {
          ...defaultConfig,
          showTentConstruction: true,
          showColor: true,
          showMaterials: true,
          showDimensions: true,
        };

      case 'sleeping':
      case 'schlafsysteme': // German
        return {
          ...defaultConfig,
          showColor: true,
          showMaterials: true,
          showDimensions: true,
        };

      case 'cooking':
      case 'kochen': // German
        return {
          ...defaultConfig,
          showVolume: true,
          showMaterials: true,
          showDimensions: true,
        };

      case 'hydration':
      case 'trinken': // German
        return {
          ...defaultConfig,
          showVolume: true,
          showMaterials: true,
        };

      case 'packrafts & kayaks':
      case 'packrafts & kajaks': // German
        return {
          ...defaultConfig,
          showColor: true,
          showMaterials: true,
          showDimensions: true,
        };

      // For other categories (electronics, navigation, medical, safety, tools, consumables)
      // show only dimensions as these are general-purpose items
      default:
        return {
          ...defaultConfig,
          showDimensions: true,
        };
    }
  }, [productTypeId, breadcrumb, isLoading]);
}
