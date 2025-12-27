/**
 * PurchaseSection Component
 *
 * Feature: 001-gear-item-editor, Issue #89
 * Task: T017
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays form fields for purchase details:
 * - Price paid with currency
 * - Purchase date
 * - Retailer name and URL
 * - Wrapped in Accordion for collapsibility (Issue #89)
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { GearItemFormData } from '@/types/gear';

// =============================================================================
// Constants
// =============================================================================

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (\u20AC)' },
  { code: 'GBP', label: 'British Pound (\u00A3)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'JPY', label: 'Japanese Yen (\u00A5)' },
];

// =============================================================================
// Component
// =============================================================================

export function PurchaseSection() {
  const form = useFormContext<GearItemFormData>();

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="purchase">
        <AccordionTrigger className="text-lg font-medium">
          Purchase Details
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          {/* Price and Currency */}
          <div className="grid grid-cols-2 gap-4">
        {/* Price Paid */}
        <FormField
          control={form.control}
          name="pricePaid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price Paid</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Currency */}
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Purchase Date */}
      <FormField
        control={form.control}
        name="purchaseDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Purchase Date</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Retailer */}
      <FormField
        control={form.control}
        name="retailer"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Retailer</FormLabel>
            <FormControl>
              <Input placeholder="e.g., REI, Amazon" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Retailer URL */}
      <FormField
        control={form.control}
        name="retailerUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Retailer Website</FormLabel>
            <FormControl>
              <Input
                type="url"
                placeholder="https://www.rei.com/product/..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
