/**
 * GalleryToolbar Component
 *
 * Feature: 002-inventory-gallery
 * Contains search, category filter, view density toggle, and item count
 *
 * Feature: 028-landing-page-i18n
 * T029: Support translations via props (FR-010)
 */

import { Search, X } from 'lucide-react';
import type { ViewDensity } from '@/types/inventory';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ViewDensityToggle } from './ViewDensityToggle';
import { getCategories } from '@/lib/taxonomy/taxonomy-utils';

// =============================================================================
// Types
// =============================================================================

interface GalleryToolbarTranslations {
  searchPlaceholder: string;
  filterAll: string;
  clearFilters: string;
  showingItems: string;
  itemsCount: string;
}

const DEFAULT_TRANSLATIONS: GalleryToolbarTranslations = {
  searchPlaceholder: 'Search gear...',
  filterAll: 'All Categories',
  clearFilters: 'Clear filters',
  showingItems: 'Showing {filtered} of {total} items',
  itemsCount: '{count} items',
};

interface GalleryToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Category Filter
  categoryFilter: string | null;
  onCategoryChange: (categoryId: string | null) => void;

  // View Density
  viewDensity: ViewDensity;
  onViewDensityChange: (density: ViewDensity) => void;

  // Clear
  hasActiveFilters: boolean;
  onClearFilters: () => void;

  // Stats
  itemCount: number;
  filteredCount: number;

  // Translations (Feature 028)
  translations?: Partial<GalleryToolbarTranslations>;
}

// =============================================================================
// Component
// =============================================================================

export function GalleryToolbar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  viewDensity,
  onViewDensityChange,
  hasActiveFilters,
  onClearFilters,
  itemCount,
  filteredCount,
  translations: translationsProp,
}: GalleryToolbarProps) {
  const categories = getCategories();
  const showingFiltered = hasActiveFilters && filteredCount !== itemCount;
  const t = { ...DEFAULT_TRANSLATIONS, ...translationsProp };

  return (
    <div className="mb-6 space-y-4">
      {/* Main toolbar row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: Search and Category filter */}
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
              aria-label={t.searchPlaceholder}
            />
          </div>

          {/* Category Filter */}
          <Select
            value={categoryFilter ?? 'all'}
            onValueChange={(value) =>
              onCategoryChange(value === 'all' ? null : value)
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]" aria-label={t.filterAll}>
              <SelectValue placeholder={t.filterAll} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.filterAll}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="w-full sm:w-auto"
            >
              <X className="mr-1 h-4 w-4" />
              {t.clearFilters}
            </Button>
          )}
        </div>

        {/* Right side: View Density Toggle */}
        <div className="hidden sm:block">
          <ViewDensityToggle
            value={viewDensity}
            onChange={onViewDensityChange}
          />
        </div>
      </div>

      {/* Mobile View Density Toggle */}
      <div className="sm:hidden">
        <ViewDensityToggle
          value={viewDensity}
          onChange={onViewDensityChange}
          className="w-full justify-center"
        />
      </div>

      {/* Item count display */}
      <div className="text-sm text-muted-foreground">
        {showingFiltered ? (
          <span>{t.showingItems}</span>
        ) : (
          <span>{t.itemsCount}</span>
        )}
      </div>
    </div>
  );
}
