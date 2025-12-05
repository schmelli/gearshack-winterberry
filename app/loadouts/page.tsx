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
 */

'use client';

import Link from 'next/link';
import { Plus, Backpack, Search, X } from 'lucide-react';
import { useLoadouts, useItems } from '@/hooks/useStore';
import { useLoadoutSearch } from '@/hooks/useLoadoutSearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadoutCard } from '@/components/loadouts/LoadoutCard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SEASON_LABELS } from '@/types/loadout';
import type { Season } from '@/types/loadout';

function LoadoutsContent() {
  const loadouts = useLoadouts();
  const items = useItems();

  // US8: Search and filter functionality
  const {
    searchQuery,
    setSearchQuery,
    seasonFilter,
    setSeasonFilter,
    clearFilters,
    hasActiveFilters,
    filteredLoadouts,
  } = useLoadoutSearch(loadouts);

  const isEmpty = loadouts.length === 0;
  const hasResults = filteredLoadouts.length > 0;

  return (
    <div className="container py-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loadouts</h1>
          <p className="mt-1 text-muted-foreground">
            Plan your trips by combining gear from your inventory
          </p>
        </div>
        <Button asChild>
          <Link href="/loadouts/new">
            <Plus className="mr-2 h-4 w-4" />
            Create New Loadout
          </Link>
        </Button>
      </div>

      {/* US8: Search and Filter Toolbar */}
      {!isEmpty && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search loadouts by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Season Filter */}
          <Select
            value={seasonFilter ?? 'all'}
            onValueChange={(value) => setSeasonFilter(value === 'all' ? null : value as Season)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All seasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All seasons</SelectItem>
              <SelectItem value="spring">{SEASON_LABELS.spring}</SelectItem>
              <SelectItem value="summer">{SEASON_LABELS.summer}</SelectItem>
              <SelectItem value="fall">{SEASON_LABELS.fall}</SelectItem>
              <SelectItem value="winter">{SEASON_LABELS.winter}</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Empty State */}
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

      {/* US8: Empty Search Results */}
      {!isEmpty && !hasResults && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Search className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">No loadouts found</h2>
          <p className="mb-6 max-w-sm text-center text-muted-foreground">
            No loadouts match your search criteria. Try adjusting your filters.
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Loadout Cards Grid (FR-005, US8: Using filtered results) */}
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
