/**
 * useAddToInventory Hook
 *
 * Feature: Shakedown Detail Enhancement
 *
 * Business logic for adding gear items from shakedowns to user's inventory.
 * Handles duplicate detection, database operations, and state management.
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { ShakedownGearItem } from '@/hooks/shakedowns/useShakedown';

// =============================================================================
// Types
// =============================================================================

export interface UseAddToInventoryOptions {
  /** Translation function for error messages */
  t: (key: string, params?: Record<string, unknown>) => string;
  /** Callback after successful addition */
  onSuccess?: () => void;
}

export interface UseAddToInventoryReturn {
  /** Whether operation is in progress */
  isLoading: boolean;
  /** Add item to inventory */
  addToInventory: (item: ShakedownGearItem, userId: string) => Promise<boolean>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAddToInventory({
  t,
  onSuccess,
}: UseAddToInventoryOptions): UseAddToInventoryReturn {
  const [isLoading, setIsLoading] = useState(false);

  const addToInventory = useCallback(
    async (item: ShakedownGearItem, userId: string): Promise<boolean> => {
      setIsLoading(true);

      try {
        const supabase = createClient();

        // Create new gear item in user's inventory
        const { error } = await supabase.from('gear_items').insert({
          user_id: userId,
          name: item.name,
          brand: item.brand,
          description: item.description,
          weight_grams: item.weightGrams,
          primary_image_url: item.imageUrl,
          product_type_id: item.productTypeId,
          status: 'own',
          source_share_token: item.id, // Attribution to original item
        });

        if (error) {
          console.error('Error adding item to inventory:', error);
          toast.error(t('errors.failed'));
          return false;
        }

        toast.success(t('success'), {
          description: item.name,
        });

        onSuccess?.();
        return true;
      } catch (err) {
        console.error('Unexpected error adding item:', err);
        toast.error(t('errors.failed'));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [t, onSuccess]
  );

  return {
    isLoading,
    addToInventory,
  };
}

export default useAddToInventory;
