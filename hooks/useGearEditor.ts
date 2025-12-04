/**
 * useGearEditor Hook
 *
 * Feature: 001-gear-item-editor
 * Constitution: All form/business logic MUST reside in hooks
 *
 * Handles form state, validation, submission, and entity conversion
 * for the Gear Item Editor.
 */

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';

import type { GearItem, GearItemFormData } from '@/types/gear';
import { DEFAULT_GEAR_ITEM_FORM } from '@/types/gear';
import { gearItemFormSchema } from '@/lib/validations/gear-schema';
import {
  gearItemToFormData,
  createNewGearItem,
  updateGearItem,
} from '@/lib/gear-utils';

// =============================================================================
// Types
// =============================================================================

export interface UseGearEditorOptions {
  /** Existing gear item to edit (undefined for new item) */
  initialItem?: GearItem;
  /** Callback when save is successful */
  onSaveSuccess?: (item: GearItem) => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
  /** Custom redirect path after save (default: /inventory) */
  redirectPath?: string;
}

export interface UseGearEditorReturn {
  /** React Hook Form instance */
  form: ReturnType<typeof useForm<GearItemFormData>>;
  /** Whether the form is for editing (vs creating new) */
  isEditing: boolean;
  /** Whether the form has unsaved changes */
  isDirty: boolean;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Handle form submission */
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  /** Handle cancel action */
  handleCancel: () => void;
  /** Reset form to initial values */
  resetForm: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useGearEditor(
  options: UseGearEditorOptions = {}
): UseGearEditorReturn {
  const {
    initialItem,
    onSaveSuccess,
    onSaveError,
    redirectPath = '/inventory',
  } = options;

  const router = useRouter();
  const isEditing = Boolean(initialItem);

  // Compute initial form values
  const defaultValues = useMemo(() => {
    if (initialItem) {
      return gearItemToFormData(initialItem);
    }
    return DEFAULT_GEAR_ITEM_FORM;
  }, [initialItem]);

  // Initialize form with Zod resolver (T012, T013)
  const form = useForm<GearItemFormData>({
    resolver: zodResolver(gearItemFormSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const {
    handleSubmit: rhfHandleSubmit,
    formState: { isDirty, isSubmitting },
    reset,
  } = form;

  // Reset form when initialItem changes
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Form submission handler (T014)
  const onSubmit = useCallback(
    async (data: GearItemFormData) => {
      try {
        let savedItem: GearItem;

        if (isEditing && initialItem) {
          // Update existing item
          savedItem = updateGearItem(initialItem, data);
        } else {
          // Create new item
          savedItem = createNewGearItem(data);
        }

        // TODO: Replace with actual API call / state management
        // For MVP, we just simulate success
        console.log('Saved gear item:', savedItem);

        // Call success callback
        onSaveSuccess?.(savedItem);

        // Navigate to inventory
        router.push(redirectPath);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Save failed');
        onSaveError?.(err);
        console.error('Failed to save gear item:', err);
      }
    },
    [isEditing, initialItem, onSaveSuccess, onSaveError, router, redirectPath]
  );

  // Wrapped submit handler
  const handleSubmit = useCallback(
    async (e?: React.BaseSyntheticEvent) => {
      await rhfHandleSubmit(onSubmit)(e);
    },
    [rhfHandleSubmit, onSubmit]
  );

  // Cancel handler with dirty check
  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }
    router.push(redirectPath);
  }, [isDirty, router, redirectPath]);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    reset(defaultValues);
  }, [reset, defaultValues]);

  // Unsaved changes warning (T027 - implemented early for safety)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return {
    form,
    isEditing,
    isDirty,
    isSubmitting,
    handleSubmit,
    handleCancel,
    resetForm,
  };
}
