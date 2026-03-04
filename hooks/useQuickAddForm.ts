/**
 * useQuickAddForm Hook
 *
 * Feature: 054-zero-friction-input
 *
 * Manages form state for the QuickAddSheet review form.
 * Extracted from QuickAddSheet to follow Feature-Sliced Light:
 * all business logic in hooks, stateless UI in components.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { QuickAddExtraction, QuickAddOverrides } from '@/types/quick-add';
import type { GearCondition } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

export interface FormState {
  name: string;
  brand: string;
  weightGrams: string;
  weightUnit: 'g' | 'kg';
  condition: GearCondition;
  productTypeId: string;
  pricePaid: string;
  currency: string;
}

function initFormState(extraction: QuickAddExtraction | null): FormState {
  return {
    name: extraction?.name ?? '',
    brand: extraction?.brand ?? '',
    weightGrams: extraction?.weightGrams
      ? String(extraction.weightGrams)
      : '',
    weightUnit: 'g',
    condition: extraction?.condition ?? 'new',
    productTypeId: extraction?.productTypeId ?? '',
    pricePaid: extraction?.pricePaid ? String(extraction.pricePaid) : '',
    currency: extraction?.currency ?? 'EUR',
  };
}

// =============================================================================
// Hook
// =============================================================================

export interface UseQuickAddFormReturn {
  form: FormState;
  updateField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  handleSave: () => void;
}

export function useQuickAddForm(
  extraction: QuickAddExtraction | null,
  onSave: (overrides: QuickAddOverrides) => void,
): UseQuickAddFormReturn {
  const [form, setForm] = useState<FormState>(() => initFormState(extraction));

  // Track the extraction identity to avoid resetting user edits on referential re-renders.
  // We use a composite key (name + confidence) because the extraction object may be
  // structurally identical but referentially new after a parent re-render.
  const prevExtractionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!extraction) return;
    const key = `${extraction.name ?? ''}::${extraction.confidence}`;
    if (key !== prevExtractionKeyRef.current) {
      prevExtractionKeyRef.current = key;
      setForm(initFormState(extraction));
    }
  }, [extraction]);

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSave = useCallback(() => {
    // Convert weight to grams
    let weightGrams: number | null = null;
    const rawWeight = parseFloat(form.weightGrams);
    if (!isNaN(rawWeight) && rawWeight > 0) {
      // Round only when converting from kg (avoids sub-gram precision loss for gram input)
      weightGrams = form.weightUnit === 'kg' ? Math.round(rawWeight * 1000) : rawWeight;
    }

    const overrides: QuickAddOverrides = {
      name: form.name || null,
      brand: form.brand || null,
      weightGrams,
      condition: form.condition,
      productTypeId: form.productTypeId || null,
      pricePaid: (() => {
        const parsed = parseFloat(form.pricePaid);
        return !isNaN(parsed) && parsed > 0 ? parsed : null;
      })(),
      currency: form.currency || null,
    };

    onSave(overrides);
  }, [form, onSave]);

  return { form, updateField, handleSave };
}
