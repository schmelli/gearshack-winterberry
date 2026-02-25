# Research: Loadouts Search, Filter, and Sort

**Feature**: 017-loadouts-search-filter
**Date**: 2025-12-05

## Research Tasks

### 1. Existing Hook Pattern Analysis

**Task**: Analyze `useLoadoutSearch` hook for extension strategy

**Findings**:
- Hook already implements search by name (case-insensitive) and season filter
- Uses `useMemo` for filtered results with dependency array
- Returns state setters and `hasActiveFilters` boolean
- `clearFilters` resets all state

**Decision**: Extend existing hook rather than create new one
**Rationale**: Maintains single source of truth for all loadout filtering, follows established pattern
**Alternatives Considered**:
- New `useLoadoutSort` hook - Rejected: Would require composing two hooks, more complex state management
- Higher-order hook wrapper - Rejected: Over-engineering for simple addition

### 2. Sort Implementation Strategy

**Task**: Determine sort approach for date and weight sorting

**Findings**:
- Loadout has `createdAt` and `updatedAt` Date fields
- Weight must be computed from `itemIds` using items from store
- GalleryToolbar doesn't have sort (this is new functionality)

**Decision**:
- Sort by `updatedAt` for date sorting (user expectation: most recent changes first)
- Pass `items` array to hook for weight calculation
- Use `Array.sort()` with comparison function after filtering

**Rationale**:
- `updatedAt` reflects user activity better than `createdAt`
- Passing items avoids hook needing store access (keeps hook pure)

**Alternatives Considered**:
- Sort by `createdAt` - Rejected: Users expect recent edits to surface
- Pre-compute weight on loadout - Rejected: Would require store migration

### 3. Activity Filter Logic

**Task**: Determine how activity filter works with `activityTypes[]` array

**Findings**:
- `Loadout.activityTypes` is optional (`ActivityType[] | undefined`)
- A loadout can have multiple activity types
- Filter should show loadout if ANY of its activities match the filter

**Decision**: Use `Array.some()` for activity matching
**Rationale**: Most intuitive UX - "Show me anything with Hiking" includes multi-activity loadouts
**Alternatives Considered**:
- Exact match only - Rejected: Too restrictive for multi-activity loadouts
- Multi-select filter - Rejected: Over-engineering for MVP, can add later

### 4. Weight Calculation Approach

**Task**: Determine how to calculate loadout total weight for sorting

**Findings**:
- Loadout stores `itemIds: string[]`
- Weight is on `GearItem.weightGrams`
- Need to sum weights of all items in loadout

**Decision**: Create helper function `getLoadoutWeight(loadout, items)` in hook file
**Rationale**: Encapsulates calculation, reusable for sort comparison

**Code Pattern**:
```typescript
function getLoadoutWeight(loadout: Loadout, items: GearItem[]): number {
  return loadout.itemIds.reduce((sum, id) => {
    const item = items.find(i => i.id === id);
    return sum + (item?.weightGrams ?? 0);
  }, 0);
}
```

### 5. Default Sort Behavior

**Task**: Determine default sort and when "Clear Filters" affects sort

**Findings**:
- Current page shows loadouts in store order (insertion order)
- FR-009 specifies "Date (Newest)" as default

**Decision**:
- Default sort is `date-newest`
- "Clear Filters" resets sort to `date-newest`
- Sort dropdown shows current selection, defaults to "Date (Newest)"

**Rationale**: Newest first is most useful default for trip planning context

### 6. Toolbar Layout Pattern

**Task**: Match GalleryToolbar styling for consistency

**Findings** from `GalleryToolbar.tsx`:
- Uses `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`
- Search input has `relative w-full sm:max-w-xs` with Search icon
- Select uses `w-full sm:w-[180px]`
- Clear button is `variant="ghost" size="sm"`
- Shows "Showing X of Y items" when filtered

**Decision**: Mirror exact class patterns from GalleryToolbar
**Rationale**: Visual consistency across application

## Summary of Decisions

| Topic | Decision |
|-------|----------|
| Hook approach | Extend `useLoadoutSearch` |
| Date sorting field | `updatedAt` |
| Activity matching | `Array.some()` (any match) |
| Weight calculation | Helper function in hook |
| Default sort | `date-newest` |
| Clear behavior | Resets search, filters, AND sort to default |
| Toolbar styling | Mirror GalleryToolbar patterns |

## No Clarifications Needed

All technical decisions have been made based on existing patterns and spec requirements. Ready for Phase 1 design.
