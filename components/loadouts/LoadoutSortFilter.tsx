/**
 * LoadoutSortFilter Component
 *
 * Feature: Loadout Screen UX Improvements
 * Provides shared sort and filter controls for both LoadoutPicker and LoadoutList.
 */

'use client';

import { ArrowUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { getLocalizedLabel } from '@/lib/utils/category-helpers';

// =============================================================================
// Types
// =============================================================================

export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'weight-asc'
  | 'weight-desc'
  | 'category';

export interface LoadoutSortFilterProps {
  /** Current sort option */
  sortBy: SortOption;
  /** Update sort option */
  onSortChange: (sort: SortOption) => void;
  /** Currently selected category filter (null = all) */
  filterCategoryId: string | null;
  /** Update category filter */
  onFilterChange: (categoryId: string | null) => void;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Sort Labels
// =============================================================================

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'weight-asc', label: 'Weight (Lightest)' },
  { value: 'weight-desc', label: 'Weight (Heaviest)' },
  { value: 'category', label: 'Category' },
];

// =============================================================================
// Component
// =============================================================================

export function LoadoutSortFilter({
  sortBy,
  onSortChange,
  filterCategoryId,
  onFilterChange,
  className,
}: LoadoutSortFilterProps) {
  const { categories } = useCategories();

  // Get level 1 categories for filter dropdown
  const level1Categories = categories.filter((c) => c.level === 1);

  // Get current sort label
  const currentSortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? 'Sort';

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">{currentSortLabel}</span>
            <span className="sm:hidden">Sort</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={sortBy}
            onValueChange={(value) => onSortChange(value as SortOption)}
          >
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Category Filter */}
      <Select
        value={filterCategoryId ?? 'all'}
        onValueChange={(value) => onFilterChange(value === 'all' ? null : value)}
      >
        <SelectTrigger className="h-8 w-[140px]">
          <Filter className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {level1Categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {getLocalizedLabel(category, 'en')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
