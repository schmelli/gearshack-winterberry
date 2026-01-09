/**
 * MerchantLoadoutGrid Component
 *
 * Feature: 053-merchant-integration
 * Task: T024
 *
 * Responsive grid layout for merchant loadouts with filtering and sorting.
 */

'use client';

import { memo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Filter, X, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { MerchantLoadoutCard, MerchantLoadoutCardSkeleton } from './MerchantLoadoutCard';
import type {
  MerchantLoadoutCard as LoadoutCardType,
  MerchantLoadoutFilters,
  MerchantLoadoutSort,
} from '@/types/merchant-loadout';

// =============================================================================
// Types
// =============================================================================

export interface MerchantLoadoutGridProps {
  loadouts: LoadoutCardType[];
  isLoading: boolean;
  error: string | null;
  filters: MerchantLoadoutFilters;
  sort: MerchantLoadoutSort;
  onFiltersChange: (filters: Partial<MerchantLoadoutFilters>) => void;
  onClearFilters: () => void;
  onSortChange: (sort: MerchantLoadoutSort) => void;
  /** Total count for results summary */
  totalCount?: number;
  /** Show distance to nearest location */
  showDistance?: boolean;
  /** Grid columns */
  columns?: 2 | 3 | 4;
  className?: string;
}

// =============================================================================
// Filter Options
// =============================================================================

const TRIP_TYPE_OPTIONS = [
  { value: 'day_hike', label: 'Day Hike' },
  { value: 'backpacking', label: 'Backpacking' },
  { value: 'thru_hike', label: 'Thru-Hike' },
  { value: 'ultralight', label: 'Ultralight' },
  { value: 'winter', label: 'Winter Camping' },
  { value: 'bikepacking', label: 'Bikepacking' },
  { value: 'kayaking', label: 'Kayaking' },
];

const SEASON_OPTIONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
  { value: '3-season', label: '3-Season' },
  { value: '4-season', label: '4-Season' },
];

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'bundlePrice-asc', label: 'Price: Low to High' },
  { value: 'bundlePrice-desc', label: 'Price: High to Low' },
  { value: 'viewCount-desc', label: 'Most Popular' },
  { value: 'name-asc', label: 'Name: A-Z' },
];

// =============================================================================
// Helper Components
// =============================================================================

function FilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
}: {
  filters: MerchantLoadoutFilters;
  onFiltersChange: (filters: Partial<MerchantLoadoutFilters>) => void;
  onClearFilters: () => void;
}) {
  const t = useTranslations('MerchantLoadouts.filters');

  const activeFilterCount = [
    filters.tripType,
    filters.season,
    filters.minPrice,
    filters.maxPrice,
    filters.featured,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Trip Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t('tripType')}</Label>
        <Select
          value={filters.tripType ?? ''}
          onValueChange={(value) =>
            onFiltersChange({ tripType: value || undefined })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All trip types" />
          </SelectTrigger>
          <SelectContent>
            {TRIP_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Season */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Season</Label>
        <Select
          value={filters.season ?? ''}
          onValueChange={(value) =>
            onFiltersChange({ season: value || undefined })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All seasons" />
          </SelectTrigger>
          <SelectContent>
            {SEASON_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t('priceRange')}</Label>
        <div className="px-2">
          <Slider
            min={0}
            max={2000}
            step={50}
            value={[filters.minPrice ?? 0, filters.maxPrice ?? 2000]}
            onValueChange={([min, max]) =>
              onFiltersChange({
                minPrice: min > 0 ? min : undefined,
                maxPrice: max < 2000 ? max : undefined,
              })
            }
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>€{filters.minPrice ?? 0}</span>
            <span>€{filters.maxPrice ?? '2000+'}</span>
          </div>
        </div>
      </div>

      {/* Featured Only */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="featured"
          checked={filters.featured ?? false}
          onCheckedChange={(checked) =>
            onFiltersChange({ featured: checked ? true : undefined })
          }
        />
        <Label htmlFor="featured" className="text-sm">
          {t('featured')}
        </Label>
      </div>

      <Separator />

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={onClearFilters}
        >
          <X className="mr-2 h-4 w-4" />
          {t('clearAll')} ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}

function EmptyState() {
  const t = useTranslations('MerchantLoadouts');

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium">{t('noResults')}</h3>
      <p className="text-sm text-muted-foreground mt-1">{t('noResultsHint')}</p>
    </div>
  );
}

function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <MerchantLoadoutCardSkeleton key={i} />
      ))}
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export const MerchantLoadoutGrid = memo(function MerchantLoadoutGrid({
  loadouts,
  isLoading,
  error,
  filters,
  sort,
  onFiltersChange,
  onClearFilters,
  onSortChange,
  totalCount,
  showDistance = false,
  columns = 3,
  className,
}: MerchantLoadoutGridProps) {
  const _t = useTranslations('MerchantLoadouts');

  // Count active filters
  const activeFilterCount = [
    filters.tripType,
    filters.season,
    filters.minPrice,
    filters.maxPrice,
    filters.featured,
  ].filter(Boolean).length;

  // Handle sort change
  const handleSortChange = useCallback(
    (value: string) => {
      const [field, direction] = value.split('-') as [
        MerchantLoadoutSort['field'],
        MerchantLoadoutSort['direction']
      ];
      onSortChange({ field, direction });
    },
    [onSortChange]
  );

  // Grid columns class
  const gridClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[columns];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile Filter Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterPanel
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                  onClearFilters={onClearFilters}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Results count */}
          {totalCount !== undefined && !isLoading && (
            <span className="text-sm text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'loadout' : 'loadouts'}
            </span>
          )}
        </div>

        {/* Sort Select */}
        <Select
          value={`${sort.field}-${sort.direction}`}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-4">
            <h3 className="font-medium mb-4">Filters</h3>
            <FilterPanel
              filters={filters}
              onFiltersChange={onFiltersChange}
              onClearFilters={onClearFilters}
            />
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error}
            </div>
          ) : (
            <div className={cn('grid gap-6', gridClass)}>
              {isLoading ? (
                <LoadingGrid count={6} />
              ) : loadouts.length === 0 ? (
                <EmptyState />
              ) : (
                loadouts.map((loadout) => (
                  <MerchantLoadoutCard
                    key={loadout.id}
                    loadout={loadout}
                    showDistance={showDistance}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default MerchantLoadoutGrid;
