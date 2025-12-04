/**
 * WeightSpecsSection Component
 *
 * Feature: 001-gear-item-editor
 * Task: T016
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays form fields for weight and specifications:
 * - Weight value with unit selector
 * - Dimensions (length, width, height in cm)
 */

'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GearItemFormData, WeightUnit } from '@/types/gear';
import { WEIGHT_UNIT_LABELS } from '@/types/gear';

// =============================================================================
// Component
// =============================================================================

export function WeightSpecsSection() {
  const form = useFormContext<GearItemFormData>();

  const weightUnits: WeightUnit[] = ['g', 'oz', 'lb'];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Weight & Specifications</h3>

      {/* Weight with Unit */}
      <div className="grid grid-cols-2 gap-4">
        {/* Weight Value */}
        <FormField
          control={form.control}
          name="weightValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Weight Unit */}
        <FormField
          control={form.control}
          name="weightDisplayUnit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {weightUnits.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {WEIGHT_UNIT_LABELS[unit]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormDescription>
        Weight is stored in grams internally for consistency.
      </FormDescription>

      {/* Dimensions */}
      <div className="space-y-2">
        <FormLabel className="text-base">Dimensions (cm)</FormLabel>
        <div className="grid grid-cols-3 gap-4">
          {/* Length */}
          <FormField
            control={form.control}
            name="lengthCm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">
                  Length
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Width */}
          <FormField
            control={form.control}
            name="widthCm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">
                  Width
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Height */}
          <FormField
            control={form.control}
            name="heightCm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">
                  Height
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
