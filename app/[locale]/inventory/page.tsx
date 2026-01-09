/**
 * Inventory Gallery Page
 *
 * Feature: 002-inventory-gallery
 * Route: /inventory
 *
 * Visual gallery view for browsing the gear collection
 *
 * Feature: 008-auth-and-profile
 * T045: Protected route - requires authentication
 *
 * Feature: 028-landing-page-i18n
 * T028-T029: Use translations for inventory UI (FR-010)
 *
 * Feature: 045-gear-detail-modal
 * T019-T020: Add gear detail modal with URL deep linking
 *
 * Feature: 049-wishlist-view
 * T082-T084: Accessibility improvements - ARIA labels, keyboard nav, screen reader announcements
 */

'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { Plus, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useScreenContext } from '@/components/context/ScreenContextProvider';
import { Link } from '@/i18n/navigation';
import { useInventory } from '@/hooks/useInventory';
import { useWishlist } from '@/hooks/useWishlist';
import { useInventoryView } from '@/hooks/useInventoryView';
import { GalleryGrid } from '@/components/inventory-gallery/GalleryGrid';
import { GalleryToolbar } from '@/components/inventory-gallery/GalleryToolbar';
import { WishlistToggle } from '@/components/wishlist/WishlistToggle';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { GearDetailModal } from '@/components/gear-detail/GearDetailModal';
import { useGearDetailModal } from '@/hooks/useGearDetailModal';
import { useYouTubeReviews } from '@/hooks/useYouTubeReviews';
import { useGearInsights } from '@/hooks/useGearInsights';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Announcement } from '@/components/ui/visually-hidden';
import type { GearItem } from '@/types/gear';
import type { ViewDensity, SortOption, CategoryGroup } from '@/types/inventory';
import type { CategoryOption } from '@/types/category';
import type { User } from '@supabase/supabase-js';
import type { YouTubeVideo } from '@/types/youtube';
import type { GearInsight } from '@/types/geargraph';
import type { WishlistSortOption } from '@/types/wishlist';

// Helper: Convert wishlist sort option to inventory sort option
function toInventorySortOption(option: WishlistSortOption): SortOption {
  if (option === 'name' || option === 'category' || option === 'dateAdded') {
    return option;
  }
  // Default to 'dateAdded' for incompatible options
  return 'dateAdded';
}

// Component that uses useSearchParams - must be wrapped in Suspense
function InventoryWithModal() {
  const t = useTranslations('Inventory');
  const { user } = useSupabaseAuth();
  // Feature 049: View mode state (inventory vs wishlist)
  const { viewMode, setViewMode } = useInventoryView();

  // AI Agent Context-Awareness: Set screen context for AI assistant
  const { setScreen, clearContext } = useScreenContext();

  useEffect(() => {
    // Set screen based on current view mode (inventory or wishlist)
    setScreen(viewMode === 'wishlist' ? 'wishlist' : 'inventory');

    return () => {
      clearContext();
    };
  }, [viewMode, setScreen, clearContext]);

  // Feature 049 T084: Screen reader announcement state
  const [announcement, setAnnouncement] = useState<{
    message: string;
    politeness: 'polite' | 'assertive';
  }>({ message: '', politeness: 'polite' });

  // Feature 049 T084: Announcement callback for components to trigger screen reader announcements
  const handleAnnouncement = useCallback(
    (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
      // Clear first to ensure screen readers announce even if same message
      setAnnouncement({ message: '', politeness });
      // Small delay to ensure the clearing is processed
      requestAnimationFrame(() => {
        setAnnouncement({ message, politeness });
      });
    },
    []
  );

  // Inventory hook
  const {
    filteredItems,
    items,
    viewDensity,
    setViewDensity,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    categoryOptions,
    sortOption,
    setSortOption,
    groupedItems,
    hasActiveFilters,
    clearFilters,
    itemCount,
    filteredCount,
    isLoading,
    categoriesError,
    refreshCategories,
  } = useInventory();

  // Feature 049: Wishlist hook
  const {
    filteredItems: wishlistFilteredItems,
    wishlistItems,
    isLoading: wishlistLoading,
    error: _wishlistError,
    searchQuery: wishlistSearchQuery,
    setSearchQuery: setWishlistSearchQuery,
    categoryFilter: wishlistCategoryFilter,
    setCategoryFilter: setWishlistCategoryFilter,
    sortOption: wishlistSortOption,
    setSortOption: setWishlistSortOption,
    hasActiveFilters: wishlistHasActiveFilters,
    clearFilters: wishlistClearFilters,
    itemCount: wishlistItemCount,
    filteredCount: wishlistFilteredCount,
    moveToInventory,
  } = useWishlist();

  // Feature 049: Determine active hook based on view mode
  const activeFilteredItems = viewMode === 'wishlist' ? wishlistFilteredItems : filteredItems;
  const activeItems = viewMode === 'wishlist' ? wishlistItems : items;
  const activeIsLoading = viewMode === 'wishlist' ? wishlistLoading : isLoading;
  const activeSearchQuery = viewMode === 'wishlist' ? wishlistSearchQuery : searchQuery;
  const activeSetSearchQuery = viewMode === 'wishlist' ? setWishlistSearchQuery : setSearchQuery;
  const activeCategoryFilter = viewMode === 'wishlist' ? wishlistCategoryFilter : categoryFilter;
  const activeSetCategoryFilter = viewMode === 'wishlist' ? setWishlistCategoryFilter : setCategoryFilter;
  const activeSortOption = viewMode === 'wishlist' ? wishlistSortOption : sortOption;
  const activeSetSortOption = viewMode === 'wishlist' ? setWishlistSortOption : setSortOption;
  const activeHasActiveFilters = viewMode === 'wishlist' ? wishlistHasActiveFilters : hasActiveFilters;
  const activeClearFilters = viewMode === 'wishlist' ? wishlistClearFilters : clearFilters;
  const activeItemCount = viewMode === 'wishlist' ? wishlistItemCount : itemCount;
  const activeFilteredCount = viewMode === 'wishlist' ? wishlistFilteredCount : filteredCount;

  // Feature 045: Gear detail modal state (uses useSearchParams internally)
  const { isOpen, gearId, open, close, isMobile } = useGearDetailModal();

  // Find the selected item for the modal - search both inventory and wishlist
  const selectedItem = gearId
    ? items.find((item) => item.id === gearId) ??
      wishlistItems.find((item) => item.id === gearId) ??
      null
    : null;

  // Feature 049 US3: Determine if selected item is from wishlist
  const isSelectedItemFromWishlist = gearId
    ? wishlistItems.some((item) => item.id === gearId)
    : false;

  // Feature 045: YouTube reviews for selected item
  const {
    videos: youtubeVideos,
    isLoading: youtubeLoading,
    error: youtubeError,
    isQuotaExhausted: youtubeQuotaExhausted,
    retry: retryYouTube,
  } = useYouTubeReviews({
    brand: selectedItem?.brand,
    name: selectedItem?.name,
    enabled: isOpen && !!selectedItem,
  });

  // Feature 045: GearGraph insights for selected item
  // Searches for specific product AND broader category context
  const {
    insights,
    isLoading: insightsLoading,
    error: insightsError,
    dismissInsight,
  } = useGearInsights({
    productTypeId: selectedItem?.productTypeId,
    brand: selectedItem?.brand,
    name: selectedItem?.name,
    enabled: isOpen && !!selectedItem,
  });

  return <InventoryContent
    t={t}
    user={user}
    viewMode={viewMode}
    setViewMode={setViewMode}
    inventoryCount={itemCount}
    wishlistCount={wishlistItemCount}
    filteredItems={activeFilteredItems}
    items={activeItems}
    viewDensity={viewDensity}
    setViewDensity={setViewDensity}
    searchQuery={activeSearchQuery}
    setSearchQuery={activeSetSearchQuery}
    categoryFilter={activeCategoryFilter}
    setCategoryFilter={activeSetCategoryFilter}
    categoryOptions={categoryOptions}
    sortOption={viewMode === 'wishlist' ? toInventorySortOption(activeSortOption as WishlistSortOption) : activeSortOption as SortOption}
    setSortOption={activeSetSortOption}
    groupedItems={groupedItems}
    hasActiveFilters={activeHasActiveFilters}
    clearFilters={activeClearFilters}
    itemCount={activeItemCount}
    filteredCount={activeFilteredCount}
    isLoading={activeIsLoading}
    categoriesError={categoriesError}
    refreshCategories={refreshCategories}
    isOpen={isOpen}
    gearId={gearId}
    open={open}
    close={close}
    isMobile={isMobile}
    selectedItem={selectedItem}
    youtubeVideos={youtubeVideos}
    youtubeLoading={youtubeLoading}
    youtubeError={youtubeError}
    youtubeQuotaExhausted={youtubeQuotaExhausted}
    retryYouTube={retryYouTube}
    insights={insights}
    insightsLoading={insightsLoading}
    insightsError={insightsError}
    dismissInsight={dismissInsight}
    moveToInventory={moveToInventory}
    isSelectedItemFromWishlist={isSelectedItemFromWishlist}
    onAnnouncement={handleAnnouncement}
    announcement={announcement}
  />;
}

/**
 * Props for InventoryContent component
 * Separated to avoid prop-drilling through Suspense boundary
 */
interface InventoryContentProps {
  t: ReturnType<typeof useTranslations<'Inventory'>>;
  user: User | null;
  viewMode: 'inventory' | 'wishlist';
  setViewMode: (mode: 'inventory' | 'wishlist') => void;
  inventoryCount: number;
  wishlistCount: number;
  filteredItems: GearItem[];
  items: GearItem[];
  viewDensity: ViewDensity;
  setViewDensity: (density: ViewDensity) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string | null;
  setCategoryFilter: (categoryId: string | null) => void;
  categoryOptions: CategoryOption[];
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  groupedItems: CategoryGroup[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
  itemCount: number;
  filteredCount: number;
  isLoading: boolean;
  categoriesError: string | null;
  refreshCategories: () => Promise<void>;
  isOpen: boolean;
  gearId: string | null;
  open: (id: string) => void;
  close: () => void;
  isMobile: boolean;
  selectedItem: GearItem | null;
  youtubeVideos: YouTubeVideo[] | null;
  youtubeLoading: boolean;
  youtubeError: string | null;
  youtubeQuotaExhausted: boolean;
  retryYouTube: () => void;
  insights: GearInsight[] | null;
  insightsLoading: boolean;
  insightsError: string | null;
  dismissInsight: (content: string) => void;
  /** Feature 049 US3: Move wishlist item to inventory */
  moveToInventory: (itemId: string) => Promise<void>;
  /** Feature 049 US3: Whether the selected item in the modal is from wishlist */
  isSelectedItemFromWishlist: boolean;
  /** Feature 049 T084: Screen reader announcement callback */
  onAnnouncement: (message: string, politeness?: 'polite' | 'assertive') => void;
  /** Feature 049 T084: Current announcement message for aria-live region */
  announcement: { message: string; politeness: 'polite' | 'assertive' };
}

function InventoryContent({
  t,
  user,
  viewMode,
  setViewMode,
  inventoryCount,
  wishlistCount,
  filteredItems,
  items: _items,
  viewDensity,
  setViewDensity,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  categoryOptions,
  sortOption,
  setSortOption,
  groupedItems,
  hasActiveFilters,
  clearFilters,
  itemCount,
  filteredCount,
  isLoading,
  categoriesError,
  refreshCategories,
  isOpen,
  gearId: _gearId,
  open,
  close,
  isMobile,
  selectedItem,
  youtubeVideos,
  youtubeLoading,
  youtubeError,
  youtubeQuotaExhausted,
  retryYouTube,
  insights,
  insightsLoading,
  insightsError,
  dismissInsight,
  moveToInventory,
  isSelectedItemFromWishlist,
  onAnnouncement,
  announcement,
}: InventoryContentProps) {
  // Feature 049 T084: Handler for view change announcements
  const handleViewChangeAnnouncement = useCallback(
    (message: string) => {
      onAnnouncement(message, 'polite');
    },
    [onAnnouncement]
  );

  // Note: Move-to-inventory announcements are handled by Sonner toasts,
  // which are already accessible and announced by screen readers.

  // Loading state
  if (isLoading) {
    return (
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      {/* Feature 049 T084: Screen reader live regions for announcements */}
      <Announcement
        message={announcement.message}
        politeness={announcement.politeness}
      />

      {/* Feature 049: View Toggle and Add Button */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <WishlistToggle
          mode={viewMode}
          onModeChange={setViewMode}
          inventoryCount={inventoryCount}
          wishlistCount={wishlistCount}
          onViewChangeAnnouncement={handleViewChangeAnnouncement}
        />
        <Button asChild size="sm" className="shrink-0">
          <Link href={viewMode === 'wishlist' ? '/inventory/new?mode=wishlist' : '/inventory/new'}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {viewMode === 'wishlist' ? t('addToWishlist') : t('addItem')}
            </span>
          </Link>
        </Button>
      </div>

      {/* Categories Error Warning */}
      {categoriesError && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
              <strong>{t('categoriesError.warning')}:</strong> {t('categoriesError.message')}
            </p>
            <button
              onClick={() => refreshCategories()}
              className="text-sm font-medium text-amber-900 hover:text-amber-700 dark:text-amber-100 dark:hover:text-amber-300 underline underline-offset-2 whitespace-nowrap"
            >
              {t('categoriesError.retry')}
            </button>
          </div>
        </div>
      )}

      {/* Empty State - No items at all */}
      {itemCount === 0 ? (
        viewMode === 'wishlist' ? (
          /* T072: Empty Wishlist State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">{t('wishlist.emptyTitle')}</p>
            <p className="mt-1 text-muted-foreground">
              {t('wishlist.emptySubtext')}
            </p>
            <Button asChild className="mt-6">
              <Link href="/inventory/new?mode=wishlist">
                <Plus className="mr-2 h-4 w-4" />
                {t('addToWishlist')}
              </Link>
            </Button>
          </div>
        ) : (
          /* Existing inventory empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium">{t('emptyTitle')}</p>
            <p className="mt-1 text-muted-foreground">
              {t('emptyDescription')}
            </p>
            <Button asChild className="mt-6">
              <Link href="/inventory/new">
                <Plus className="mr-2 h-4 w-4" />
                {t('addFirstItem')}
              </Link>
            </Button>
          </div>
        )
      ) : (
        <>
          {/* Toolbar with Search, Filter, Sort, and View Density */}
          <GalleryToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            categoryOptions={categoryOptions}
            sortOption={sortOption}
            onSortChange={setSortOption}
            viewDensity={viewDensity}
            onViewDensityChange={setViewDensity}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            itemCount={itemCount}
            filteredCount={filteredCount}
            translations={{
              searchPlaceholder: t('searchPlaceholder'),
              filterAll: t('filterAll'),
              clearFilters: t('clearFilters'),
              showingItems: t('showingItems', { filtered: filteredCount, total: itemCount }),
              itemsCount: t('itemCount', { count: itemCount }),
              sortBy: t('sortBy'),
              sortOptions: {
                name: t('sortOptions.name'),
                category: t('sortOptions.category'),
                dateAdded: t('sortOptions.dateAdded'),
              },
            }}
          />

          {/* Gallery Grid */}
          <GalleryGrid
            items={filteredItems}
            groupedItems={groupedItems}
            sortOption={sortOption}
            viewDensity={viewDensity}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            onItemClick={open}
            getItemCountLabel={(count) => t('itemCount', { count })}
            context={viewMode}
            onMoveToInventory={viewMode === 'wishlist' ? moveToInventory : undefined}
            onMoveComplete={viewMode === 'wishlist' ? () => setViewMode('inventory') : undefined}
            /* T073: Wishlist-specific empty state translations */
            emptyStateTranslations={viewMode === 'wishlist' ? {
              noResults: t('wishlist.noResultsTitle'),
              noResultsSubtext: t('wishlist.noResultsSubtext'),
              clearFilters: t('clearFilters'),
            } : undefined}
          />
        </>
      )}

      {/* Feature 045: Gear Detail Modal */}
      <GearDetailModal
        open={isOpen}
        onOpenChange={(open) => !open && close()}
        item={selectedItem}
        isMobile={isMobile}
        youtubeVideos={youtubeVideos}
        youtubeLoading={youtubeLoading}
        youtubeError={youtubeError}
        youtubeQuotaExhausted={youtubeQuotaExhausted}
        onRetryYouTube={retryYouTube}
        insights={insights}
        insightsLoading={insightsLoading}
        insightsError={insightsError}
        userId={user?.id}
        onInsightDismissed={(insight) => dismissInsight(insight.content)}
        isWishlistItem={isSelectedItemFromWishlist}
        onMoveToInventory={isSelectedItemFromWishlist ? moveToInventory : undefined}
        onMoveComplete={isSelectedItemFromWishlist ? () => setViewMode('inventory') : undefined}
      />
    </main>
  );
}

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="container mx-auto max-w-6xl px-4 py-8"><div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></div>}>
        <InventoryWithModal />
      </Suspense>
    </ProtectedRoute>
  );
}
