/**
 * TaxonomySelect Component
 *
 * Feature: 001-gear-item-editor, 043-ontology-i18n-import
 * Tasks: T032-T036, T023
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Hierarchical Category → Subcategory → ProductType selection
 * with cascading clear behavior when parent changes.
 * Now uses database-backed categories with i18n support.
 */

'use client';

import { useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GearItemFormData } from '@/types/gear';
import { useCategories } from '@/hooks/useCategories';

// =============================================================================
// Component
// =============================================================================

export function TaxonomySelect() {
  const form = useFormContext<GearItemFormData>();
  const { getOptionsForLevel, isLoading, error } = useCategories();

  // Watch category and subcategory for cascading updates
  const categoryId = useWatch({ control: form.control, name: 'categoryId' });
  const subcategoryId = useWatch({
    control: form.control,
    name: 'subcategoryId',
  });

  // Get available options based on current selections (localized)
  const categories = getOptionsForLevel(1);
  const subcategories = categoryId
    ? getOptionsForLevel(2, categoryId)
    : [];
  const productTypes = subcategoryId
    ? getOptionsForLevel(3, subcategoryId)
    : [];

  // T036: Cascading clear logic when parent changes
  const handleCategoryChange = useCallback(
    (value: string) => {
      form.setValue('categoryId', value);
      // Clear dependent fields when category changes
      form.setValue('subcategoryId', '');
      form.setValue('productTypeId', '');
    },
    [form]
  );

  const handleSubcategoryChange = useCallback(
    (value: string) => {
      form.setValue('subcategoryId', value);
      // Clear product type when subcategory changes
      form.setValue('productTypeId', '');
    },
    [form]
  );

  // Show error state if categories failed to load
  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm">
          Failed to load categories. Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category - T033 */}
      <FormField
        control={form.control}
        name="categoryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select
              onValueChange={handleCategoryChange}
              value={field.value || ''}
              disabled={isLoading}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={isLoading ? 'Loading...' : 'Select a category'}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Main gear category (e.g., Shelter, Sleep System)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Subcategory - T034 */}
      <FormField
        control={form.control}
        name="subcategoryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Subcategory</FormLabel>
            <Select
              onValueChange={handleSubcategoryChange}
              value={field.value || ''}
              disabled={!categoryId || subcategories.length === 0 || isLoading}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      categoryId
                        ? subcategories.length === 0
                          ? 'No subcategories available'
                          : 'Select a subcategory'
                        : 'Select a category first'
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {subcategories.map((subcategory) => (
                  <SelectItem key={subcategory.value} value={subcategory.value}>
                    {subcategory.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Specific type within the category
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Product Type - T035 */}
      <FormField
        control={form.control}
        name="productTypeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Type</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || ''}
              disabled={!subcategoryId || productTypes.length === 0 || isLoading}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      subcategoryId
                        ? productTypes.length === 0
                          ? 'No product types available'
                          : 'Select a product type'
                        : 'Select a subcategory first'
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {productTypes.map((productType) => (
                  <SelectItem key={productType.value} value={productType.value}>
                    {productType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Specific product classification
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
