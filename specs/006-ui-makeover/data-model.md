# Data Model: UI/UX Makeover

**Feature**: 006-ui-makeover | **Date**: 2025-12-05

## Overview

This document defines data model extensions for the UI/UX makeover feature. The changes extend existing types from 005-loadout-management without breaking changes.

## Entity Extensions

### 1. Loadout Entity Extension

**File**: `types/loadout.ts`

**Current Fields** (from 005-loadout-management):
- `id: string`
- `name: string`
- `tripDate: Date | null`
- `itemIds: string[]`
- `createdAt: Date`
- `updatedAt: Date`

**New Fields** (for FR-007, FR-008, FR-010):

```typescript
/** Activity type classification for loadout filtering */
export type ActivityType = 'hiking' | 'camping' | 'climbing' | 'skiing' | 'backpacking';

/** Season classification for loadout filtering */
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

/** Activity type labels for UI display */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  hiking: 'Hiking',
  camping: 'Camping',
  climbing: 'Climbing',
  skiing: 'Skiing',
  backpacking: 'Backpacking',
};

/** Season labels for UI display */
export const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};

export interface Loadout {
  // ... existing fields unchanged

  /** Optional activity types for classification (FR-007) */
  activityTypes?: ActivityType[];

  /** Optional seasons for classification (FR-008) */
  seasons?: Season[];
}
```

**Migration**: Existing loadouts will have `undefined` for new fields. UI displays empty badge sections when undefined.

### 2. Chart Filter State

**File**: `hooks/useChartFilter.ts`

**New Type** (for FR-012):

```typescript
/** State for chart segment filtering */
export interface ChartFilterState {
  /** Currently selected category ID, null = no filter */
  selectedCategoryId: string | null;

  /** Toggle filter on/off for a category */
  toggleCategory: (categoryId: string) => void;

  /** Clear all filters */
  clearFilter: () => void;
}
```

### 3. Loadout Form Data Extension

**File**: `types/loadout.ts`

**Extension**:

```typescript
export interface LoadoutFormData {
  name: string;
  tripDate: string;
  activityTypes?: ActivityType[];  // NEW
  seasons?: Season[];               // NEW
}

export const DEFAULT_LOADOUT_FORM: LoadoutFormData = {
  name: '',
  tripDate: '',
  activityTypes: [],  // NEW
  seasons: [],        // NEW
};
```

## Existing Types (No Changes Required)

### GearItem (types/gear.ts)

The existing `GearItem` interface already has:
- `primaryImageUrl: string | null` - Used for gear card images (FR-015)
- `notes: string | null` - Can serve as description for detail modal (FR-017)

No extensions needed. The detail modal will use existing fields:
- `name`, `brand` - Header
- `primaryImageUrl` - Large image display
- `notes` - Description section
- `weightGrams`, `lengthCm`, `widthCm`, `heightCm` - Specifications

### CategoryWeight (types/loadout.ts)

Existing type sufficient for chart click events:
- `categoryId: string` - Used as filter key
- `categoryLabel: string` - Used in tooltip
- `totalWeightGrams: number` - Used in center display
- `percentage: number` - Used in tooltip

## Store Extensions

### GearshackStore (types/store.ts)

**New Actions** (for FR-010):

```typescript
export interface GearshackStore {
  // ... existing state and actions

  /** Update loadout metadata (activity types, seasons) */
  updateLoadoutMetadata: (
    id: string,
    metadata: { activityTypes?: ActivityType[]; seasons?: Season[] }
  ) => void;
}
```

## Component Props

### LoadoutHeader Props

```typescript
interface LoadoutHeaderProps {
  loadout: Loadout;
  totalWeight: number;
  categoryWeights: CategoryWeight[];
  onMetadataChange: (metadata: { activityTypes?: ActivityType[]; seasons?: Season[] }) => void;
}
```

### WeightDonut Props (Extended)

```typescript
interface WeightDonutProps {
  categoryWeights: CategoryWeight[];
  size?: 'small' | 'large';

  // NEW: Click interaction (FR-012)
  onSegmentClick?: (categoryId: string) => void;
  selectedCategoryId?: string | null;

  // NEW: Center label (FR-013)
  showCenterLabel?: boolean;
}
```

### GearDetailModal Props

```typescript
interface GearDetailModalProps {
  item: GearItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

### LoadoutList Props (Extended)

```typescript
interface LoadoutListProps {
  items: GearItem[];
  onRemoveItem: (itemId: string) => void;

  // NEW: Filter by category (FR-012)
  filterCategoryId?: string | null;
}
```

## Weight Goal Configuration

**File**: `lib/loadout-utils.ts` or `types/loadout.ts`

```typescript
/** Default weight goal for progress bar (FR-009) */
export const DEFAULT_WEIGHT_GOAL_GRAMS = 4500; // 4.5kg ultralight target

/** Weight goal interface for future customization */
export interface WeightGoal {
  targetGrams: number;
  label: string;
}

export const WEIGHT_GOALS: Record<string, WeightGoal> = {
  ultralight: { targetGrams: 4500, label: 'Ultralight (<4.5kg)' },
  lightweight: { targetGrams: 6800, label: 'Lightweight (<6.8kg)' },
  traditional: { targetGrams: 11300, label: 'Traditional (<11.3kg)' },
};
```

## Summary

| Entity | Change Type | Impact |
|--------|-------------|--------|
| Loadout | Extension | 2 new optional fields |
| LoadoutFormData | Extension | 2 new optional fields |
| GearshackStore | Extension | 1 new action |
| GearItem | None | Uses existing fields |
| CategoryWeight | None | Uses existing fields |
| ChartFilterState | New | Local hook state only |
| WeightGoal | New | Configuration constants |

All changes are additive and backward-compatible.
