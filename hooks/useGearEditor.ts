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
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { uploadGearImage } from '@/lib/firebase/storage';

// =============================================================================
// Image Import Helpers (FR-004, FR-005, FR-010, FR-037)
// =============================================================================

/**
 * Check if URL is external (needs import to Firebase)
 * FR-005: Skip processing for images already stored internally
 */
function isExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  return !url.includes('firebasestorage.googleapis.com');
}

/**
 * Normalize MIME type to a clean format
 * Strips parameters and ensures it's a valid image type
 */
function normalizeImageMimeType(rawType: string | undefined | null): string {
  if (!rawType) return 'image/jpeg';

  // Strip any parameters like "; charset=utf-8"
  const baseType = rawType.split(';')[0].trim().toLowerCase();

  // Map common variations to standard types
  const typeMap: Record<string, string> = {
    'image/jpg': 'image/jpeg',
    'image/pjpeg': 'image/jpeg',
    'image/x-png': 'image/png',
  };

  const normalizedType = typeMap[baseType] || baseType;

  // Only return if it's actually an image type
  if (normalizedType.startsWith('image/')) {
    return normalizedType;
  }

  return 'image/jpeg'; // Default fallback
}

/**
 * Import external image via server proxy
 * FR-001: Use server-side proxy to bypass CORS
 * FR-037: Force valid image MIME type for Firebase Storage
 */
async function importExternalImage(url: string): Promise<File> {
  console.log('[GearEditor] Importing external image:', url);

  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'UNKNOWN' }));
    console.error('[GearEditor] Proxy fetch failed:', response.status, errorData);
    throw new Error(errorData.message || errorData.error || `Failed to import image (${response.status})`);
  }

  const blob = await response.blob();
  const contentTypeHeader = response.headers.get('content-type');

  console.log('[GearEditor] Proxy response:', {
    blobType: blob.type,
    contentTypeHeader,
    blobSize: blob.size,
  });

  // Normalize the MIME type - try blob.type first, then header, then default
  const mimeType = normalizeImageMimeType(blob.type || contentTypeHeader);

  // Get extension from normalized type
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  const ext = extMap[mimeType] || 'jpg';
  const filename = `imported_${Date.now()}.${ext}`;

  console.log('[GearEditor] Creating file:', { filename, mimeType });

  return new File([blob], filename, { type: mimeType });
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
  const { user } = useAuth();
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
          // FR-006: Show loading feedback during import
          setIsUploading(true);
          toast.info('Importing image...');

          try {
            const importedFile = await importExternalImage(data.primaryImageUrl!);
            // FR-037: Log file type before upload for debugging
            console.log('[GearEditor] Uploading file with type:', importedFile.type, 'name:', importedFile.name);
            // Upload the imported file to Firebase Storage
            const uploadResult = await uploadGearImage(importedFile, user.uid);
            // Update the form data with the Firebase Storage URL
            data.primaryImageUrl = uploadResult.downloadUrl;
          } catch (importError) {
            // FR-007: Handle proxy failures gracefully
            const errorMessage = importError instanceof Error
              ? importError.message
              : 'Failed to import image';
            toast.error(errorMessage);
            console.error('Image import failed:', importError);
            return; // Don't proceed with save if import fails
          } finally {
            setIsUploading(false);
          }
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
        const err = error instanceof Error ? error : new Error('Save failed');
        onSaveError?.(err);
        toast.error(err.message || 'Failed to save item');
        console.error('Failed to save gear item:', err);
      } finally {
        // FR-037: CRITICAL - Always reset submitting/uploading state to prevent hanging UI
        setIsSubmittingLocal(false);
        setIsUploading(false);
      }
    },
    [isEditing, initialItem, addItem, updateItemInStore, onSaveSuccess, onSaveError, router, redirectPath, user]
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
