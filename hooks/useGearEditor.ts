/**
 * useGearEditor Hook
 *
 * Feature: 001-gear-item-editor
 * Updated: 005-loadout-management - Migrated to use zustand store
 * Constitution: All form/business logic MUST reside in hooks
 *
 * Handles form state, validation, submission, and entity conversion
 * for the Gear Item Editor.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import type { GearItem, GearItemFormData } from '@/types/gear';
import { DEFAULT_GEAR_ITEM_FORM } from '@/types/gear';
import { gearItemFormSchema } from '@/lib/validations/gear-schema';
import {
  gearItemToFormData,
  formDataToGearItem,
} from '@/lib/gear-utils';
import { useStore } from '@/hooks/useStore';

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
  /** Whether delete operation is in progress */
  isDeleting: boolean;
  /** Handle form submission */
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  /** Handle cancel action */
  handleCancel: () => void;
  /** Reset form to initial values */
  resetForm: () => void;
  /** Handle delete action (only available when editing) */
  handleDelete: () => Promise<void>;
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

  // Store actions
  const addItem = useStore((state) => state.addItem);
  const updateItemInStore = useStore((state) => state.updateItem);
  const deleteItemFromStore = useStore((state) => state.deleteItem);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);

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
        const itemData = formDataToGearItem(data);

        if (isEditing && initialItem) {
          // Update existing item in store (now async with optimistic update)
          await updateItemInStore(initialItem.id, itemData);
          // Reconstruct saved item for callback
          const savedItem: GearItem = {
            ...initialItem,
            ...itemData,
            updatedAt: new Date(),
          };
          onSaveSuccess?.(savedItem);
          toast.success('Item updated successfully!');
        } else {
          // Add new item to store (now async with optimistic update)
          const newId = await addItem(itemData);
          // Reconstruct saved item for callback
          const savedItem: GearItem = {
            id: newId,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...itemData,
          };
          onSaveSuccess?.(savedItem);
          toast.success('Item saved successfully!');
        }

        // Navigate to inventory (item already visible via optimistic update)
        router.push(redirectPath);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Save failed');
        onSaveError?.(err);
        console.error('Failed to save gear item:', err);
      }
    },
    [isEditing, initialItem, addItem, updateItemInStore, onSaveSuccess, onSaveError, router, redirectPath]
  );

  // Wrapped submit handler with validation
  const handleSubmit = useCallback(
    async (e?: React.BaseSyntheticEvent) => {
      e?.preventDefault();

      // Trigger validation on all fields first
      const isValid = await form.trigger();

      if (!isValid) {
        toast.error('Please fix errors before saving');
        return;
      }

      // Proceed with submission if validation passes
      await rhfHandleSubmit(onSubmit)(e);
    },
    [form, rhfHandleSubmit, onSubmit]
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

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!initialItem) return;

    setIsDeleting(true);
    try {
      await deleteItemFromStore(initialItem.id);
      toast.success('Item deleted.');
      router.push('/inventory');
    } catch (error) {
      toast.error('Failed to delete item');
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [initialItem, deleteItemFromStore, router]);

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
    isDeleting,
    handleSubmit,
    handleCancel,
    resetForm,
    handleDelete,
  };
}
