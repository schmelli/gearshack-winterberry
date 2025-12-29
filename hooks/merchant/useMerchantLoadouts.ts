/**
 * useMerchantLoadouts Hook
 *
 * Feature: 053-merchant-integration
 * Task: T032
 *
 * Provides state management for merchant's own loadouts.
 * Handles CRUD operations, status transitions, and wizard state.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  fetchMerchantLoadouts,
  fetchLoadoutById,
  createMerchantLoadout,
  updateMerchantLoadout,
  updateLoadoutStatus,
  deleteMerchantLoadout,
  addLoadoutItem,
  updateLoadoutItem,
  removeLoadoutItem,
  setLoadoutAvailability,
  removeLoadoutAvailability,
} from '@/lib/supabase/merchant-loadout-queries';
import { useMerchantAuth } from './useMerchantAuth';
import type {
  MerchantLoadout,
  MerchantLoadoutDetail,
  MerchantLoadoutInput,
  LoadoutItemInput,
  LoadoutAvailabilityInput,
  LoadoutStatus,
  VALID_LOADOUT_TRANSITIONS,
} from '@/types/merchant-loadout';

// =============================================================================
// Types
// =============================================================================

export type LoadoutsFilter = 'all' | LoadoutStatus;

export interface UseMerchantLoadoutsReturn {
  /** All loadouts for the merchant */
  loadouts: MerchantLoadout[];
  /** Currently editing loadout (full detail) */
  currentLoadout: MerchantLoadoutDetail | null;
  /** Loading states */
  isLoading: boolean;
  isLoadingCurrent: boolean;
  isSaving: boolean;
  /** Error message */
  error: string | null;
  /** Status filter */
  filter: LoadoutsFilter;
  setFilter: (filter: LoadoutsFilter) => void;
  /** Filtered loadouts */
  filteredLoadouts: MerchantLoadout[];
  /** CRUD operations */
  createLoadout: (input: MerchantLoadoutInput) => Promise<MerchantLoadout | null>;
  updateLoadout: (loadoutId: string, input: Partial<MerchantLoadoutInput>) => Promise<boolean>;
  deleteLoadout: (loadoutId: string) => Promise<boolean>;
  /** Status transitions */
  submitForReview: (loadoutId: string) => Promise<boolean>;
  publish: (loadoutId: string) => Promise<boolean>;
  archive: (loadoutId: string) => Promise<boolean>;
  unpublish: (loadoutId: string) => Promise<boolean>;
  /** Item operations */
  addItem: (loadoutId: string, input: LoadoutItemInput) => Promise<boolean>;
  updateItem: (itemId: string, loadoutId: string, input: Partial<LoadoutItemInput>) => Promise<boolean>;
  removeItem: (itemId: string, loadoutId: string) => Promise<boolean>;
  /** Availability operations */
  setAvailability: (loadoutId: string, input: LoadoutAvailabilityInput) => Promise<boolean>;
  removeAvailability: (loadoutId: string, locationId: string) => Promise<boolean>;
  /** Detail view */
  loadLoadout: (loadoutId: string) => Promise<void>;
  clearCurrentLoadout: () => void;
  /** Refresh data */
  refresh: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useMerchantLoadouts(): UseMerchantLoadoutsReturn {
  const { merchant } = useMerchantAuth();

  // State
  const [loadouts, setLoadouts] = useState<MerchantLoadout[]>([]);
  const [currentLoadout, setCurrentLoadout] = useState<MerchantLoadoutDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LoadoutsFilter>('all');

  // ---------------------------------------------------------------------------
  // Fetch Loadouts
  // ---------------------------------------------------------------------------
  const fetchLoadouts = useCallback(async () => {
    if (!merchant?.id) {
      setLoadouts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchMerchantLoadouts(merchant.id);
      setLoadouts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load loadouts';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [merchant?.id]);

  // Fetch on mount and merchant change
  useEffect(() => {
    fetchLoadouts();
  }, [fetchLoadouts]);

  // ---------------------------------------------------------------------------
  // Filtered Loadouts
  // ---------------------------------------------------------------------------
  const filteredLoadouts = useMemo(() => {
    if (filter === 'all') return loadouts;
    return loadouts.filter((l) => l.status === filter);
  }, [loadouts, filter]);

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  const createLoadout = useCallback(
    async (input: MerchantLoadoutInput): Promise<MerchantLoadout | null> => {
      if (!merchant?.id) {
        toast.error('Not authenticated as merchant');
        return null;
      }

      setIsSaving(true);
      try {
        const newLoadout = await createMerchantLoadout(merchant.id, input);
        setLoadouts((prev) => [newLoadout, ...prev]);
        toast.success('Loadout created');
        return newLoadout;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create loadout';
        toast.error(message);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [merchant?.id]
  );

  const updateLoadout = useCallback(
    async (loadoutId: string, input: Partial<MerchantLoadoutInput>): Promise<boolean> => {
      if (!merchant?.id) return false;

      setIsSaving(true);
      try {
        const updated = await updateMerchantLoadout(loadoutId, merchant.id, input);
        setLoadouts((prev) => prev.map((l) => (l.id === loadoutId ? updated : l)));

        // Update current if it's the one being edited
        if (currentLoadout?.id === loadoutId) {
          setCurrentLoadout((prev) =>
            prev
              ? {
                  ...prev,
                  ...input,
                  updatedAt: updated.updatedAt,
                }
              : null
          );
        }

        toast.success('Loadout updated');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update loadout';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [merchant?.id, currentLoadout?.id]
  );

  const deleteLoadout = useCallback(
    async (loadoutId: string): Promise<boolean> => {
      if (!merchant?.id) return false;

      setIsSaving(true);
      try {
        await deleteMerchantLoadout(loadoutId, merchant.id);
        setLoadouts((prev) => prev.filter((l) => l.id !== loadoutId));

        if (currentLoadout?.id === loadoutId) {
          setCurrentLoadout(null);
        }

        toast.success('Loadout deleted');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete loadout';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [merchant?.id, currentLoadout?.id]
  );

  // ---------------------------------------------------------------------------
  // Status Transitions
  // ---------------------------------------------------------------------------

  const changeStatus = useCallback(
    async (loadoutId: string, newStatus: LoadoutStatus, successMessage: string): Promise<boolean> => {
      if (!merchant?.id) return false;

      setIsSaving(true);
      try {
        const updated = await updateLoadoutStatus(loadoutId, merchant.id, newStatus);
        setLoadouts((prev) => prev.map((l) => (l.id === loadoutId ? updated : l)));

        if (currentLoadout?.id === loadoutId) {
          setCurrentLoadout((prev) =>
            prev ? { ...prev, status: newStatus, updatedAt: updated.updatedAt } : null
          );
        }

        toast.success(successMessage);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update status';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [merchant?.id, currentLoadout?.id]
  );

  const submitForReview = useCallback(
    (loadoutId: string) => changeStatus(loadoutId, 'pending_review', 'Submitted for review'),
    [changeStatus]
  );

  const publish = useCallback(
    (loadoutId: string) => changeStatus(loadoutId, 'published', 'Loadout published'),
    [changeStatus]
  );

  const archive = useCallback(
    (loadoutId: string) => changeStatus(loadoutId, 'archived', 'Loadout archived'),
    [changeStatus]
  );

  const unpublish = useCallback(
    (loadoutId: string) => changeStatus(loadoutId, 'draft', 'Loadout unpublished'),
    [changeStatus]
  );

  // ---------------------------------------------------------------------------
  // Item Operations
  // ---------------------------------------------------------------------------

  const addItem = useCallback(
    async (loadoutId: string, input: LoadoutItemInput): Promise<boolean> => {
      if (!merchant?.id) return false;

      setIsSaving(true);
      try {
        await addLoadoutItem(loadoutId, merchant.id, input);

        // Refresh current loadout to get updated items
        if (currentLoadout?.id === loadoutId) {
          const refreshed = await fetchLoadoutById(loadoutId);
          if (refreshed) setCurrentLoadout(refreshed);
        }

        toast.success('Item added');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add item';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [merchant?.id, currentLoadout?.id]
  );

  const updateItem = useCallback(
    async (
      itemId: string,
      loadoutId: string,
      input: Partial<LoadoutItemInput>
    ): Promise<boolean> => {
      setIsSaving(true);
      try {
        await updateLoadoutItem(itemId, loadoutId, input);

        // Refresh current loadout
        if (currentLoadout?.id === loadoutId) {
          const refreshed = await fetchLoadoutById(loadoutId);
          if (refreshed) setCurrentLoadout(refreshed);
        }

        toast.success('Item updated');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update item';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentLoadout?.id]
  );

  const removeItem = useCallback(
    async (itemId: string, loadoutId: string): Promise<boolean> => {
      setIsSaving(true);
      try {
        await removeLoadoutItem(itemId, loadoutId);

        // Refresh current loadout
        if (currentLoadout?.id === loadoutId) {
          const refreshed = await fetchLoadoutById(loadoutId);
          if (refreshed) setCurrentLoadout(refreshed);
        }

        toast.success('Item removed');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove item';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentLoadout?.id]
  );

  // ---------------------------------------------------------------------------
  // Availability Operations
  // ---------------------------------------------------------------------------

  const setAvailabilityFn = useCallback(
    async (loadoutId: string, input: LoadoutAvailabilityInput): Promise<boolean> => {
      setIsSaving(true);
      try {
        await setLoadoutAvailability(loadoutId, input);

        // Refresh current loadout
        if (currentLoadout?.id === loadoutId) {
          const refreshed = await fetchLoadoutById(loadoutId);
          if (refreshed) setCurrentLoadout(refreshed);
        }

        toast.success('Availability updated');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update availability';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentLoadout?.id]
  );

  const removeAvailabilityFn = useCallback(
    async (loadoutId: string, locationId: string): Promise<boolean> => {
      setIsSaving(true);
      try {
        await removeLoadoutAvailability(loadoutId, locationId);

        // Refresh current loadout
        if (currentLoadout?.id === loadoutId) {
          const refreshed = await fetchLoadoutById(loadoutId);
          if (refreshed) setCurrentLoadout(refreshed);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove availability';
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentLoadout?.id]
  );

  // ---------------------------------------------------------------------------
  // Detail View
  // ---------------------------------------------------------------------------

  const loadLoadout = useCallback(async (loadoutId: string): Promise<void> => {
    setIsLoadingCurrent(true);
    setError(null);

    try {
      const loadout = await fetchLoadoutById(loadoutId);
      setCurrentLoadout(loadout);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load loadout';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoadingCurrent(false);
    }
  }, []);

  const clearCurrentLoadout = useCallback(() => {
    setCurrentLoadout(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    loadouts,
    currentLoadout,
    isLoading,
    isLoadingCurrent,
    isSaving,
    error,
    filter,
    setFilter,
    filteredLoadouts,
    createLoadout,
    updateLoadout,
    deleteLoadout,
    submitForReview,
    publish,
    archive,
    unpublish,
    addItem,
    updateItem,
    removeItem,
    setAvailability: setAvailabilityFn,
    removeAvailability: removeAvailabilityFn,
    loadLoadout,
    clearCurrentLoadout,
    refresh: fetchLoadouts,
  };
}
