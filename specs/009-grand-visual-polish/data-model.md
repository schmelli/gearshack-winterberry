# Data Model: Grand Visual Polish Sprint

**Feature**: 009-grand-visual-polish
**Date**: 2025-12-05
**Purpose**: Define data structures for Activity Matrix visualization

## Overview

This feature is primarily visual/styling changes. The only new data structure required is the Activity Priority Matrix configuration for the Activity Matrix visualization (FR-015-018).

## Entity: Activity Priority Matrix

### Purpose
Maps each activity type to priority scores (0-100) for four dimensions: Weight, Comfort, Durability, and Safety. Used to render progress bars showing how different activities prioritize these factors.

### Type Definition

```typescript
// types/loadout.ts (extend existing file)

/**
 * Priority scores for gear selection criteria.
 * Values 0-100 represent importance level for each dimension.
 */
export interface ActivityPriorities {
  /** Weight optimization priority (higher = lighter gear preferred) */
  weight: number;
  /** Comfort priority (higher = more comfort-focused) */
  comfort: number;
  /** Durability priority (higher = more rugged gear preferred) */
  durability: number;
  /** Safety priority (higher = safety-critical gear preferred) */
  safety: number;
}

/**
 * Matrix mapping activity types to their priority profiles.
 */
export type ActivityPriorityMatrix = Record<ActivityType, ActivityPriorities>;
```

### Configuration Data

```typescript
// lib/loadout-utils.ts (add to existing file)

import type { ActivityPriorityMatrix } from '@/types/loadout';

/**
 * Predefined priority matrix for activity types.
 *
 * Values represent 0-100 priority score:
 * - 0-30: Low priority
 * - 31-60: Medium priority
 * - 61-80: High priority
 * - 81-100: Critical priority
 */
export const ACTIVITY_PRIORITY_MATRIX: ActivityPriorityMatrix = {
  hiking: {
    weight: 70,      // High - day hikers value lighter packs
    comfort: 60,     // Medium-high - comfort for sustained walking
    durability: 50,  // Medium - trails are generally predictable
    safety: 40,      // Medium-low - established trails are safe
  },
  camping: {
    weight: 30,      // Low - car camping doesn't restrict weight
    comfort: 90,     // Critical - comfort is primary goal
    durability: 60,  // Medium-high - gear gets used repeatedly
    safety: 50,      // Medium - camp setup matters
  },
  backpacking: {
    weight: 90,      // Critical - carrying everything on your back
    comfort: 50,     // Medium - some comfort sacrificed for weight
    durability: 70,  // High - gear must survive multi-day use
    safety: 60,      // Medium-high - remote areas need reliable gear
  },
  climbing: {
    weight: 60,      // Medium-high - weight matters but safety first
    comfort: 40,     // Medium-low - functionality over comfort
    durability: 90,  // Critical - gear failure is dangerous
    safety: 95,      // Critical - life-safety equipment
  },
  skiing: {
    weight: 50,      // Medium - some weight acceptable for performance
    comfort: 70,     // High - warmth and mobility important
    durability: 80,  // High - harsh conditions demand robust gear
    safety: 90,      // Critical - avalanche and cold weather risks
  },
};
```

### Field Descriptions

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| weight | number | 0-100 | Priority for lightweight gear. Higher = ultralight focus |
| comfort | number | 0-100 | Priority for comfortable gear. Higher = comfort-first |
| durability | number | 0-100 | Priority for rugged/durable gear. Higher = built to last |
| safety | number | 0-100 | Priority for safety-critical gear. Higher = life-safety |

### Validation Rules

- All priority values MUST be integers between 0 and 100 (inclusive)
- All four dimensions MUST be present for each activity type
- Activity types MUST match the existing `ActivityType` union type

### State Transitions

N/A - This is static configuration data with no state changes.

## Computed Values

### Averaged Priorities (for multi-activity selection)

When a user selects multiple activities, the displayed priorities should be the average across all selected activities.

```typescript
// Helper function in hooks/useLoadoutEditor.ts (Constitution Principle I: business logic in hooks)

export function computeAveragePriorities(
  selectedActivities: ActivityType[]
): ActivityPriorities {
  if (selectedActivities.length === 0) {
    return { weight: 50, comfort: 50, durability: 50, safety: 50 };
  }

  const totals = selectedActivities.reduce(
    (acc, activity) => {
      const priorities = ACTIVITY_PRIORITY_MATRIX[activity];
      return {
        weight: acc.weight + priorities.weight,
        comfort: acc.comfort + priorities.comfort,
        durability: acc.durability + priorities.durability,
        safety: acc.safety + priorities.safety,
      };
    },
    { weight: 0, comfort: 0, durability: 0, safety: 0 }
  );

  const count = selectedActivities.length;
  return {
    weight: Math.round(totals.weight / count),
    comfort: Math.round(totals.comfort / count),
    durability: Math.round(totals.durability / count),
    safety: Math.round(totals.safety / count),
  };
}
```

## Relationship to Existing Models

### Integration Points

```
┌─────────────────────┐
│      Loadout        │
├─────────────────────┤
│ activityTypes[]     │──────┐
└─────────────────────┘      │
                             │ lookup
                             ▼
                    ┌──────────────────────┐
                    │ ACTIVITY_PRIORITY_   │
                    │ MATRIX (config)      │
                    ├──────────────────────┤
                    │ hiking → priorities  │
                    │ camping → priorities │
                    │ ...                  │
                    └──────────────────────┘
                             │
                             │ compute average
                             ▼
                    ┌──────────────────────┐
                    │   ActivityMatrix     │
                    │    Component         │
                    ├──────────────────────┤
                    │ 4 Progress bars      │
                    └──────────────────────┘
```

### No Database Impact

This configuration is:
- Read-only static data
- No persistence required
- No API calls needed
- No schema changes to Firestore

## Summary

| Entity | Storage | Persistence |
|--------|---------|-------------|
| ActivityPriorityMatrix | lib/loadout-utils.ts | Static config (bundled) |
| ActivityPriorities | types/loadout.ts | Type definition only |

No database migrations or API changes required for this feature.
