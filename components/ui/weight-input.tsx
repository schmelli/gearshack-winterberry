/**
 * WeightInput Component
 *
 * Feature: 012-automatic-unit-conversion
 * Task: subtask-4-1
 *
 * Compound input component combining weight value input with unit selector.
 * Stateless component compatible with react-hook-form.
 *
 * Constitution: UI components MUST be stateless (logic in hooks)
 */

'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WEIGHT_UNIT_LABELS, type WeightUnit } from '@/types/gear';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface WeightInputProps {
  /** Current weight value */
  value?: number | string;
  /** Current weight unit */
  unit: WeightUnit;
  /** Callback when weight value changes */
  onValueChange?: (value: string) => void;
  /** Callback when unit changes */
  onUnitChange?: (unit: WeightUnit) => void;
  /** Callback for blur event (for auto-conversion) */
  onBlur?: () => void;
  /** Input placeholder text */
  placeholder?: string;
  /** Input name for form field */
  name?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes for container */
  className?: string;
  /** Additional CSS classes for input */
  inputClassName?: string;
  /** Additional CSS classes for select */
  selectClassName?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** ARIA invalid state */
  'aria-invalid'?: boolean;
  /** i18n labels for weight units (falls back to WEIGHT_UNIT_LABELS if not provided) */
  labels?: Record<WeightUnit, string>;
}

// =============================================================================
// Constants
// =============================================================================

const WEIGHT_UNITS: WeightUnit[] = ['g', 'oz', 'lb'];

// =============================================================================
// Component
// =============================================================================

/**
 * WeightInput - Compound component for weight entry with unit selection
 *
 * Combines a numeric input for weight value with a unit selector dropdown.
 * Stateless and fully controlled - parent component manages state and conversion logic.
 *
 * @example
 * ```tsx
 * <WeightInput
 *   value={weightValue}
 *   unit={weightUnit}
 *   onValueChange={(value) => setWeightValue(value)}
 *   onUnitChange={(unit) => setWeightUnit(unit)}
 *   onBlur={handleWeightConversion}
 * />
 * ```
 */
export const WeightInput = React.forwardRef<HTMLInputElement, WeightInputProps>(
  (
    {
      value,
      unit,
      onValueChange,
      onUnitChange,
      onBlur,
      placeholder = '0',
      name,
      disabled = false,
      className,
      inputClassName,
      selectClassName,
      'aria-label': ariaLabel,
      'aria-invalid': ariaInvalid,
      labels,
    },
    ref
  ) => {
    // Use provided labels or fall back to default English labels
    const unitLabels = labels ?? WEIGHT_UNIT_LABELS;
    return (
      <div className={cn('flex items-center gap-2', className)} data-slot="weight-input">
        {/* Weight Value Input */}
        <Input
          ref={ref}
          type="number"
          min="0"
          step="any"
          name={name}
          value={value ?? ''}
          onChange={(e) => onValueChange?.(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel ?? 'Weight value'}
          aria-invalid={ariaInvalid}
          className={cn('flex-1', inputClassName)}
        />

        {/* Unit Selector */}
        <Select value={unit} onValueChange={onUnitChange} disabled={disabled}>
          <SelectTrigger
            size="default"
            className={cn('w-[120px]', selectClassName)}
            aria-label="Weight unit"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEIGHT_UNITS.map((weightUnit) => (
              <SelectItem key={weightUnit} value={weightUnit}>
                {unitLabels[weightUnit]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
);

WeightInput.displayName = 'WeightInput';
