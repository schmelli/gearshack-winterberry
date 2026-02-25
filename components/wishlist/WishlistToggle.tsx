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
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Wishlist');
  const previousModeRef = useRef<InventoryViewMode>(mode);

  // Track mode changes and trigger announcements
  useEffect(() => {
    if (previousModeRef.current !== mode && onViewChangeAnnouncement) {
      const viewName = mode === 'wishlist' ? t('toggle.wishlist') : t('toggle.myGear');
      const itemCount = mode === 'wishlist' ? wishlistCount : inventoryCount;
      onViewChangeAnnouncement(
        t('toggle.switchedToView', { viewName, count: itemCount })
      );
    }
    previousModeRef.current = mode;
  }, [mode, onViewChangeAnnouncement, wishlistCount, inventoryCount, t]);

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
      aria-label={t('toggle.viewModeToggle')}
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
        className="grid grid-cols-2"
        aria-label={t('toggle.switchViewsAriaLabel')}
      >
        <TabsTrigger
          value="inventory"
          className="gap-2"
          // T082: Descriptive aria-label including item count
          aria-label={t('toggle.myGearTabAriaLabel', { count: inventoryCount })}
        >
          <span aria-hidden="true">{t('toggle.myGear')}</span>
          <span
            className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs font-medium"
            aria-hidden="true"
          >
            {inventoryCount}
          </span>
          {/* Screen reader only: full description */}
          <VisuallyHidden>
            {t('toggle.myGearCount', { count: inventoryCount })}
          </VisuallyHidden>
        </TabsTrigger>
        <TabsTrigger
          value="wishlist"
          className="gap-2"
          // T082: Descriptive aria-label including item count
          aria-label={t('toggle.wishlistTabAriaLabel', { count: wishlistCount })}
        >
          <span aria-hidden="true">{t('toggle.wishlist')}</span>
          <span
            className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs font-medium"
            aria-hidden="true"
          >
            {wishlistCount}
          </span>
          {/* Screen reader only: full description */}
          <VisuallyHidden>
            {t('toggle.wishlistCount', { count: wishlistCount })}
          </VisuallyHidden>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
