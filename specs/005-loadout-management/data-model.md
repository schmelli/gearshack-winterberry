# Data Model: Loadout Management

**Feature**: 005-loadout-management
**Date**: 2025-12-05

## Entity Definitions

### Loadout (NEW)

Represents a trip packing list containing gear items.

```typescript
// types/loadout.ts

export interface Loadout {
  /** Unique identifier (UUID) */
  id: string;

  /** User-defined name for the loadout */
  name: string;

  /** Optional trip date for organization */
  tripDate: Date | null;

  /** Array of GearItem IDs included in this loadout */
  itemIds: string[];

  /** Timestamp when loadout was created */
  createdAt: Date;

  /** Timestamp when loadout was last modified */
  updatedAt: Date;
}

/** Form data for creating/editing a loadout */
export interface LoadoutFormData {
  name: string;
  tripDate: string; // ISO date string for form input
}

/** Default values for new loadout form */
export const DEFAULT_LOADOUT_FORM: LoadoutFormData = {
  name: '',
  tripDate: '',
};
```

### CategoryWeight (Computed)

Aggregated weight data for visualization.

```typescript
// types/loadout.ts

export interface CategoryWeight {
  /** Category ID from taxonomy */
  categoryId: string;

  /** Human-readable category label */
  categoryLabel: string;

  /** Total weight in grams for this category */
  totalWeightGrams: number;

  /** Number of items in this category */
  itemCount: number;

  /** Percentage of total loadout weight */
  percentage: number;
}
```

### GearshackStore (NEW)

Central store state shape.

```typescript
// types/store.ts

import type { GearItem } from '@/types/gear';
import type { Loadout } from '@/types/loadout';

export interface GearshackStore {
  // ==========================================================================
  // State
  // ==========================================================================

  /** All gear items in the inventory */
  items: GearItem[];

  /** All user-created loadouts */
  loadouts: Loadout[];

  /** Whether store has been initialized (for migration check) */
  _initialized: boolean;

  // ==========================================================================
  // Item Actions
  // ==========================================================================

  /**
   * Add a new gear item to the store
   * @returns The generated item ID
   */
  addItem: (item: Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'>) => string;

  /**
   * Update an existing gear item
   * @param id - Item ID to update
   * @param updates - Partial item data to merge
   */
  updateItem: (id: string, updates: Partial<Omit<GearItem, 'id' | 'createdAt'>>) => void;

  /**
   * Delete a gear item (also removes from all loadouts)
   * @param id - Item ID to delete
   */
  deleteItem: (id: string) => void;

  // ==========================================================================
  // Loadout Actions
  // ==========================================================================

  /**
   * Create a new loadout
   * @param name - Loadout name
   * @param tripDate - Optional trip date
   * @returns The generated loadout ID
   */
  createLoadout: (name: string, tripDate?: Date | null) => string;

  /**
   * Update loadout metadata (name, date)
   * @param id - Loadout ID
   * @param updates - Partial loadout data to merge
   */
  updateLoadout: (id: string, updates: Partial<Pick<Loadout, 'name' | 'tripDate'>>) => void;

  /**
   * Delete a loadout
   * @param id - Loadout ID to delete
   */
  deleteLoadout: (id: string) => void;

  /**
   * Add an item to a loadout (idempotent - ignores duplicates)
   * @param loadoutId - Target loadout ID
   * @param itemId - Item ID to add
   */
  addItemToLoadout: (loadoutId: string, itemId: string) => void;

  /**
   * Remove an item from a loadout
   * @param loadoutId - Target loadout ID
   * @param itemId - Item ID to remove
   */
  removeItemFromLoadout: (loadoutId: string, itemId: string) => void;

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize store with mock data (called once on first load)
   * @param items - Initial gear items
   */
  initializeWithMockData: (items: GearItem[]) => void;
}
```

---

## Derived Types

### LoadoutSummary (for dashboard cards)

```typescript
// types/loadout.ts

export interface LoadoutSummary {
  /** Loadout ID */
  id: string;

  /** Loadout name */
  name: string;

  /** Trip date (formatted for display) */
  tripDateFormatted: string | null;

  /** Total weight in grams */
  totalWeightGrams: number;

  /** Number of items */
  itemCount: number;

  /** Weight breakdown by category (for mini donut) */
  categoryWeights: CategoryWeight[];
}
```

### WeightCategory (for color coding)

```typescript
// types/loadout.ts

export type WeightCategory = 'ultralight' | 'moderate' | 'heavy';

export const WEIGHT_THRESHOLDS = {
  /** Maximum weight for ultralight category (grams) */
  ULTRALIGHT_MAX: 4500,

  /** Maximum weight for moderate category (grams) */
  MODERATE_MAX: 9000,
} as const;
```

---

## Relationships

```text
┌─────────────┐         ┌─────────────┐
│   Loadout   │ 1───n   │  itemIds[]  │
│             │─────────│  (string[]) │
│ id          │         └──────┬──────┘
│ name        │                │
│ tripDate    │                │ references
│ itemIds[]   │                │
└─────────────┘                ▼
                        ┌─────────────┐
                        │  GearItem   │
                        │             │
                        │ id          │
                        │ name        │
                        │ weightGrams │
                        │ categoryId  │
                        │ ...         │
                        └─────────────┘
```

- **Loadout → GearItem**: Many-to-many via `itemIds` array
- **GearItem can belong to multiple Loadouts**: Same tent can be in "PCT Thru-Hike" and "Weekend Trip"
- **Deleting GearItem**: Must remove from all loadouts' `itemIds`
- **Deleting Loadout**: Does not affect GearItems

---

## Validation Rules

### Loadout

| Field | Rule |
|-------|------|
| `name` | Required, 1-100 characters, trimmed |
| `tripDate` | Optional, must be valid Date if provided |
| `itemIds` | Array of valid item IDs, no duplicates |

### Zod Schema

```typescript
// lib/validations/loadout-schema.ts

import { z } from 'zod';

export const loadoutFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .transform((val) => val.trim()),

  tripDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : null))
    .refine((val) => val === null || !isNaN(val.getTime()), {
      message: 'Invalid date',
    }),
});

export type LoadoutFormInput = z.input<typeof loadoutFormSchema>;
export type LoadoutFormOutput = z.output<typeof loadoutFormSchema>;
```

---

## State Transitions

### Loadout Lifecycle

```text
[Empty]
   │
   ├── createLoadout(name, date) ──► [Created]
   │                                      │
   │                                      ├── addItemToLoadout() ──► [Has Items]
   │                                      │                              │
   │                                      │                              ├── removeItemFromLoadout()
   │                                      │                              │       └── (back to Created or Has Items)
   │                                      │                              │
   │                                      ├── updateLoadout() ──────────┼── (stays in current state)
   │                                      │                              │
   │                                      └── deleteLoadout() ──────────┴──► [Deleted]
```

### Store Persistence

```text
[Browser Load]
      │
      ▼
┌─────────────────┐
│ Check localStorage │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Exists? │
    └────┬────┘
         │
    Yes ─┴─ No
     │       │
     ▼       ▼
[Hydrate]  [Initialize with mock data]
     │       │
     └───┬───┘
         │
         ▼
   [Store Ready]
         │
         ▼
[Auto-save on every mutation]
```

---

## Migration Notes

### From useInventory.ts

Current: `MOCK_GEAR_ITEMS` hardcoded array
Target: `useStore().items` from zustand

```typescript
// Before (hooks/useInventory.ts)
const items = MOCK_GEAR_ITEMS;

// After
const items = useStore((state) => state.items);
```

### From useGearEditor.ts

Current: Console.log on save
Target: `useStore().addItem()` / `updateItem()`

```typescript
// Before (hooks/useGearEditor.ts)
console.log('Saved gear item:', savedItem);

// After
const { addItem, updateItem } = useStore();
if (isEditing) {
  updateItem(initialItem.id, formDataToGearItem(data));
} else {
  addItem(formDataToGearItem(data));
}
```
