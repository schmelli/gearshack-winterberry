/**
 * useDuplicateDetection Hook
 *
 * Feature: XXX-duplicate-detection
 * Constitution: All form/business logic MUST reside in hooks
 *
 * Detects potential duplicate gear items before saving.
 * Manages dialog state and provides actions for handling duplicates.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';

import type { GearItemFormData } from '@/types/gear';
import {
  findDuplicates,
  getBestMatch,
  type DuplicateMatch,
} from '@/lib/duplicate-detection';
import { useStore } from '@/hooks/useSupabaseStore';

// =============================================================================
// Types
// =============================================================================

export interface UseDuplicateDetectionOptions {
  /** Redirect path after increasing quantity (default: /inventory) */
  redirectPath?: string;
}

export interface UseDuplicateDetectionReturn {
  /** Whether the duplicate warning dialog is open */
  isOpen: boolean;
  /** List of potential duplicate matches */
  matches: DuplicateMatch[];
  /** The form data being checked */
  pendingFormData: GearItemFormData | null;
  /** Best match (highest score) */
  bestMatch: DuplicateMatch | null;

  /**
   * Check for duplicates. Returns true if duplicates found (dialog opens).
   * @param formData - The form data to check
   * @param excludeId - Item ID to exclude (for editing existing items)
   * @returns true if duplicates found, false if none
   */
  checkForDuplicates: (formData: GearItemFormData, excludeId?: string) => boolean;

  /** Confirm save despite duplicates - closes dialog and signals to proceed */
  onConfirmSave: () => void;

  /** Cancel - closes dialog and stays on form */
  onCancel: () => void;

  /**
   * Increase quantity on the best matching item instead of creating new
   * Updates the existing item and redirects
   */
  onIncreaseQuantity: () => Promise<void>;

  /** Whether the increase quantity operation is in progress */
  isIncreasingQuantity: boolean;

  /** Signal that save should proceed (set by onConfirmSave) */
  shouldProceedWithSave: boolean;

  /** Reset the shouldProceedWithSave flag after handling */
  resetProceedFlag: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useDuplicateDetection(
  options: UseDuplicateDetectionOptions = {}
): UseDuplicateDetectionReturn {
  const { redirectPath = '/inventory' } = options;

  const router = useRouter();
  const allItems = useStore((state) => state.items);
  const updateItem = useStore((state) => state.updateItem);

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [pendingFormData, setPendingFormData] = useState<GearItemFormData | null>(null);
  const [isIncreasingQuantity, setIsIncreasingQuantity] = useState(false);
  const [shouldProceedWithSave, setShouldProceedWithSave] = useState(false);

  // Computed best match
  const bestMatch = useMemo(() => getBestMatch(matches), [matches]);

  /**
   * Check for duplicates in the inventory
   */
  const checkForDuplicates = useCallback(
    (formData: GearItemFormData, excludeId?: string): boolean => {
      // Reset proceed flag
      setShouldProceedWithSave(false);

      // Find duplicates
      const foundMatches = findDuplicates(formData, allItems, {
        excludeId,
        threshold: 0.7,
        maxMatches: 3,
      });

      if (foundMatches.length > 0) {
        // Duplicates found - open dialog
        setMatches(foundMatches);
        setPendingFormData(formData);
        setIsOpen(true);
        return true;
      }

      // No duplicates found
      return false;
    },
    [allItems]
  );

  /**
   * Close the dialog and reset state
   */
  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setMatches([]);
    setPendingFormData(null);
  }, []);

  /**
   * User confirms they want to save despite duplicate
   */
  const onConfirmSave = useCallback(() => {
    setShouldProceedWithSave(true);
    closeDialog();
  }, [closeDialog]);

  /**
   * User cancels - close dialog and stay on form
   */
  const onCancel = useCallback(() => {
    closeDialog();
  }, [closeDialog]);

  /**
   * Increase quantity on the existing item instead of creating new
   */
  const onIncreaseQuantity = useCallback(async () => {
    if (!bestMatch) {
      toast.error('No matching item found');
      return;
    }

    setIsIncreasingQuantity(true);

    try {
      const existingItem = bestMatch.existingItem;
      const currentQuantity = existingItem.quantity || 1;
      const newQuantity = currentQuantity + 1;

      // Update the existing item's quantity
      await updateItem(existingItem.id, {
        quantity: newQuantity,
      });

      toast.success(
        `Updated quantity to ${newQuantity} for "${existingItem.name}"`
      );

      closeDialog();
      router.push(redirectPath);
    } catch (error) {
      console.error('Failed to increase quantity:', error);
      toast.error('Failed to update quantity');
    } finally {
      setIsIncreasingQuantity(false);
    }
  }, [bestMatch, updateItem, closeDialog, router, redirectPath]);

  /**
   * Reset the proceed flag after the parent has handled it
   */
  const resetProceedFlag = useCallback(() => {
    setShouldProceedWithSave(false);
  }, []);

  return {
    isOpen,
    matches,
    pendingFormData,
    bestMatch,
    checkForDuplicates,
    onConfirmSave,
    onCancel,
    onIncreaseQuantity,
    isIncreasingQuantity,
    shouldProceedWithSave,
    resetProceedFlag,
  };
}
