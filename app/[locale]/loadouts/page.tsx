/**
 * Loadouts Dashboard Page
 *
 * Feature: 005-loadout-management
 * FR-005: Display loadouts in a responsive card grid at /loadouts
 * FR-008: Provide a "Create New Loadout" action button
 *
 * Feature: 007-grand-polish-sprint
 * US8: Loadouts Dashboard Search - Search by name and filter by season
 *
 * Feature: 008-auth-and-profile
 * T046: Protected route - requires authentication
 *
 * Feature: 017-loadouts-search-filter
 * Extended with activity filter, sorting, and dedicated toolbar component
 */

'use client';

import { Link } from '@/i18n/navigation';
import { Plus, Backpack, Search } from 'lucide-react';
import { useLoadouts, useItems } from '@/hooks/useSupabaseStore';
import { useLoadoutSearch } from '@/hooks/useLoadoutSearch';
import { Button } from '@/components/ui/button';
import { LoadoutCard } from '@/components/loadouts/LoadoutCard';
import { LoadoutToolbar } from '@/components/loadouts/LoadoutToolbar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function LoadoutsContent() {
  const loadouts = useLoadouts();
  const items = useItems();

  // Feature 017: Extended search, filter, and sort functionality
  const {
    searchQuery,
    setSearchQuery,
    activityFilter,
    setActivityFilter,
    sortOption,
    setSortOption,
    clearFilters,
    hasActiveFilters,
    filteredLoadouts,
  } = useLoadoutSearch(loadouts, items);

  const isEmpty = loadouts.length === 0;
  const hasResults = filteredLoadouts.length > 0;

  return (
    <div className="container py-8">
      {/* Page Header - Create New Loadout button */}
      <div className="mb-6 flex items-center justify-end">
        <Button asChild>
          <Link href="/loadouts/new">
            <Plus className="mr-2 h-4 w-4" />
            Create New Loadout
          </Link>
        </Button>
      </div>

      {/* Feature 017: LoadoutToolbar with search, activity filter, and sort */}
      {!isEmpty && (
        <LoadoutToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activityFilter={activityFilter}
          onActivityChange={setActivityFilter}
          sortOption={sortOption}
          onSortChange={setSortOption}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          loadoutCount={loadouts.length}
          filteredCount={filteredLoadouts.length}
        />
      )}

      {/* Empty State - No loadouts at all */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Backpack className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No loadouts yet</h2>
          <p className="mb-6 max-w-sm text-center text-muted-foreground">
            Create your first loadout to start planning your next adventure.
            Combine gear from your inventory to track weight and categories.
          </p>
          <Button asChild>
            <Link href="/loadouts/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Loadout
            </Link>
          </Button>
        </div>
      )}

      {/* Feature 017: Empty Search/Filter Results - distinct from no loadouts */}
      {!isEmpty && !hasResults && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Search className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">No matching loadouts found</h2>
          <p className="mb-6 max-w-sm text-center text-muted-foreground">
            No loadouts match your search criteria. Try adjusting your filters.
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Loadout Cards Grid (FR-005, Feature 017: Using filtered and sorted results) */}
      {!isEmpty && hasResults && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLoadouts.map((loadout) => (
            <LoadoutCard key={loadout.id} loadout={loadout} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LoadoutsPage() {
  return (
    <ProtectedRoute>
      <LoadoutsContent />
    </ProtectedRoute>
  );
}
