/**
 * useGearEditor Hook
 *
 * Feature: 001-gear-item-editor
 * Updated: 005-loadout-management - Migrated to use zustand store
 * Updated: 037-final-stabilization - Error recovery and MIME sanitization
 * Constitution: All form/business logic MUST reside in hooks
 *
 * Handles form state, validation, submission, and entity conversion
 * for the Gear Item Editor.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';

import type { GearItem, GearItemFormData } from '@/types/gear';
import { DEFAULT_GEAR_ITEM_FORM } from '@/types/gear';
import { gearItemFormSchema } from '@/lib/validations/gear-schema';
import {
  gearItemToFormData,
  formDataToGearItem,
} from '@/lib/gear-utils';
import { useStore } from '@/hooks/useSupabaseStore';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';

// =============================================================================
// Image Import Helpers
// =============================================================================

/**
 * Check if URL is external (needs import to Cloudinary)
 * Skip Cloudinary URLs (already cloud-hosted)
 */
function isExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  // Skip Cloudinary URLs (already cloud-hosted, no need to import)
  if (url.includes('res.cloudinary.com')) return false;
  return true;
}

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
  /** Whether image upload is in progress */
  isUploading: boolean;
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
  const { user } = useAuthContext();
  const { uploadUrl: uploadToCloudinary } = useCloudinaryUpload();
  const isEditing = Boolean(initialItem);

  // Store actions
  const addItem = useStore((state) => state.addItem);
  const updateItemInStore = useStore((state) => state.updateItem);
  const deleteItemFromStore = useStore((state) => state.deleteItem);

  // Local state for async operations
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);

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
    formState: { isDirty },
    reset,
  } = form;

  // Reset form when initialItem changes
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Form submission handler (T014, FR-004, FR-006, FR-007, FR-037)
  const onSubmit = useCallback(
    async (data: GearItemFormData) => {
      // FR-037: Wrap entire save logic in try/catch/finally for error recovery
      setIsSubmittingLocal(true);

      try {
        // FR-004, FR-005: Import external images before saving
        // Check if primaryImageUrl needs to be imported
        if (isExternalUrl(data.primaryImageUrl) && user?.uid) {
          console.log('[GearEditor] ====== STARTING IMAGE IMPORT ======');
          console.log('[GearEditor] External URL detected:', data.primaryImageUrl);
          console.log('[GearEditor] User ID:', user.uid);

          // FR-006: Show loading feedback during import
          setIsUploading(true);
          toast.info('Importing image...');

          try {
            // Upload external URL directly to Cloudinary (server-side fetch bypasses CORS)
            console.log('[GearEditor] Uploading external URL to Cloudinary...');

            // Generate a temporary item ID for new items
            const itemId = initialItem?.id ?? `temp-${Date.now()}`;

            const cloudinaryUrl = await uploadToCloudinary(data.primaryImageUrl!, {
              userId: user.uid,
              itemId,
            });

            if (!cloudinaryUrl) {
              throw new Error('Failed to upload to Cloudinary');
            }

            console.log('[GearEditor] Upload complete - Cloudinary URL:', cloudinaryUrl);

            // Update the form data with the Cloudinary URL
            data.primaryImageUrl = cloudinaryUrl;
            toast.success('Image imported successfully!');
          } catch (importError) {
            // FR-007: Handle proxy failures gracefully - show detailed error
            console.error('[GearEditor] ====== IMAGE IMPORT FAILED ======');
            console.error('[GearEditor] Error:', importError);

            // Extract meaningful error message
            let errorMessage = 'Failed to import image';
            if (importError instanceof Error) {
              errorMessage = importError.message;
              // Log additional details if available
              const errorDetails = (importError as { details?: unknown }).details;
              if (errorDetails) {
                console.error('[GearEditor] Error details:', errorDetails);
              }
            }

            toast.error(`Image import failed: ${errorMessage}`);
            return; // Don't proceed with save if import fails
          } finally {
            setIsUploading(false);
          }
        } else {
          console.log('[GearEditor] No external image to import:', {
            url: data.primaryImageUrl,
            isExternal: isExternalUrl(data.primaryImageUrl),
            hasUser: Boolean(user?.uid),
          });
        }

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
        // FR-037: Ensure error is properly reported
        // Handle Supabase errors which have a different structure
        let errorMessage = 'Save failed';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error && typeof error === 'object') {
          // Supabase errors have code, message, details properties
          const supabaseError = error as { message?: string; code?: string; details?: string };
          errorMessage = supabaseError.message || supabaseError.details || 'Save failed';
          console.error('[GearEditor] Supabase error details:', {
            code: supabaseError.code,
            message: supabaseError.message,
            details: supabaseError.details,
          });
        }
        const err = new Error(errorMessage);
        onSaveError?.(err);
        toast.error(errorMessage);
        console.error('Failed to save gear item:', error);
      } finally {
        // FR-037: CRITICAL - Always reset submitting/uploading state to prevent hanging UI
        setIsSubmittingLocal(false);
        setIsUploading(false);
      }
    },
    [isEditing, initialItem, addItem, updateItemInStore, onSaveSuccess, onSaveError, router, redirectPath, user, uploadToCloudinary]
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
    isSubmitting: isSubmittingLocal,
    isUploading,
    isDeleting,
    handleSubmit,
    handleCancel,
    resetForm,
    handleDelete,
  };
}
