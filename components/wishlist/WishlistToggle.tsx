/**
 * WishlistToggle Component
 *
 * Feature: 049-wishlist-view
 * Task: T024
 *
 * Tab control to switch between Inventory and Wishlist views.
 * Uses shadcn/ui Tabs component for consistency with design system.
 */

'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
}

// =============================================================================
// Component
// =============================================================================

export function WishlistToggle({
  mode,
  onModeChange,
  inventoryCount,
  wishlistCount,
}: WishlistToggleProps) {
  return (
    <Tabs
      value={mode}
      onValueChange={(value) => onModeChange(value as InventoryViewMode)}
      className="w-auto"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="inventory" className="gap-2">
          <span>My Gear</span>
          <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs font-medium">
            {inventoryCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="wishlist" className="gap-2">
          <span>Wishlist</span>
          <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs font-medium">
            {wishlistCount}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
