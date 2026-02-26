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
  const { slugPath, isLoading } = useCategoryBreadcrumb(productTypeId);

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

    // If still loading, return default config to prevent UI flicker
    if (isLoading) {
      return defaultConfig;
    }

    // If no category selected, show all fields for backward compatibility
    if (!productTypeId || slugPath.length === 0) {
      return {
        showSize: true,
        showColor: true,
        showVolume: true,
        showTentConstruction: true,
        showMaterials: true,
        showDimensions: true,
      };
    }

    // Get root category (level 1) slug from path
    // Slugs are stable, non-localized identifiers (e.g., 'clothing', 'packs', 'shelter')
    const rootSlug = slugPath[0] || '';

    // Map category slug to relevant fields
    switch (rootSlug) {
      case 'clothing':
        return {
          ...defaultConfig,
          showSize: true,
          showColor: true,
          showMaterials: true,
        };

      case 'packs':
        return {
          ...defaultConfig,
          showVolume: true,
          showColor: true,
          showMaterials: true,
          showDimensions: true,
        };

      case 'shelter':
        return {
          ...defaultConfig,
          showTentConstruction: true,
          showColor: true,
          showMaterials: true,
          showDimensions: true,
        };

      case 'sleeping':
        return {
          ...defaultConfig,
          showColor: true,
          showMaterials: true,
          showDimensions: true,
        };

      case 'cooking':
        return {
          ...defaultConfig,
          showVolume: true,
          showMaterials: true,
          showDimensions: true,
        };

      case 'hydration':
        return {
          ...defaultConfig,
          showVolume: true,
          showMaterials: true,
        };

      case 'packrafts-kayaks':
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
  }, [productTypeId, slugPath, isLoading]);
}
