/**
 * GeneralInfoSection Component
 *
 * Feature: 001-gear-item-editor, 044-intelligence-integration
 * Task: T015, T027
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays form fields for general gear information:
 * - Name (required, with product autocomplete)
 * - Brand (with autocomplete)
 * - Brand URL
 * - Model Number
 * - Product URL
 *
 * Brand-Product linking:
 * - When brand selected: product autocomplete filters by that brand
 * - When product selected: auto-fills brand if not already set
 */

'use client';

import { useState, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  BrandAutocompleteInput,
  type BrandSelection,
} from '@/components/gear-editor/BrandAutocompleteInput';
import { ProductAutocompleteInput } from '@/components/gear-editor/ProductAutocompleteInput';
import type { ProductSuggestion } from '@/hooks/useProductAutocomplete';
import type { GearItemFormData } from '@/types/gear';

// =============================================================================
// Component
// =============================================================================

export function GeneralInfoSection() {
  const form = useFormContext<GearItemFormData>();

  // Track selected brand for product filtering
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>();

  // Handle brand selection
  const handleBrandSelect = useCallback((brand: BrandSelection | null) => {
    setSelectedBrandId(brand?.id);
  }, []);

  // Handle product selection - auto-fill brand if not already set
  const handleProductSelect = useCallback(
    (product: ProductSuggestion) => {
      // If product has a brand and no brand is currently selected, auto-fill it
      if (product.brand && !form.getValues('brand')) {
        form.setValue('brand', product.brand.name);
        setSelectedBrandId(product.brand.id);
      }
    },
    [form]
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">General Information</h3>

      {/* Name - Required, with product autocomplete */}
      <ProductAutocompleteInput
        brandId={selectedBrandId}
        onProductSelect={handleProductSelect}
      />

      {/* Brand - with autocomplete */}
      <BrandAutocompleteInput onBrandSelect={handleBrandSelect} />

      {/* Product Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter product details, specifications, or notes..."
                className="min-h-[100px] resize-y"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Brand URL */}
      <FormField
        control={form.control}
        name="brandUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Website</FormLabel>
            <FormControl>
              <Input
                type="url"
                placeholder="https://www.nemoequipment.com"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Model Number */}
      <FormField
        control={form.control}
        name="modelNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Model Number</FormLabel>
            <FormControl>
              <Input placeholder="e.g., HOR2P-2021" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Product URL */}
      <FormField
        control={form.control}
        name="productUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Page URL</FormLabel>
            <FormControl>
              <Input
                type="url"
                placeholder="https://www.nemoequipment.com/product/hornet-elite"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
