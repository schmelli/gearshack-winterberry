/**
 * InventoryContent Component
 *
 * Feature: 002-inventory-gallery, 045-gear-detail-modal, 049-wishlist-view, 054-zero-friction-input
 *
 * Core inventory/wishlist view content with toolbar, grid, and modal.
 * Extracted from page.tsx for better separation of concerns.
 */

'use client';

import { useState, useCallback } from 'react';
import { Plus, Heart, Link2, Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { GalleryGrid } from '@/components/inventory-gallery/GalleryGrid';
import { GalleryToolbar } from '@/components/inventory-gallery/GalleryToolbar';
import { WishlistToggle } from '@/components/wishlist/WishlistToggle';
import { GearDetailModal } from '@/components/gear-detail/GearDetailModal';
import { UrlImportDialog } from '@/components/gear-editor/UrlImportDialog';
import { VisionScanDialog } from '@/components/vision-scan/VisionScanDialog';
import { QuickAddInput } from '@/components/quick-add/QuickAddInput';
import { QuickAddSheet } from '@/components/quick-add/QuickAddSheet';
import { Announcement } from '@/components/ui/visually-hidden';
import type { GearItem } from '@/types/gear';
import type { ViewDensity, SortOption, CategoryGroup } from '@/types/inventory';
import type { CategoryOption } from '@/types/category';
import type { User } from '@supabase/supabase-js';
import type { YouTubeVideo } from '@/types/youtube';
import type { GearInsight } from '@/types/geargraph';
import type { UseQuickAddReturn } from '@/hooks/useQuickAdd';

// =============================================================================
// Types
// =============================================================================

export interface InventoryContentProps {
  user: User | null;
  viewMode: 'inventory' | 'wishlist';
  setViewMode: (mode: 'inventory' | 'wishlist') => void;
  inventoryCount: number;
  wishlistCount: number;
  filteredItems: GearItem[];
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
  // Modal props
  isOpen: boolean;
  open: (id: string) => void;
  close: () => void;
  isMobile: boolean;
  selectedItem: GearItem | null;
  // YouTube props
  youtubeVideos: YouTubeVideo[] | null;
  youtubeLoading: boolean;
  youtubeError: string | null;
  youtubeQuotaExhausted: boolean;
  retryYouTube: () => void;
  // Insights props
  insights: GearInsight[] | null;
  insightsLoading: boolean;
  insightsError: string | null;
  dismissInsight: (content: string) => void;
  // Wishlist props
  moveToInventory: (itemId: string) => Promise<void>;
  isSelectedItemFromWishlist: boolean;
  // Accessibility props
  onAnnouncement: (message: string, politeness?: 'polite' | 'assertive') => void;
  announcement: { message: string; politeness: 'polite' | 'assertive' };
  // Quick Add props (054-zero-friction-input)
  quickAdd: UseQuickAddReturn;
}

// =============================================================================
// Component
// =============================================================================

export function InventoryContent({
  user,
  viewMode,
  setViewMode,
  inventoryCount,
  wishlistCount,
  filteredItems,
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
  quickAdd,
}: InventoryContentProps) {
  const t = useTranslations('Inventory');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [visionScanOpen, setVisionScanOpen] = useState(false);

  // Handler for view change announcements
  const handleViewChangeAnnouncement = useCallback(
    (message: string) => {
      onAnnouncement(message, 'polite');
    },
    [onAnnouncement]
  );

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
      {/* Screen reader live regions */}
      <Announcement
        message={announcement.message}
        politeness={announcement.politeness}
      />

      {/* View Toggle and Add Button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <WishlistToggle
          mode={viewMode}
          onModeChange={setViewMode}
          inventoryCount={inventoryCount}
          wishlistCount={wishlistCount}
          onViewChangeAnnouncement={handleViewChangeAnnouncement}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setVisionScanOpen(true)}
          >
            <Camera className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('visionScan')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setImportDialogOpen(true)}
          >
            <Link2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('import')}</span>
          </Button>
          <Button asChild size="sm" className="shrink-0">
            <Link href={viewMode === 'wishlist' ? '/inventory/new?mode=wishlist' : '/inventory/new'}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {viewMode === 'wishlist' ? t('addToWishlist') : t('addItem')}
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Add Input (054-zero-friction-input) */}
      <div className="mb-8 relative">
        <QuickAddInput
          status={quickAdd.status}
          error={quickAdd.error}
          onSubmitText={quickAdd.processInput}
          onSubmitImage={quickAdd.processImage}
          onReset={quickAdd.reset}
        />
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

      {/* Empty State or Content */}
      {itemCount === 0 ? (
        <EmptyState viewMode={viewMode} />
      ) : (
        <>
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
                brand: t('sortOptions.brand'),
                productType: t('sortOptions.productType'),
                dateAdded: t('sortOptions.dateAdded'),
              },
            }}
          />

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
            emptyStateTranslations={viewMode === 'wishlist' ? {
              noResults: t('wishlist.noResultsTitle'),
              noResultsSubtext: t('wishlist.noResultsSubtext'),
              clearFilters: t('clearFilters'),
            } : undefined}
          />
        </>
      )}

      {/* Gear Detail Modal */}
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

      {/* URL Import Dialog */}
      <UrlImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        mode={viewMode}
      />

      {/* Vision Scan Dialog */}
      <VisionScanDialog
        open={visionScanOpen}
        onOpenChange={setVisionScanOpen}
        destination={viewMode === 'wishlist' ? 'wishlist' : 'inventory'}
      />

      {/* Quick Add Review Sheet (054-zero-friction-input) */}
      <QuickAddSheet
        extraction={quickAdd.status === 'reviewing' ? quickAdd.extraction : null}
        onSave={quickAdd.confirmSave}
        onDismiss={quickAdd.dismiss}
        isSaving={quickAdd.status === 'saving'}
      />
    </main>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface EmptyStateProps {
  viewMode: 'inventory' | 'wishlist';
}

function EmptyState({ viewMode }: EmptyStateProps) {
  const t = useTranslations('Inventory');

  if (viewMode === 'wishlist') {
    return (
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
    );
  }

  return (
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
  );
}
