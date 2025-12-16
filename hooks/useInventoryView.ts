/**
 * useInventoryView Hook
 *
 * Feature: 049-wishlist-view
 * Task: T025
 *
 * Manages view mode state (inventory vs wishlist) using URL search params
 * with sessionStorage fallback for persistence across navigation.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { InventoryViewMode } from '@/types/wishlist';

// =============================================================================
// Session Storage Key
// =============================================================================

const VIEW_MODE_STORAGE_KEY = 'gearshack-inventory-view-mode';

// =============================================================================
// Hook Implementation
// =============================================================================

export interface UseInventoryViewReturn {
  viewMode: InventoryViewMode;
  setViewMode: (mode: InventoryViewMode) => void;
}

export function useInventoryView(): UseInventoryViewReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ---------------------------------------------------------------------------
  // Get Initial View Mode
  // ---------------------------------------------------------------------------
  const getInitialViewMode = useCallback((): InventoryViewMode => {
    // Priority 1: Check URL search params
    const viewParam = searchParams.get('view');
    if (viewParam === 'wishlist' || viewParam === 'inventory') {
      return viewParam;
    }

    // Priority 2: Check sessionStorage
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored === 'wishlist' || stored === 'inventory') {
        return stored;
      }
    }

    // Default: inventory view
    return 'inventory';
  }, [searchParams]);

  // ---------------------------------------------------------------------------
  // State: View Mode
  // ---------------------------------------------------------------------------
  const [viewMode, setViewModeState] = useState<InventoryViewMode>(getInitialViewMode);

  // ---------------------------------------------------------------------------
  // Sync View Mode with URL and SessionStorage
  // ---------------------------------------------------------------------------
  const setViewMode = useCallback(
    (mode: InventoryViewMode) => {
      // Update state
      setViewModeState(mode);

      // Update URL search params
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', mode);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });

      // Update sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      }
    },
    [searchParams, router, pathname]
  );

  // ---------------------------------------------------------------------------
  // Sync State with URL Changes (Back/Forward Navigation)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'wishlist' || viewParam === 'inventory') {
      setViewModeState(viewParam);
    }
  }, [searchParams]);

  // ---------------------------------------------------------------------------
  // Return Hook Interface
  // ---------------------------------------------------------------------------
  return {
    viewMode,
    setViewMode,
  };
}
