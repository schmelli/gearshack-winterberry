/**
 * StatusSection Component
 *
 * Feature: 001-gear-item-editor, 041-loadout-ux-profile, 045-gear-editor-tabs-marketplace, 013-gear-quantity-tracking
 * Task: T018
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays form fields for status and condition:
 * - Condition (new, used, worn)
 * - Status (active, wishlist, sold)
 * - Quantity (Feature 013)
 * - Favourite toggle (Feature 041)
 * - For Sale toggle (Feature 045)
 * - Can be Borrowed toggle (Feature 045)
 * - Can be Traded toggle (Feature 045)
 * - Notes
 */

'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Heart, DollarSign, HandHelping, ArrowLeftRight } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { GearItemFormData, GearCondition, GearStatus } from '@/types/gear';
import { GEAR_CONDITION_LABELS, GEAR_STATUS_LABELS } from '@/types/gear';

// =============================================================================
// Component
// =============================================================================

export function StatusSection() {
  const form = useFormContext<GearItemFormData>();
  const t = useTranslations('GearEditor');

  const conditions: GearCondition[] = ['new', 'used', 'worn'];
  const statuses: GearStatus[] = ['own', 'wishlist', 'sold', 'lent', 'retired'];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t('statusConditionTitle')}</h3>

      {/* Condition and Status */}
      <div className="grid grid-cols-2 gap-4">
        {/* Condition */}
        <FormField
          control={form.control}
          name="condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('conditionLabel')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('selectCondition')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {conditions.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {GEAR_CONDITION_LABELS[condition]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {t('conditionDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('statusLabel')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('selectStatus')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {GEAR_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {t('statusDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Quantity - Feature 013 */}
      <FormField
        control={form.control}
        name="quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('quantityLabel')}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder={t('quantityPlaceholder')}
                {...field}
              />
            </FormControl>
            <FormDescription>
              {t('quantityDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Toggles Section */}
      <div className="space-y-3">
        {/* Favourite Toggle - Feature 041 */}
        <FormField
          control={form.control}
          name="isFavourite"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <Heart className={`h-4 w-4 ${field.value ? 'fill-red-500 text-red-500' : ''}`} />
                  {t('favouriteLabel')}
                </FormLabel>
                <FormDescription>
                  {t('favouriteDescription')}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* For Sale Toggle - Feature 045 */}
        <FormField
          control={form.control}
          name="isForSale"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <DollarSign className={`h-4 w-4 ${field.value ? 'text-green-600' : ''}`} />
                  {t('forSaleLabel')}
                </FormLabel>
                <FormDescription>
                  {t('forSaleDescription')}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Can be Borrowed Toggle - Feature 045 */}
        <FormField
          control={form.control}
          name="canBeBorrowed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <HandHelping className={`h-4 w-4 ${field.value ? 'text-blue-600' : ''}`} />
                  {t('canBeBorrowedLabel')}
                </FormLabel>
                <FormDescription>
                  {t('canBeBorrowedDescription')}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Can be Traded Toggle - Feature 045 */}
        <FormField
          control={form.control}
          name="canBeTraded"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <ArrowLeftRight className={`h-4 w-4 ${field.value ? 'text-orange-600' : ''}`} />
                  {t('canBeTradedLabel')}
                </FormLabel>
                <FormDescription>
                  {t('canBeTradedDescription')}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Notes */}
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('notesLabel')}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('notesPlaceholder')}
                className="min-h-[120px] resize-y"
                {...field}
              />
            </FormControl>
            <FormDescription>
              {t('notesDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
