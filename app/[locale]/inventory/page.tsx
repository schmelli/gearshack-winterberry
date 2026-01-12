/**
 * Inventory Gallery Page
 *
 * Feature: 002-inventory-gallery
 * Route: /inventory
 *
 * Visual gallery view for browsing the gear collection.
 * Protected route requiring authentication.
 */

'use client';

import { Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useWishlist } from '@/hooks/useWishlist';
import { useInventoryView } from '@/hooks/useInventoryView';
import { useGearDetailModal } from '@/hooks/useGearDetailModal';
import { useYouTubeReviews } from '@/hooks/useYouTubeReviews';
import { useGearInsights } from '@/hooks/useGearInsights';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useScreenContext } from '@/components/context/ScreenContextProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { InventoryContent } from '@/components/inventory-gallery/InventoryContent';
import type { SortOption } from '@/types/inventory';
import type { WishlistSortOption } from '@/types/wishlist';

// =============================================================================
// Helpers
// =============================================================================

function toInventorySortOption(option: WishlistSortOption): SortOption {
  if (option === 'name' || option === 'category' || option === 'dateAdded') {
    return option;
  }
  return 'dateAdded';
}

function toWishlistSortOption(option: SortOption): WishlistSortOption {
  // Only name, category, and dateAdded are supported in wishlist view
  if (option === 'name' || option === 'category' || option === 'dateAdded') {
    return option;
  }
  // Fall back to dateAdded for unsupported options (brand, productType)
  return 'dateAdded';
}

// =============================================================================
// Loading Fallback
// =============================================================================

function LoadingSpinner() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </div>
  );
}

// =============================================================================
// Main Content (uses useSearchParams - must be in Suspense)
// =============================================================================

function InventoryWithModal() {
  const { user } = useSupabaseAuth();
  const { viewMode, setViewMode } = useInventoryView();
  const { setScreen, clearContext } = useScreenContext();

  // Set screen context
  useEffect(() => {
    setScreen(viewMode === 'wishlist' ? 'wishlist' : 'inventory');
    return () => clearContext();
  }, [viewMode, setScreen, clearContext]);

  // Screen reader announcement state
  const [announcement, setAnnouncement] = useState<{
    message: string;
    politeness: 'polite' | 'assertive';
  }>({ message: '', politeness: 'polite' });

  const handleAnnouncement = useCallback(
    (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
      setAnnouncement({ message: '', politeness });
      requestAnimationFrame(() => {
        setAnnouncement({ message, politeness });
      });
    },
    []
  );

  // Inventory hook
  const inventory = useInventory();

  // Wishlist hook
  const wishlist = useWishlist();

  // Determine active state based on view mode
  const isWishlistView = viewMode === 'wishlist';
  const activeFilteredItems = isWishlistView ? wishlist.filteredItems : inventory.filteredItems;
  const activeIsLoading = isWishlistView ? wishlist.isLoading : inventory.isLoading;
  const activeSearchQuery = isWishlistView ? wishlist.searchQuery : inventory.searchQuery;
  const activeSetSearchQuery = isWishlistView ? wishlist.setSearchQuery : inventory.setSearchQuery;
  const activeCategoryFilter = isWishlistView ? wishlist.categoryFilter : inventory.categoryFilter;
  const activeSetCategoryFilter = isWishlistView ? wishlist.setCategoryFilter : inventory.setCategoryFilter;
  const activeSortOption = isWishlistView ? wishlist.sortOption : inventory.sortOption;

  // Wrapper for setSortOption to handle type conversion between SortOption and WishlistSortOption
  const handleSetSortOption = useCallback((option: SortOption) => {
    if (isWishlistView) {
      // Convert SortOption to WishlistSortOption (brand/productType fall back to dateAdded)
      wishlist.setSortOption(toWishlistSortOption(option));
    } else {
      inventory.setSortOption(option);
    }
  }, [isWishlistView, wishlist, inventory]);
  const activeHasActiveFilters = isWishlistView ? wishlist.hasActiveFilters : inventory.hasActiveFilters;
  const activeClearFilters = isWishlistView ? wishlist.clearFilters : inventory.clearFilters;
  const activeItemCount = isWishlistView ? wishlist.itemCount : inventory.itemCount;
  const activeFilteredCount = isWishlistView ? wishlist.filteredCount : inventory.filteredCount;

  // Gear detail modal (uses useSearchParams internally)
  const { isOpen, gearId, open, close, isMobile } = useGearDetailModal();

  // Find selected item - search both inventory and wishlist
  const selectedItem = gearId
    ? inventory.items.find((item) => item.id === gearId) ??
      wishlist.wishlistItems.find((item) => item.id === gearId) ??
      null
    : null;

  const isSelectedItemFromWishlist = gearId
    ? wishlist.wishlistItems.some((item) => item.id === gearId)
    : false;

  // YouTube reviews for selected item
  const youtube = useYouTubeReviews({
    brand: selectedItem?.brand,
    name: selectedItem?.name,
    enabled: isOpen && !!selectedItem,
  });

  // GearGraph insights for selected item
  const insights = useGearInsights({
    productTypeId: selectedItem?.productTypeId,
    brand: selectedItem?.brand,
    name: selectedItem?.name,
    enabled: isOpen && !!selectedItem,
  });

  return (
    <InventoryContent
      user={user}
      viewMode={viewMode}
      setViewMode={setViewMode}
      inventoryCount={inventory.itemCount}
      wishlistCount={wishlist.itemCount}
      filteredItems={activeFilteredItems}
      viewDensity={inventory.viewDensity}
      setViewDensity={inventory.setViewDensity}
      searchQuery={activeSearchQuery}
      setSearchQuery={activeSetSearchQuery}
      categoryFilter={activeCategoryFilter}
      setCategoryFilter={activeSetCategoryFilter}
      categoryOptions={inventory.categoryOptions}
      sortOption={isWishlistView ? toInventorySortOption(activeSortOption as WishlistSortOption) : activeSortOption as SortOption}
      setSortOption={handleSetSortOption}
      groupedItems={inventory.groupedItems}
      hasActiveFilters={activeHasActiveFilters}
      clearFilters={activeClearFilters}
      itemCount={activeItemCount}
      filteredCount={activeFilteredCount}
      isLoading={activeIsLoading}
      categoriesError={inventory.categoriesError}
      refreshCategories={inventory.refreshCategories}
      isOpen={isOpen}
      open={open}
      close={close}
      isMobile={isMobile}
      selectedItem={selectedItem}
      youtubeVideos={youtube.videos}
      youtubeLoading={youtube.isLoading}
      youtubeError={youtube.error}
      youtubeQuotaExhausted={youtube.isQuotaExhausted}
      retryYouTube={youtube.retry}
      insights={insights.insights}
      insightsLoading={insights.isLoading}
      insightsError={insights.error}
      dismissInsight={insights.dismissInsight}
      moveToInventory={wishlist.moveToInventory}
      isSelectedItemFromWishlist={isSelectedItemFromWishlist}
      onAnnouncement={handleAnnouncement}
      announcement={announcement}
    />
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingSpinner />}>
        <InventoryWithModal />
      </Suspense>
    </ProtectedRoute>
  );
}
