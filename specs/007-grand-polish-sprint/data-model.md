# Data Model: Grand Polish Sprint

**Feature**: 007-grand-polish-sprint
**Date**: 2025-12-05

## Entity Changes

### 1. LoadoutItemState (NEW)

Tracks per-loadout state for individual items (worn/consumable flags).

```typescript
// types/loadout.ts

/**
 * Per-item state within a loadout
 * Determines whether item contributes to Base Weight
 */
export interface LoadoutItemState {
  /** Reference to GearItem.id */
  itemId: string;

  /** Item is worn on body (clothing, shoes, watch) - excluded from Base Weight */
  isWorn: boolean;

  /** Item is consumable (food, fuel, water) - excluded from Base Weight */
  isConsumable: boolean;
}
```

**Validation Rules**:
- `itemId` MUST reference a valid GearItem in the loadout's itemIds
- `isWorn` and `isConsumable` default to `false`
- An item can be both worn AND consumable (edge case, still only excluded once from Base Weight)

---

### 2. Loadout (EXTENDED)

Add item states array and optional description field.

```typescript
// types/loadout.ts (modifications to existing interface)

export interface Loadout {
  // ... existing fields ...

  /** Optional description for loadout context/notes */
  description: string | null;

  /** Per-item state for worn/consumable tracking */
  itemStates: LoadoutItemState[];
}
```

**Migration**: Existing loadouts will have `description: null` and `itemStates: []` by default.

---

### 3. WeightSummary (NEW)

Computed weight breakdown for display.

```typescript
// types/loadout.ts

/**
 * Computed weight summary for a loadout
 * Used in LoadoutHeader display
 */
export interface WeightSummary {
  /** Sum of all item weights in grams */
  totalWeight: number;

  /** Total minus worn and consumable items */
  baseWeight: number;

  /** Weight of worn items only */
  wornWeight: number;

  /** Weight of consumable items only */
  consumableWeight: number;
}
```

**Calculation Logic** (in `lib/loadout-utils.ts`):
```typescript
export function calculateWeightSummary(
  items: GearItem[],
  itemStates: LoadoutItemState[]
): WeightSummary {
  let totalWeight = 0;
  let wornWeight = 0;
  let consumableWeight = 0;

  for (const item of items) {
    const weight = item.weightGrams ?? 0;
    totalWeight += weight;

    const state = itemStates.find(s => s.itemId === item.id);
    if (state?.isWorn) {
      wornWeight += weight;
    }
    if (state?.isConsumable) {
      consumableWeight += weight;
    }
  }

  // Base Weight excludes worn and consumable, but don't double-subtract
  // An item that is both worn AND consumable is only excluded once
  const excludedWeight = items.reduce((sum, item) => {
    const state = itemStates.find(s => s.itemId === item.id);
    const isExcluded = state?.isWorn || state?.isConsumable;
    return isExcluded ? sum + (item.weightGrams ?? 0) : sum;
  }, 0);

  return {
    totalWeight,
    baseWeight: totalWeight - excludedWeight,
    wornWeight,
    consumableWeight,
  };
}
```

---

### 4. LoadoutFormData (EXTENDED)

Add description to form data.

```typescript
// types/loadout.ts (modifications to existing interface)

export interface LoadoutFormData {
  name: string;
  tripDate: string;
  description: string;  // NEW: Optional description
}

export const DEFAULT_LOADOUT_FORM: LoadoutFormData = {
  name: '',
  tripDate: '',
  description: '',  // NEW
};
```

---

## Store Actions (EXTENDED)

### New Actions for types/store.ts

```typescript
// types/store.ts (additions to GearshackStore interface)

export interface GearshackStore {
  // ... existing actions ...

  /**
   * Set worn state for an item in a loadout
   * @param loadoutId - Target loadout
   * @param itemId - Item to update
   * @param isWorn - New worn state
   */
  setItemWorn: (loadoutId: string, itemId: string, isWorn: boolean) => void;

  /**
   * Set consumable state for an item in a loadout
   * @param loadoutId - Target loadout
   * @param itemId - Item to update
   * @param isConsumable - New consumable state
   */
  setItemConsumable: (loadoutId: string, itemId: string, isConsumable: boolean) => void;

  /**
   * Update loadout with description field
   * (extends existing updateLoadout to include description)
   */
  updateLoadout: (
    id: string,
    updates: Partial<Pick<Loadout, 'name' | 'tripDate' | 'description'>>
  ) => void;
}
```

---

## Entity Relationships

```
┌─────────────┐       ┌──────────────────┐       ┌───────────┐
│   GearItem  │◀──────│ LoadoutItemState │──────▶│  Loadout  │
│             │ itemId│                  │       │           │
│  id         │       │  itemId          │       │  id       │
│  name       │       │  isWorn          │       │  name     │
│  weightGrams│       │  isConsumable    │       │  itemIds[]│
└─────────────┘       └──────────────────┘       │itemStates[]
                                                 │description│
                                                 └───────────┘

Relationships:
- Loadout.itemIds[] references GearItem.id (existing)
- Loadout.itemStates[] contains LoadoutItemState entries
- LoadoutItemState.itemId references GearItem.id
- LoadoutItemState only exists for items in the loadout's itemIds
```

---

## State Transitions

### Item State Changes

| Current State | Action | New State | Weight Impact |
|--------------|--------|-----------|---------------|
| Not in loadout | addItemToLoadout | In loadout (not worn, not consumable) | +weight to total, +weight to base |
| In loadout | setItemWorn(true) | Worn | No change to total, -weight from base |
| Worn | setItemWorn(false) | Not worn | No change to total, +weight to base |
| In loadout | setItemConsumable(true) | Consumable | No change to total, -weight from base |
| Consumable | setItemConsumable(false) | Not consumable | No change to total, +weight to base |
| Any | removeItemFromLoadout | Not in loadout | -weight from total, -weight from base |

### Edge Cases

1. **Item marked as both worn AND consumable**: Weight excluded from base weight only once
2. **Item removed from loadout**: Its LoadoutItemState entry should also be removed
3. **New loadout created**: itemStates array starts empty
4. **GearItem deleted**: Remove from all loadouts' itemIds AND itemStates

---

## Migration Strategy

When loading existing data from localStorage:

```typescript
// In useStore.ts persist migration

// If loadout has no itemStates, initialize as empty array
if (!loadout.itemStates) {
  loadout.itemStates = [];
}

// If loadout has no description, set to null
if (loadout.description === undefined) {
  loadout.description = null;
}
```

This ensures backward compatibility with existing saved loadouts.
