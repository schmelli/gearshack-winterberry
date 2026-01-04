'use client';

/**
 * ShakedownsFeedContent Component
 *
 * Feature: 001-community-shakedowns
 * Task: T034 (updated T065)
 *
 * Client component for the shakedowns feed page.
 * Uses the ShakedownFilters component with Zustand store for state management
 * and URL sync for shareable filtered views.
 *
 * Features:
 * - Centralized filter state via useShakedownFilters Zustand store
 * - URL sync for shareable filtered views
 * - Sort dropdown: Recent, Popular, Unanswered
 * - Status filter: All, Open, Completed, Archived
 * - Experience filter: All, Beginner, Intermediate, Experienced, Expert
 * - Season filter: All, Spring, Summer, Fall, Winter
 * - Trip Type filter: All, Day Hike, Overnight, Multi-day, Thru-hike
 * - Debounced search input for trip names
 * - Friends First toggle
 * - Responsive layout (filters horizontal on desktop, collapsible on mobile)
 */

import { Suspense, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Plus, Loader2 } from 'lucide-react';

import { ShakedownFeed } from '@/components/shakedowns/ShakedownFeed';
import { ShakedownFilters } from '@/components/shakedowns/ShakedownFilters';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import {
  useShakedownFilters,
  useFilteredShakedownsUrl,
} from '@/hooks/shakedowns';
import type { ShakedownFilters as ShakedownFiltersType } from '@/hooks/shakedowns/useShakedowns';
import type { ShakedownFilterState } from '@/components/shakedowns/ShakedownFilters';

// =============================================================================
// Header Section Component
// =============================================================================

function PageHeader() {
  const t = useTranslations('Shakedowns');

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
      </div>
      <Button asChild>
        <Link href="/community/shakedowns/new">
          <Plus className="mr-2 h-4 w-4" />
          {t('create')}
        </Link>
      </Button>
    </div>
  );
}

// =============================================================================
// Main Content Component
// =============================================================================

function ShakedownsFeedPageContent() {
  // Zustand store - use individual selectors to avoid infinite loops
  const status = useShakedownFilters((state) => state.status);
  const experienceLevel = useShakedownFilters((state) => state.experienceLevel);
  const search = useShakedownFilters((state) => state.search);
  const sort = useShakedownFilters((state) => state.sort);
  const friendsFirst = useShakedownFilters((state) => state.friendsFirst);
  const season = useShakedownFilters((state) => state.season);
  const tripType = useShakedownFilters((state) => state.tripType);

  // Store actions (stable references)
  const setSearch = useShakedownFilters((state) => state.setSearch);
  const setSort = useShakedownFilters((state) => state.setSort);
  const setStatus = useShakedownFilters((state) => state.setStatus);
  const setExperienceLevel = useShakedownFilters((state) => state.setExperienceLevel);
  const setSeason = useShakedownFilters((state) => state.setSeason);
  const setTripType = useShakedownFilters((state) => state.setTripType);
  const setFriendsFirst = useShakedownFilters((state) => state.setFriendsFirst);

  // URL sync hook
  const { filterUrl, syncFromUrl, updateUrl } = useFilteredShakedownsUrl();

  // Sync filters from URL on mount only
  useEffect(() => {
    syncFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Update URL when filters change
  useEffect(() => {
    updateUrl();
  }, [filterUrl, updateUrl]);

  // Handle filter changes from the ShakedownFilters component
  const handleFiltersChange = useCallback(
    (newFilters: ShakedownFilterState) => {
      // Update Zustand store with new filter values
      if (newFilters.search !== search) {
        setSearch(newFilters.search);
      }
      if (newFilters.sort !== sort) {
        setSort(newFilters.sort);
      }
      if (newFilters.status !== status) {
        setStatus(newFilters.status);
      }
      if (newFilters.experience !== experienceLevel) {
        setExperienceLevel(newFilters.experience);
      }
      if (newFilters.season !== season) {
        setSeason(newFilters.season);
      }
      if (newFilters.tripType !== tripType) {
        setTripType(newFilters.tripType);
      }
      if (newFilters.friendsFirst !== friendsFirst) {
        setFriendsFirst(newFilters.friendsFirst);
      }
    },
    [
      search, sort, status, experienceLevel, season, tripType, friendsFirst,
      setSearch, setSort, setStatus, setExperienceLevel, setSeason, setTripType, setFriendsFirst,
    ]
  );

  // Build filters object for ShakedownFeed
  const feedFilters: ShakedownFiltersType = {
    status: status ?? undefined,
    experienceLevel: experienceLevel ?? undefined,
    search: search.trim() || undefined,
    friendsFirst: friendsFirst || undefined,
  };

  // Build initial filters for ShakedownFilters component
  const initialFiltersForComponent: Partial<ShakedownFilterState> = {
    search,
    sort,
    status,
    experience: experienceLevel,
    season,
    tripType,
    friendsFirst,
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <PageHeader />

      {/* Filters Section */}
      <div className="mt-8">
        <ShakedownFilters
          initialFilters={initialFiltersForComponent}
          onFiltersChange={handleFiltersChange}
        />
      </div>

      {/* Feed */}
      <div className="mt-6">
        <ShakedownFeed
          key={JSON.stringify(feedFilters) + sort}
          initialSort={sort}
          initialFilters={feedFilters}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Exported Component with Auth Protection and Suspense
// =============================================================================

export function ShakedownsFeedContent() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        }
      >
        <ShakedownsFeedPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}

export default ShakedownsFeedContent;
