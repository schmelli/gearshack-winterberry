/**
 * GalleryToolbar Component
 *
 * Feature: 002-inventory-gallery
 * Contains search, category filter, view density toggle, and item count
 *
 * Feature: 028-landing-page-i18n
 * T029: Support translations via props (FR-010)
 *
 * Feature: 046-inventory-sorting
 * Added sort dropdown with options: name, category, dateAdded
 */

import { Search, X, ArrowUpDown } from 'lucide-react';
import type { ViewDensity, SortOption } from '@/types/inventory';
import { SORT_OPTIONS } from '@/types/inventory';
import type { CategoryOption } from '@/types/category';
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

// =============================================================================
// Types
// =============================================================================

interface SortOptionTranslations {
  name: string;
  category: string;
  brand: string;
  productType: string;
  dateAdded: string;
}

interface GalleryToolbarTranslations {
  searchPlaceholder: string;
  filterAll: string;
  clearFilters: string;
  showingItems: string;
  itemsCount: string;
  sortBy: string;
  sortOptions: SortOptionTranslations;
}

const DEFAULT_TRANSLATIONS: GalleryToolbarTranslations = {
  searchPlaceholder: 'Search gear...',
  filterAll: 'All Categories',
  clearFilters: 'Clear filters',
  showingItems: 'Showing {filtered} of {total} items',
  itemsCount: '{count} items',
  sortBy: 'Sort by',
  sortOptions: {
    name: 'Name (A-Z)',
    category: 'Category',
    brand: 'Brand (A-Z)',
    productType: 'Product Type',
    dateAdded: 'Date Added',
  },
};

interface GalleryToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Category Filter
  categoryFilter: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  categoryOptions: CategoryOption[];

  // Sorting (Feature 046)
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;

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
  categoryOptions,
  sortOption,
  onSortChange,
  viewDensity,
  onViewDensityChange,
  hasActiveFilters,
  onClearFilters,
  itemCount,
  filteredCount,
  translations: translationsProp,
}: GalleryToolbarProps) {
  const showingFiltered = hasActiveFilters && filteredCount !== itemCount;
  const t = {
    ...DEFAULT_TRANSLATIONS,
    ...translationsProp,
    sortOptions: {
      ...DEFAULT_TRANSLATIONS.sortOptions,
      ...translationsProp?.sortOptions,
    },
  };

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
              {categoryOptions.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Dropdown (Feature 046) */}
          <Select
            value={sortOption}
            onValueChange={(value) => onSortChange(value as SortOption)}
          >
            <SelectTrigger className="w-full sm:w-[180px]" aria-label={t.sortBy}>
              <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder={t.sortBy} />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t.sortOptions[option]}
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
