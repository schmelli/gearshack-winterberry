/**
 * LoadoutToolbar Component
 *
 * Feature: 017-loadouts-search-filter
 * Contains search, activity filter, sort dropdown, and loadout count
 * Styled consistently with GalleryToolbar
 */

'use client';

import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  type ActivityType,
  type LoadoutSortOption,
} from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

interface LoadoutToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Activity Filter
  activityFilter: ActivityType | null;
  onActivityChange: (activity: ActivityType | null) => void;

  // Sort
  sortOption: LoadoutSortOption;
  onSortChange: (option: LoadoutSortOption) => void;

  // Clear
  hasActiveFilters: boolean;
  onClearFilters: () => void;

  // Stats
  loadoutCount: number;
  filteredCount: number;
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutToolbar({
  searchQuery,
  onSearchChange,
  activityFilter,
  onActivityChange,
  sortOption,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
  loadoutCount,
  filteredCount,
}: LoadoutToolbarProps) {
  const t = useTranslations('Loadouts.toolbar');
  const tActivities = useTranslations('LoadoutCreation.activities');

  const showingFiltered = hasActiveFilters && filteredCount !== loadoutCount;

  // Activity types with translated labels
  const activityTypes: ActivityType[] = ['hiking', 'camping', 'climbing', 'skiing', 'backpacking'];

  // Sort option mappings
  const sortOptionKeys: Record<LoadoutSortOption, string> = {
    'date-newest': 'dateNewest',
    'date-oldest': 'dateOldest',
    'weight-lightest': 'weightLightest',
    'weight-heaviest': 'weightHeaviest',
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Main toolbar row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: Search, Activity filter, Sort, Clear */}
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
              aria-label={t('searchAriaLabel')}
            />
          </div>

          {/* Activity Filter */}
          <Select
            value={activityFilter ?? 'all'}
            onValueChange={(value) =>
              onActivityChange(value === 'all' ? null : (value as ActivityType))
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]" aria-label={t('activityFilterAriaLabel')}>
              <SelectValue placeholder={t('allActivities')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allActivities')}</SelectItem>
              {activityTypes.map((activity) => (
                <SelectItem key={activity} value={activity}>
                  {tActivities(activity)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Dropdown */}
          <Select
            value={sortOption}
            onValueChange={(value) => onSortChange(value as LoadoutSortOption)}
          >
            <SelectTrigger className="w-full sm:w-[180px]" aria-label={t('sortAriaLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(sortOptionKeys) as LoadoutSortOption[]).map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`sortOptions.${sortOptionKeys[option]}`)}
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
              {t('clearFilters')}
            </Button>
          )}
        </div>
      </div>

      {/* Loadout count display */}
      <div className="text-sm text-muted-foreground">
        {showingFiltered ? (
          <span>
            {t('showingFiltered', { filtered: filteredCount, total: loadoutCount })}
          </span>
        ) : (
          <span>{t('loadoutCount', { count: loadoutCount })}</span>
        )}
      </div>
    </div>
  );
}
