'use client';

/**
 * ShakedownFilters Component
 *
 * Feature: 001-community-shakedowns
 * Task: T063
 *
 * Provides filter UI for the shakedowns feed including:
 * - Debounced search input
 * - Sort, status, experience, season, trip type selects
 * - Friends first toggle
 * - Mobile-responsive collapsible panel
 * - Active filter count badge with clear all
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';
import type { ShakedownStatus, ExperienceLevel } from '@/types/shakedown';
import type { Season } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

export type SortOption = 'recent' | 'popular' | 'unanswered';
export type TripType = 'day-hike' | 'overnight' | 'multi-day' | 'thru-hike';

export interface ShakedownFilterState {
  search: string;
  sort: SortOption;
  status: ShakedownStatus | null;
  experience: ExperienceLevel | null;
  season: Season | null;
  tripType: TripType | null;
  friendsFirst: boolean;
}

interface ShakedownFiltersProps {
  className?: string;
  onFiltersChange?: (filters: ShakedownFilterState) => void;
  /** Initial filter values */
  initialFilters?: Partial<ShakedownFilterState>;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_FILTERS: ShakedownFilterState = {
  search: '',
  sort: 'recent',
  status: null,
  experience: null,
  season: null,
  tripType: null,
  friendsFirst: false,
};

const DEBOUNCE_DELAY = 300;

// =============================================================================
// Custom Hook: useDebounce
// =============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// Component
// =============================================================================

export function ShakedownFilters({
  className,
  onFiltersChange,
  initialFilters,
}: ShakedownFiltersProps) {
  const t = useTranslations('Shakedowns');

  // Filter state
  const [searchInput, setSearchInput] = useState(
    initialFilters?.search ?? DEFAULT_FILTERS.search
  );
  const [sort, setSort] = useState<SortOption>(
    initialFilters?.sort ?? DEFAULT_FILTERS.sort
  );
  const [status, setStatus] = useState<ShakedownStatus | null>(
    initialFilters?.status ?? DEFAULT_FILTERS.status
  );
  const [experience, setExperience] = useState<ExperienceLevel | null>(
    initialFilters?.experience ?? DEFAULT_FILTERS.experience
  );
  const [season, setSeason] = useState<Season | null>(
    initialFilters?.season ?? DEFAULT_FILTERS.season
  );
  const [tripType, setTripType] = useState<TripType | null>(
    initialFilters?.tripType ?? DEFAULT_FILTERS.tripType
  );
  const [friendsFirst, setFriendsFirst] = useState(
    initialFilters?.friendsFirst ?? DEFAULT_FILTERS.friendsFirst
  );

  // Mobile collapsible state
  const [isOpen, setIsOpen] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(searchInput, DEBOUNCE_DELAY);

  // Count active filters (excluding sort and search for count)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (status !== null) count++;
    if (experience !== null) count++;
    if (season !== null) count++;
    if (tripType !== null) count++;
    if (friendsFirst) count++;
    return count;
  }, [status, experience, season, tripType, friendsFirst]);

  // Build current filter state
  const currentFilters: ShakedownFilterState = useMemo(
    () => ({
      search: debouncedSearch,
      sort,
      status,
      experience,
      season,
      tripType,
      friendsFirst,
    }),
    [debouncedSearch, sort, status, experience, season, tripType, friendsFirst]
  );

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange?.(currentFilters);
  }, [currentFilters, onFiltersChange]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setSort('recent');
    setStatus(null);
    setExperience(null);
    setSeason(null);
    setTripType(null);
    setFriendsFirst(false);
  }, []);

  // Handle select value changes (convert "all" to null)
  const handleStatusChange = useCallback((value: string) => {
    setStatus(value === 'all' ? null : (value as ShakedownStatus));
  }, []);

  const handleExperienceChange = useCallback((value: string) => {
    setExperience(value === 'all' ? null : (value as ExperienceLevel));
  }, []);

  const handleSeasonChange = useCallback((value: string) => {
    setSeason(value === 'all' ? null : (value as Season));
  }, []);

  const handleTripTypeChange = useCallback((value: string) => {
    setTripType(value === 'all' ? null : (value as TripType));
  }, []);

  // Render filter selects (shared between desktop and mobile)
  const renderFilterControls = () => (
    <>
      {/* Sort Select */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground md:sr-only">
          {t('filters.sort')}
        </Label>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-full md:w-[140px]">
            <SelectValue placeholder={t('filters.sort')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t('filters.sortRecent')}</SelectItem>
            <SelectItem value="popular">{t('filters.sortPopular')}</SelectItem>
            <SelectItem value="unanswered">
              {t('filters.sortUnanswered')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Select */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground md:sr-only">
          {t('filters.status')}
        </Label>
        <Select
          value={status ?? 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full md:w-[130px]">
            <SelectValue placeholder={t('filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.anyStatus')}</SelectItem>
            <SelectItem value="open">{t('status.open')}</SelectItem>
            <SelectItem value="completed">{t('status.completed')}</SelectItem>
            <SelectItem value="archived">{t('status.archived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Experience Select */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground md:sr-only">
          {t('filters.experience')}
        </Label>
        <Select
          value={experience ?? 'all'}
          onValueChange={handleExperienceChange}
        >
          <SelectTrigger className="w-full md:w-[140px]">
            <SelectValue placeholder={t('filters.experience')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.anyExperience')}</SelectItem>
            <SelectItem value="beginner">{t('experience.beginner')}</SelectItem>
            <SelectItem value="intermediate">
              {t('experience.intermediate')}
            </SelectItem>
            <SelectItem value="experienced">
              {t('experience.experienced')}
            </SelectItem>
            <SelectItem value="expert">{t('experience.expert')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Season Select */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground md:sr-only">
          {t('filters.season')}
        </Label>
        <Select value={season ?? 'all'} onValueChange={handleSeasonChange}>
          <SelectTrigger className="w-full md:w-[120px]">
            <SelectValue placeholder={t('filters.season')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.anySeason')}</SelectItem>
            <SelectItem value="spring">{t('filters.seasons.spring')}</SelectItem>
            <SelectItem value="summer">{t('filters.seasons.summer')}</SelectItem>
            <SelectItem value="fall">{t('filters.seasons.fall')}</SelectItem>
            <SelectItem value="winter">{t('filters.seasons.winter')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trip Type Select */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground md:sr-only">
          {t('filters.tripType')}
        </Label>
        <Select value={tripType ?? 'all'} onValueChange={handleTripTypeChange}>
          <SelectTrigger className="w-full md:w-[130px]">
            <SelectValue placeholder={t('filters.tripType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.anyTripType')}</SelectItem>
            <SelectItem value="day-hike">{t('filters.tripTypes.dayHike')}</SelectItem>
            <SelectItem value="overnight">{t('filters.tripTypes.overnight')}</SelectItem>
            <SelectItem value="multi-day">{t('filters.tripTypes.multiDay')}</SelectItem>
            <SelectItem value="thru-hike">{t('filters.tripTypes.thruHike')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Friends First Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="friends-first"
          checked={friendsFirst}
          onCheckedChange={setFriendsFirst}
        />
        <Label
          htmlFor="friends-first"
          className="cursor-pointer text-sm whitespace-nowrap"
        >
          {t('filters.friendsFirst')}
        </Label>
      </div>
    </>
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search and Filter Toggle Row */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('filters.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-4"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t('ariaLabels.clearSearch')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mobile Filter Toggle */}
        <div className="md:hidden">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge
                    variant="default"
                    className="absolute -right-1.5 -top-1.5 h-5 w-5 p-0 text-[10px]"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
                <span className="sr-only">{t('filters.title')}</span>
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>

        {/* Desktop: Clear Filters Button (only when filters active) */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="hidden md:flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            {t('filters.clearAll')}
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Desktop Filter Row */}
      <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
        {renderFilterControls()}
      </div>

      {/* Mobile Collapsible Filter Panel */}
      <div className="md:hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {renderFilterControls()}
            </div>

            {/* Mobile Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="w-full"
              >
                <X className="mr-2 h-4 w-4" />
                {t('filters.clearAll')}
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

export default ShakedownFilters;
