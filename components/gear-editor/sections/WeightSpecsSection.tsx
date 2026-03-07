/**
 * WeightSpecsSection Component
 *
 * Feature: 001-gear-item-editor, 012-automatic-unit-conversion
 * Task: T016, subtask-6-2
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays form fields for weight and specifications:
 * - Weight value with unit selector (using WeightInput component)
 * - Dimensions (length, width, height in cm)
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { WeightInput } from '@/components/ui/weight-input';
import type { GearItemFormData, WeightUnit } from '@/types/gear';

// =============================================================================
// Component
// =============================================================================

export function WeightSpecsSection() {
  const t = useTranslations('GearEditor');
  const form = useFormContext<GearItemFormData>();

  // Build translated weight unit labels for WeightInput
  const weightUnitLabels: Record<WeightUnit, string> = {
    g: t('weightUnits.grams'),
    oz: t('weightUnits.ounces'),
    lb: t('weightUnits.pounds'),
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t('weightSpecsTitle')}</h3>

      {/* Weight with Unit - Using WeightInput compound component */}
      <FormField
        control={form.control}
        name="weightValue"
        render={({ field: valueField }) => (
          <FormField
            control={form.control}
            name="weightDisplayUnit"
            render={({ field: unitField }) => (
              <FormItem>
                <FormLabel>{t('weightLabel')}</FormLabel>
                <FormControl>
                  <WeightInput
                    value={valueField.value}
                    unit={unitField.value}
                    onValueChange={valueField.onChange}
                    onUnitChange={unitField.onChange}
                    onBlur={valueField.onBlur}
                    name={valueField.name}
                    aria-invalid={!!form.formState.errors.weightValue}
                    labels={weightUnitLabels}
                  />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  {t('weightDescription')}
                </FormDescription>
              </FormItem>
            )}
          />
        )}
      />

      {/* Dimensions */}
      <div className="space-y-2">
        <FormLabel className="text-base">{t('dimensions.title')}</FormLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Length */}
          <FormField
            control={form.control}
            name="lengthCm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">
                  {t('dimensions.length')}
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
                  {t('dimensions.width')}
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
                  {t('dimensions.height')}
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
