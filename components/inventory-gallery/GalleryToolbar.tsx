/**
 * GalleryToolbar Component
 *
 * Feature: 002-inventory-gallery
 * Contains search, category filter, view density toggle, and item count
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
}: GalleryToolbarProps) {
  const categories = getCategories();
  const showingFiltered = hasActiveFilters && filteredCount !== itemCount;

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
              placeholder="Search gear..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
              aria-label="Search gear by name or brand"
            />
          </div>

          {/* Category Filter */}
          <Select
            value={categoryFilter ?? 'all'}
            onValueChange={(value) =>
              onCategoryChange(value === 'all' ? null : value)
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
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
              Clear filters
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
          <span>
            Showing {filteredCount} of {itemCount} items
          </span>
        ) : (
          <span>{itemCount} items</span>
        )}
      </div>
    </div>
  );
}
