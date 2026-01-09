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
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('GearEditor');
  const form = useFormContext<GearItemFormData>();

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="purchase">
        <AccordionTrigger className="text-lg font-medium">
          {t('purchase.title')}
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
              <FormLabel>{t('purchase.pricePaidLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('purchase.pricePaidPlaceholder')}
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
              <FormLabel>{t('purchase.currencyLabel')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('purchase.currencyPlaceholder')} />
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
            <FormLabel>{t('purchase.purchaseDateLabel')}</FormLabel>
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
            <FormLabel>{t('purchase.retailerLabel')}</FormLabel>
            <FormControl>
              <Input placeholder={t('purchase.retailerPlaceholder')} {...field} />
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
            <FormLabel>{t('purchase.retailerWebsiteLabel')}</FormLabel>
            <FormControl>
              <Input
                type="url"
                placeholder={t('purchase.retailerWebsitePlaceholder')}
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
