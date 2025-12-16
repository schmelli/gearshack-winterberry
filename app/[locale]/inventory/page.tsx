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
 */

'use client';

import { Suspense } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useInventory } from '@/hooks/useInventory';
import { GalleryGrid } from '@/components/inventory-gallery/GalleryGrid';
import { GalleryToolbar } from '@/components/inventory-gallery/GalleryToolbar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { GearDetailModal } from '@/components/gear-detail/GearDetailModal';
import { useGearDetailModal } from '@/hooks/useGearDetailModal';
import { useYouTubeReviews } from '@/hooks/useYouTubeReviews';
import { useGearInsights } from '@/hooks/useGearInsights';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { GearItem } from '@/types/gear';
import type { ViewDensity, SortOption, CategoryGroup } from '@/types/inventory';
import type { User } from '@supabase/supabase-js';
import type { YouTubeVideo } from '@/types/youtube';
import type { GearInsight } from '@/types/geargraph';

// Component that uses useSearchParams - must be wrapped in Suspense
function InventoryWithModal() {
  const t = useTranslations('Inventory');
  const { user } = useSupabaseAuth();
  const {
    filteredItems,
    items,
    viewDensity,
    setViewDensity,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sortOption,
    setSortOption,
    groupedItems,
    hasActiveFilters,
    clearFilters,
    itemCount,
    filteredCount,
    isLoading,
    getCategoryLabel,
    categoriesError,
    refreshCategories,
  } = useInventory();

  // Feature 045: Gear detail modal state (uses useSearchParams internally)
  const { isOpen, gearId, open, close, isMobile } = useGearDetailModal();

  // Find the selected item for the modal
  const selectedItem = gearId ? items.find((item) => item.id === gearId) ?? null : null;

  // Feature 045: YouTube reviews for selected item
  const {
    videos: youtubeVideos,
    isLoading: youtubeLoading,
    error: youtubeError,
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
    categoryId: selectedItem?.categoryId,
    brand: selectedItem?.brand,
    name: selectedItem?.name,
    enabled: isOpen && !!selectedItem,
  });

  return <InventoryContent
    t={t}
    user={user}
    filteredItems={filteredItems}
    items={items}
    viewDensity={viewDensity}
    setViewDensity={setViewDensity}
    searchQuery={searchQuery}
    setSearchQuery={setSearchQuery}
    categoryFilter={categoryFilter}
    setCategoryFilter={setCategoryFilter}
    sortOption={sortOption}
    setSortOption={setSortOption}
    groupedItems={groupedItems}
    hasActiveFilters={hasActiveFilters}
    clearFilters={clearFilters}
    itemCount={itemCount}
    filteredCount={filteredCount}
    isLoading={isLoading}
    getCategoryLabel={getCategoryLabel}
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
    retryYouTube={retryYouTube}
    insights={insights}
    insightsLoading={insightsLoading}
    insightsError={insightsError}
    dismissInsight={dismissInsight}
  />;
}

/**
 * Props for InventoryContent component
 * Separated to avoid prop-drilling through Suspense boundary
 */
interface InventoryContentProps {
  t: ReturnType<typeof useTranslations<'Inventory'>>;
  user: User | null;
  filteredItems: GearItem[];
  items: GearItem[];
  viewDensity: ViewDensity;
  setViewDensity: (density: ViewDensity) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string | null;
  setCategoryFilter: (categoryId: string | null) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  groupedItems: CategoryGroup[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
  itemCount: number;
  filteredCount: number;
  isLoading: boolean;
  getCategoryLabel: (categoryId: string | null) => string;
  categoriesError: string | null;
  refreshCategories: () => Promise<void>;
  isOpen: boolean;
  gearId: string | null;
  open: (id: string) => void;
  close: () => void;
  isMobile: boolean;
  selectedItem: GearItem | null;
  youtubeVideos: YouTubeVideo[];
  youtubeLoading: boolean;
  youtubeError: string | null;
  retryYouTube: () => void;
  insights: GearInsight[];
  insightsLoading: boolean;
  insightsError: string | null;
  dismissInsight: (content: string) => void;
}

function InventoryContent({
  t,
  user,
  filteredItems,
  items,
  viewDensity,
  setViewDensity,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  sortOption,
  setSortOption,
  groupedItems,
  hasActiveFilters,
  clearFilters,
  itemCount,
  filteredCount,
  isLoading,
  getCategoryLabel,
  categoriesError,
  refreshCategories,
  isOpen,
  gearId,
  open,
  close,
  isMobile,
  selectedItem,
  youtubeVideos,
  youtubeLoading,
  youtubeError,
  retryYouTube,
  insights,
  insightsLoading,
  insightsError,
  dismissInsight,
}: InventoryContentProps) {
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
      {/* Add Gear Button */}
      <div className="mb-8 flex justify-end">
        <Button asChild>
          <Link href="/inventory/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('addItem')}
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
      ) : (
        <>
          {/* Toolbar with Search, Filter, Sort, and View Density */}
          <GalleryToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
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
            getCategoryLabel={getCategoryLabel}
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
        onRetryYouTube={retryYouTube}
        insights={insights}
        insightsLoading={insightsLoading}
        insightsError={insightsError}
        userId={user?.id}
        onInsightDismissed={(insight) => dismissInsight(insight.content)}
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
