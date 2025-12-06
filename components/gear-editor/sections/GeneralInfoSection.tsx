/**
 * GeneralInfoSection Component
 *
 * Feature: 001-gear-item-editor
 * Task: T015
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays form fields for general gear information:
 * - Name (required)
 * - Brand
 * - Brand URL
 * - Model Number
 * - Product URL
 */

'use client';

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
import type { GearItemFormData } from '@/types/gear';

// =============================================================================
// Component
// =============================================================================

export function GeneralInfoSection() {
  const form = useFormContext<GearItemFormData>();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">General Information</h3>

      {/* Name - Required */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Name <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="e.g., Nemo Hornet Elite 2P" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Brand */}
      <FormField
        control={form.control}
        name="brand"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Brand</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Nemo Equipment" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

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
