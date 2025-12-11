/**
 * StatusSection Component
 *
 * Feature: 001-gear-item-editor, 041-loadout-ux-profile
 * Task: T018
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays form fields for status and condition:
 * - Condition (new, used, worn)
 * - Status (active, wishlist, sold)
 * - Favourite toggle (Feature 041)
 * - Notes
 */

'use client';

import { useFormContext } from 'react-hook-form';
import { Heart } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { GearItemFormData, GearCondition, GearStatus } from '@/types/gear';
import { GEAR_CONDITION_LABELS, GEAR_STATUS_LABELS } from '@/types/gear';

// =============================================================================
// Component
// =============================================================================

export function StatusSection() {
  const form = useFormContext<GearItemFormData>();

  const conditions: GearCondition[] = ['new', 'used', 'worn'];
  const statuses: GearStatus[] = ['own', 'wishlist', 'sold', 'lent', 'retired'];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Status & Condition</h3>

      {/* Condition and Status */}
      <div className="grid grid-cols-2 gap-4">
        {/* Condition */}
        <FormField
          control={form.control}
          name="condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select condition" />
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
                Current physical condition of the item
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
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
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
                Own = in your gear closet, Wishlist = planning to buy
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Favourite Toggle - Feature 041 */}
      <FormField
        control={form.control}
        name="isFavourite"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="flex items-center gap-2">
                <Heart className={`h-4 w-4 ${field.value ? 'fill-red-500 text-red-500' : ''}`} />
                Favourite
              </FormLabel>
              <FormDescription>
                Mark this item as a favourite to show it on your profile
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

      {/* Notes */}
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Add any additional notes about this item..."
                className="min-h-[120px] resize-y"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Personal notes, modifications, experiences, etc.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
