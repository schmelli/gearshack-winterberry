/**
 * ShakedownGearToolbar Component
 *
 * Feature: Shakedown Detail Enhancement
 *
 * Provides search, filter, and sort controls for gear items in a shakedown.
 * Collapsible on mobile for better UX.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from 'lucide-react';

import type { GearSortOption, GearStatusFilter } from '@/hooks/shakedowns/useShakedownGearFilters';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// =============================================================================
// Types
// =============================================================================

interface ShakedownGearToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Category filter
  categoryFilter: string | null;
  onCategoryChange: (category: string | null) => void;
  availableCategories: string[];

  // Status filter
  statusFilter: GearStatusFilter;
  onStatusChange: (status: GearStatusFilter) => void;

  // Sort
  sortOption: GearSortOption;
  onSortChange: (option: GearSortOption) => void;

  // Counts
  totalCount: number;
  filteredCount: number;

  // State
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function ShakedownGearToolbar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  availableCategories,
  statusFilter,
  onStatusChange,
  sortOption,
  onSortChange,
  totalCount,
  filteredCount,
  hasActiveFilters,
  onClearFilters,
}: ShakedownGearToolbarProps): React.ReactElement {
  const t = useTranslations('Shakedowns.gearToolbar');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const showingFiltered = filteredCount !== totalCount;

  return (
    <div className="space-y-3">
      {/* Search Bar - Always visible */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 size-7 -translate-y-1/2 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="size-4" />
              <span className="sr-only">{t('clearSearch')}</span>
            </Button>
          )}
        </div>

        {/* Mobile: Toggle Filters Button */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="md:hidden">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="icon" className="relative shrink-0">
              <SlidersHorizontal className="size-4" />
              {hasActiveFilters && (
                <span className="absolute -right-1 -top-1 size-2 rounded-full bg-primary" />
              )}
              <span className="sr-only">{t('toggleFilters')}</span>
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Desktop: Inline Filters */}
        <div className="hidden md:flex items-center gap-2">
          <CategorySelect
            value={categoryFilter}
            onChange={onCategoryChange}
            categories={availableCategories}
            placeholder={t('allCategories')}
          />
          <StatusSelect
            value={statusFilter}
            onChange={onStatusChange}
          />
          <SortSelect
            value={sortOption}
            onChange={onSortChange}
          />
        </div>
      </div>

      {/* Mobile: Collapsible Filters Panel */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="md:hidden">
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <CategorySelect
              value={categoryFilter}
              onChange={onCategoryChange}
              categories={availableCategories}
              placeholder={t('allCategories')}
              className="w-full"
            />
            <StatusSelect
              value={statusFilter}
              onChange={onStatusChange}
              className="w-full"
            />
          </div>
          <SortSelect
            value={sortOption}
            onChange={onSortChange}
            className="w-full"
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Results count and clear filters */}
      {(showingFiltered || hasActiveFilters) && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {showingFiltered
              ? t('showingFiltered', { filtered: filteredCount, total: totalCount })
              : t('showingAll', { count: totalCount })}
          </span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-auto py-1 px-2 text-xs"
            >
              <X className="size-3 mr-1" />
              {t('clearAll')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

interface CategorySelectProps {
  value: string | null;
  onChange: (category: string | null) => void;
  categories: string[];
  placeholder: string;
  className?: string;
}

function CategorySelect({
  value,
  onChange,
  categories,
  placeholder,
  className,
}: CategorySelectProps): React.ReactElement {
  const t = useTranslations('Shakedowns.gearToolbar');

  return (
    <Select
      value={value || 'all'}
      onValueChange={(val) => onChange(val === 'all' ? null : val)}
    >
      <SelectTrigger className={cn('w-[140px]', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('allCategories')}</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat} value={cat}>
            {cat}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface StatusSelectProps {
  value: GearStatusFilter;
  onChange: (status: GearStatusFilter) => void;
  className?: string;
}

function StatusSelect({ value, onChange, className }: StatusSelectProps): React.ReactElement {
  const t = useTranslations('Shakedowns.gearToolbar');

  return (
    <Select value={value} onValueChange={(val) => onChange(val as GearStatusFilter)}>
      <SelectTrigger className={cn('w-[130px]', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('statusAll')}</SelectItem>
        <SelectItem value="worn">{t('statusWorn')}</SelectItem>
        <SelectItem value="consumable">{t('statusConsumable')}</SelectItem>
        <SelectItem value="base">{t('statusBase')}</SelectItem>
      </SelectContent>
    </Select>
  );
}

interface SortSelectProps {
  value: GearSortOption;
  onChange: (option: GearSortOption) => void;
  className?: string;
}

function SortSelect({ value, onChange, className }: SortSelectProps): React.ReactElement {
  const t = useTranslations('Shakedowns.gearToolbar');

  return (
    <Select value={value} onValueChange={(val) => onChange(val as GearSortOption)}>
      <SelectTrigger className={cn('w-[150px]', className)}>
        <ArrowUpDown className="size-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name">{t('sortName')}</SelectItem>
        <SelectItem value="weight-asc">{t('sortWeightAsc')}</SelectItem>
        <SelectItem value="weight-desc">{t('sortWeightDesc')}</SelectItem>
        <SelectItem value="category">{t('sortCategory')}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default ShakedownGearToolbar;
