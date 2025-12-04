/**
 * TaxonomySelect Component
 *
 * Feature: 001-gear-item-editor
 * Tasks: T032-T036
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Hierarchical Category → Subcategory → ProductType selection
 * with cascading clear behavior when parent changes.
 */

'use client';

import { useCallback, useMemo } from 'react';
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
import {
  getCategories,
  getSubcategoriesForCategory,
  getProductTypesForSubcategory,
} from '@/lib/taxonomy/taxonomy-utils';

// =============================================================================
// Component
// =============================================================================

export function TaxonomySelect() {
  const form = useFormContext<GearItemFormData>();

  // Watch category and subcategory for cascading updates
  const categoryId = useWatch({ control: form.control, name: 'categoryId' });
  const subcategoryId = useWatch({
    control: form.control,
    name: 'subcategoryId',
  });

  // Get available options based on current selections
  const categories = useMemo(() => getCategories(), []);
  const subcategories = useMemo(
    () => getSubcategoriesForCategory(categoryId || null),
    [categoryId]
  );
  const productTypes = useMemo(
    () => getProductTypesForSubcategory(categoryId || null, subcategoryId || null),
    [categoryId, subcategoryId]
  );

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
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
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
              disabled={!categoryId || subcategories.length === 0}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      categoryId
                        ? 'Select a subcategory'
                        : 'Select a category first'
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {subcategories.map((subcategory) => (
                  <SelectItem key={subcategory.id} value={subcategory.id}>
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
              disabled={!subcategoryId || productTypes.length === 0}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      subcategoryId
                        ? 'Select a product type'
                        : 'Select a subcategory first'
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {productTypes.map((productType) => (
                  <SelectItem key={productType.id} value={productType.id}>
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
