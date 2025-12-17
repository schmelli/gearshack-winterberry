/**
 * WishlistToggle Component
 *
 * Feature: 049-wishlist-view
 * Tasks: T024, T082, T083
 *
 * Tab control to switch between Inventory and Wishlist views.
 * Uses shadcn/ui Tabs component for consistency with design system.
 *
 * Accessibility Features (T082, T083):
 * - aria-label on tab container for screen readers
 * - Proper role="tablist" (inherited from Radix Tabs)
 * - aria-selected automatically handled by Radix
 * - Keyboard navigation: Tab, Arrow Left/Right, Enter/Space
 * - Visible focus indicators via Tailwind focus-visible styles
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import type { InventoryViewMode } from '@/types/wishlist';

// =============================================================================
// Component Props
// =============================================================================

export interface WishlistToggleProps {
  /** Current view mode (inventory or wishlist) */
  mode: InventoryViewMode;
  /** Callback when view mode changes */
  onModeChange: (mode: InventoryViewMode) => void;
  /** Number of items in inventory */
  inventoryCount: number;
  /** Number of items in wishlist */
  wishlistCount: number;
  /** Callback for screen reader announcements when view changes */
  onViewChangeAnnouncement?: (message: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function WishlistToggle({
  mode,
  onModeChange,
  inventoryCount,
  wishlistCount,
  onViewChangeAnnouncement,
}: WishlistToggleProps) {
  const previousModeRef = useRef<InventoryViewMode>(mode);

  // Track mode changes and trigger announcements
  useEffect(() => {
    if (previousModeRef.current !== mode && onViewChangeAnnouncement) {
      const viewName = mode === 'wishlist' ? 'Wishlist' : 'Inventory';
      const itemCount = mode === 'wishlist' ? wishlistCount : inventoryCount;
      onViewChangeAnnouncement(
        `Switched to ${viewName} view. ${itemCount} ${itemCount === 1 ? 'item' : 'items'}.`
      );
    }
    previousModeRef.current = mode;
  }, [mode, onViewChangeAnnouncement, wishlistCount, inventoryCount]);

  // Handle mode change with announcement callback
  const handleModeChange = useCallback(
    (value: string) => {
      onModeChange(value as InventoryViewMode);
    },
    [onModeChange]
  );

  return (
    <Tabs
      value={mode}
      onValueChange={handleModeChange}
      className="w-auto"
      // T082: Add aria-label for the tab container
      aria-label="View mode toggle"
    >
      {/*
        T082/T083: TabsList from Radix already provides:
        - role="tablist"
        - Keyboard navigation (Arrow Left/Right to switch tabs)
        - Tab key moves focus to/from the tab list
        - Enter/Space activates the focused tab
        - aria-orientation="horizontal" (default)
      */}
      <TabsList
        className="grid w-full grid-cols-2"
        aria-label="Switch between inventory and wishlist views"
      >
        <TabsTrigger
          value="inventory"
          className="gap-2"
          // T082: Descriptive aria-label including item count
          aria-label={`My Gear tab, ${inventoryCount} ${inventoryCount === 1 ? 'item' : 'items'}`}
        >
          <span aria-hidden="true">My Gear</span>
          <span
            className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs font-medium"
            aria-hidden="true"
          >
            {inventoryCount}
          </span>
          {/* Screen reader only: full description */}
          <VisuallyHidden>
            My Gear, {inventoryCount} {inventoryCount === 1 ? 'item' : 'items'}
          </VisuallyHidden>
        </TabsTrigger>
        <TabsTrigger
          value="wishlist"
          className="gap-2"
          // T082: Descriptive aria-label including item count
          aria-label={`Wishlist tab, ${wishlistCount} ${wishlistCount === 1 ? 'item' : 'items'}`}
        >
          <span aria-hidden="true">Wishlist</span>
          <span
            className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs font-medium"
            aria-hidden="true"
          >
            {wishlistCount}
          </span>
          {/* Screen reader only: full description */}
          <VisuallyHidden>
            Wishlist, {wishlistCount} {wishlistCount === 1 ? 'item' : 'items'}
          </VisuallyHidden>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
