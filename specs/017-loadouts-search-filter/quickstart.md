# Quickstart: Loadouts Search, Filter, and Sort

**Feature**: 017-loadouts-search-filter
**Estimated Time**: 30-45 minutes
**Prerequisites**: Feature 007 (existing useLoadoutSearch hook)

## Quick Summary

Extend the loadouts page with activity filtering, sorting, and a dedicated toolbar component matching the Inventory gallery style.

## Implementation Steps

### Step 1: Add SortOption Type

**File**: `types/loadout.ts`

Add after the existing types:

```typescript
/** Sort options for loadout list (Feature: 017) */
export type LoadoutSortOption = 'date-newest' | 'date-oldest' | 'weight-lightest' | 'weight-heaviest';

/** Sort option labels for UI display */
export const SORT_OPTION_LABELS: Record<LoadoutSortOption, string> = {
  'date-newest': 'Date (Newest)',
  'date-oldest': 'Date (Oldest)',
  'weight-lightest': 'Weight (Lightest)',
  'weight-heaviest': 'Weight (Heaviest)',
};
```

### Step 2: Extend useLoadoutSearch Hook

**File**: `hooks/useLoadoutSearch.ts`

Update imports and types:

```typescript
import type { Loadout, Season, ActivityType, LoadoutSortOption } from '@/types/loadout';
import type { GearItem } from '@/types/gear';

interface UseLoadoutSearchReturn {
  // ... existing fields ...
  activityFilter: ActivityType | null;
  setActivityFilter: (activity: ActivityType | null) => void;
  sortOption: LoadoutSortOption;
  setSortOption: (option: LoadoutSortOption) => void;
}
```

Add helper function:

```typescript
function getLoadoutWeight(loadout: Loadout, items: GearItem[]): number {
  return loadout.itemIds.reduce((sum, id) => {
    const item = items.find(i => i.id === id);
    return sum + (item?.weightGrams ?? 0);
  }, 0);
}
```

Update hook signature and add state:

```typescript
export function useLoadoutSearch(loadouts: Loadout[], items: GearItem[]): UseLoadoutSearchReturn {
  // ... existing state ...
  const [activityFilter, setActivityFilter] = useState<ActivityType | null>(null);
  const [sortOption, setSortOption] = useState<LoadoutSortOption>('date-newest');
```

Update `filteredLoadouts` useMemo to include activity filter and sorting:

```typescript
const filteredLoadouts = useMemo(() => {
  let filtered = [...loadouts];

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter((loadout) =>
      loadout.name.toLowerCase().includes(query)
    );
  }

  // Apply season filter
  if (seasonFilter) {
    filtered = filtered.filter(
      (loadout) => loadout.seasons && loadout.seasons.includes(seasonFilter)
    );
  }

  // Apply activity filter
  if (activityFilter) {
    filtered = filtered.filter(
      (loadout) => loadout.activityTypes && loadout.activityTypes.includes(activityFilter)
    );
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortOption) {
      case 'date-newest':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'date-oldest':
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case 'weight-lightest':
        return getLoadoutWeight(a, items) - getLoadoutWeight(b, items);
      case 'weight-heaviest':
        return getLoadoutWeight(b, items) - getLoadoutWeight(a, items);
      default:
        return 0;
    }
  });

  return filtered;
}, [loadouts, items, searchQuery, seasonFilter, activityFilter, sortOption]);
```

Update `hasActiveFilters` and `clearFilters`:

```typescript
const hasActiveFilters =
  searchQuery.trim() !== '' ||
  seasonFilter !== null ||
  activityFilter !== null ||
  sortOption !== 'date-newest';

const clearFilters = () => {
  setSearchQuery('');
  setSeasonFilter(null);
  setActivityFilter(null);
  setSortOption('date-newest');
};
```

### Step 3: Create LoadoutToolbar Component

**File**: `components/loadouts/LoadoutToolbar.tsx`

```typescript
/**
 * LoadoutToolbar Component
 *
 * Feature: 017-loadouts-search-filter
 * Contains search, activity filter, sort dropdown, and item count
 * Styled consistently with GalleryToolbar
 */

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
  ACTIVITY_TYPE_LABELS,
  SORT_OPTION_LABELS,
  type ActivityType,
  type LoadoutSortOption
} from '@/types/loadout';

interface LoadoutToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activityFilter: ActivityType | null;
  onActivityChange: (activity: ActivityType | null) => void;
  sortOption: LoadoutSortOption;
  onSortChange: (option: LoadoutSortOption) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  loadoutCount: number;
  filteredCount: number;
}

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
  const showingFiltered = hasActiveFilters && filteredCount !== loadoutCount;
  const activities = Object.entries(ACTIVITY_TYPE_LABELS) as [ActivityType, string][];
  const sortOptions = Object.entries(SORT_OPTION_LABELS) as [LoadoutSortOption, string][];

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search loadouts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
              aria-label="Search loadouts by name"
            />
          </div>

          {/* Activity Filter */}
          <Select
            value={activityFilter ?? 'all'}
            onValueChange={(value) => onActivityChange(value === 'all' ? null : value as ActivityType)}
          >
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by activity">
              <SelectValue placeholder="All Activities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {activities.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Dropdown */}
          <Select
            value={sortOption}
            onValueChange={(value) => onSortChange(value as LoadoutSortOption)}
          >
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Sort loadouts">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
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
      </div>

      {/* Loadout count display */}
      <div className="text-sm text-muted-foreground">
        {showingFiltered ? (
          <span>Showing {filteredCount} of {loadoutCount} loadouts</span>
        ) : (
          <span>{loadoutCount} loadouts</span>
        )}
      </div>
    </div>
  );
}
```

### Step 4: Update Loadouts Page

**File**: `app/loadouts/page.tsx`

Update hook call to pass items:

```diff
- const { ... } = useLoadoutSearch(loadouts);
+ const { ... } = useLoadoutSearch(loadouts, items);
```

Replace the existing toolbar section with LoadoutToolbar:

```typescript
import { LoadoutToolbar } from '@/components/loadouts/LoadoutToolbar';

// In LoadoutsContent component, replace the toolbar section:
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
```

Remove the "Create New Loadout" button from separate header div - integrate into page layout or keep separate.

## Verification Checklist

- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run build` - no errors
- [ ] Visual: Search filters loadouts by name (case-insensitive)
- [ ] Visual: Activity dropdown filters by activity type
- [ ] Visual: Sort dropdown changes loadout order
- [ ] Visual: "Clear filters" resets all filters to default
- [ ] Visual: "Showing X of Y loadouts" displays when filtered
- [ ] Visual: Toolbar matches Inventory GalleryToolbar styling
- [ ] Visual: Empty state shows "No matching loadouts found" when filters return zero

## Rollback Plan

All changes are additions or modifications to existing files:

1. Remove `LoadoutSortOption` and `SORT_OPTION_LABELS` from `types/loadout.ts`
2. Revert `useLoadoutSearch.ts` to remove activity filter and sort state
3. Delete `components/loadouts/LoadoutToolbar.tsx`
4. Revert `app/loadouts/page.tsx` to use inline toolbar

Or simply revert the branch:
```bash
git checkout 016-header-polish-sprint
git branch -D 017-loadouts-search-filter
```
