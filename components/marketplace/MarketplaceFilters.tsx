/**
 * Marketplace Filter Controls
 *
 * Feature: 056-community-hub-enhancements
 * Task: T019
 *
 * Filter bar with type filter buttons, sort dropdown, and search input.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  ListingTypeFilter,
  MarketplaceSortField,
  MarketplaceSortOrder,
} from '@/types/marketplace';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface MarketplaceFiltersProps {
  type: ListingTypeFilter;
  sortBy: MarketplaceSortField;
  sortOrder: MarketplaceSortOrder;
  search?: string;
  onTypeChange: (type: ListingTypeFilter) => void;
  onSortByChange: (sortBy: MarketplaceSortField) => void;
  onSortOrderChange: (sortOrder: MarketplaceSortOrder) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_OPTIONS: ListingTypeFilter[] = [
  'all',
  'for_sale',
  'for_trade',
  'for_borrow',
];

const SORT_OPTIONS: MarketplaceSortField[] = ['date', 'price', 'name'];

// ============================================================================
// Component
// ============================================================================

export function MarketplaceFilters({
  type,
  sortBy,
  sortOrder,
  search = '',
  onTypeChange,
  onSortByChange,
  onSortOrderChange,
  onSearchChange,
  onClearFilters,
  hasActiveFilters,
}: MarketplaceFiltersProps) {
  const t = useTranslations('Marketplace');

  return (
    <div className="space-y-4">
      {/* Type filter buttons */}
      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((option) => (
          <Button
            key={option}
            variant={type === option ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTypeChange(option)}
            className={cn(
              'transition-colors',
              type === option && 'bg-primary text-primary-foreground'
            )}
          >
            {t(`filters.${option === 'all' ? 'all' : option.replace('for_', 'for')}`)}
          </Button>
        ))}
      </div>

      {/* Search and sort row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('search.placeholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>

        {/* Sort dropdown and clear button */}
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                {t('sort.label')}: {t(`sort.${sortBy}`)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => onSortByChange(option)}
                  className={cn(sortBy === option && 'bg-accent')}
                >
                  {t(`sort.${option}`)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')
                }
              >
                {sortOrder === 'asc' ? t('sort.desc') : t('sort.asc')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
