/**
 * PurchaseSection Component
 *
 * Feature: 001-gear-item-editor, Issue #89, 057-wishlist-pricing-enhancements
 * Task: T017
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays form fields for purchase details:
 * - For wishlist items: Manufacturer price with currency (Feature 057)
 * - For inventory items: Price paid with currency
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
// Types
// =============================================================================

interface PurchaseSectionProps {
  /** Mode determines which price fields to show (Feature 057) */
  mode?: 'inventory' | 'wishlist';
}

// =============================================================================
// Constants
// =============================================================================

const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY'] as const;

// =============================================================================
// Component
// =============================================================================

export function PurchaseSection({ mode = 'inventory' }: PurchaseSectionProps) {
  const t = useTranslations('GearEditor');
  const tCommon = useTranslations('Common');
  const form = useFormContext<GearItemFormData>();

  const isWishlist = mode === 'wishlist';

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="purchase">
        <AccordionTrigger className="text-lg font-medium">
          {isWishlist ? t('purchase.wishlistTitle') : t('purchase.title')}
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          {/* Price and Currency - Conditional based on mode (Feature 057) */}
          <div className="grid grid-cols-2 gap-4">
        {isWishlist ? (
          <>
            {/* Manufacturer Price (Wishlist mode) */}
            <FormField
              control={form.control}
              name="manufacturerPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('purchase.manufacturerPriceLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t('purchase.manufacturerPricePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Manufacturer Currency */}
            <FormField
              control={form.control}
              name="manufacturerCurrency"
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
                      {CURRENCY_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {tCommon(`currencies.${code}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <>
            {/* Price Paid (Inventory mode) */}
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
                      {CURRENCY_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {tCommon(`currencies.${code}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
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
