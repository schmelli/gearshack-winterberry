/**
 * Gear Detail Modal Hook
 *
 * Feature: 045-gear-detail-modal
 * Tasks: T010, T011, T012, T017b
 *
 * Manages the state of the gear detail modal including:
 * - Open/close state with gear item ID
 * - URL parameter sync for deep linking (?gear=<id>)
 * - Responsive detection for Dialog (desktop) vs Sheet (mobile)
 * - Deleted item detection
 */

'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

export interface GearDetailModalState {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** The ID of the gear item being viewed */
  gearId: string | null;
}

export interface GearDetailModalActions {
  /** Open the modal for a specific gear item */
  open: (gearId: string) => void;
  /** Close the modal */
  close: () => void;
}

export interface UseGearDetailModalReturn extends GearDetailModalState, GearDetailModalActions {
  /** Whether the current viewport is mobile (<768px) */
  isMobile: boolean;
}

// =============================================================================
// useMediaQuery Hook (T012) - Using useSyncExternalStore
// =============================================================================

/**
 * Custom hook to detect if viewport matches a media query.
 * Uses useSyncExternalStore for proper React 18+ synchronization.
 * Exported for use in components that need responsive detection.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') {
        return () => {};
      }
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', callback);
      return () => mediaQuery.removeEventListener('change', callback);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// =============================================================================
// useGearDetailModal Hook
// =============================================================================

/**
 * Hook for managing the gear detail modal state.
 *
 * Features:
 * - Open/close modal with gear item ID
 * - Syncs with URL search params for deep linking (?gear=<id>)
 * - Detects mobile viewport for responsive rendering
 * - Handles deleted item edge case with toast notification
 *
 * @param onItemNotFound - Optional callback when a gear item is not found
 *
 * @example
 * ```tsx
 * const { isOpen, gearId, open, close, isMobile } = useGearDetailModal();
 *
 * // Open modal for an item
 * open('item-123');
 *
 * // Close modal
 * close();
 *
 * // Check if mobile for Sheet vs Dialog
 * if (isMobile) {
 *   return <Sheet>...</Sheet>;
 * }
 * return <Dialog>...</Dialog>;
 * ```
 */
export function useGearDetailModal(
  onItemNotFound?: () => void
): UseGearDetailModalReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive state directly from URL params (T011)
  // URL is the single source of truth - no separate state needed
  const gearId = searchParams.get('gear');
  const isOpen = !!gearId;

  // Responsive detection (T012)
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Open modal (T010) - Updates URL which drives state
  const open = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('gear', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Close modal (T010) - Updates URL which drives state
  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('gear');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  // Handle deleted item detection (T017b)
  const handleItemNotFound = useCallback(() => {
    toast.error('Item not found', {
      description: 'This gear item may have been deleted.',
    });
    close();
    onItemNotFound?.();
  }, [close, onItemNotFound]);

  return {
    isOpen,
    gearId,
    isMobile,
    open,
    close,
    // Expose for components to call when item lookup fails
    handleItemNotFound,
  } as UseGearDetailModalReturn & { handleItemNotFound: () => void };
}

export default useGearDetailModal;
