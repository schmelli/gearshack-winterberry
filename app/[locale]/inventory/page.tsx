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
 */

'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useInventory } from '@/hooks/useInventory';
import { GalleryGrid } from '@/components/inventory-gallery/GalleryGrid';
import { GalleryToolbar } from '@/components/inventory-gallery/GalleryToolbar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function InventoryContent() {
  const t = useTranslations('Inventory');
  const {
    filteredItems,
    viewDensity,
    setViewDensity,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    hasActiveFilters,
    clearFilters,
    itemCount,
    filteredCount,
    isLoading,
  } = useInventory();

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
          {/* Toolbar with Search, Filter, and View Density */}
          <GalleryToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
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
            }}
          />

          {/* Gallery Grid */}
          <GalleryGrid
            items={filteredItems}
            viewDensity={viewDensity}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        </>
      )}
    </main>
  );
}

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <InventoryContent />
    </ProtectedRoute>
  );
}
