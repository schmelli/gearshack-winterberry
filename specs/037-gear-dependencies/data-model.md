# Data Model: Smart Gear Dependencies

**Feature Branch**: `037-gear-dependencies`
**Date**: 2025-12-09

## Entity Changes

### GearItem (Extended)

The existing `GearItem` interface is extended with a new field for dependency tracking.

```typescript
// types/gear.ts

export interface GearItem {
  // === Identity ===
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // === Section 1: General Info ===
  name: string;
  brand: string | null;
  description: string | null;
  brandUrl: string | null;
  modelNumber: string | null;
  productUrl: string | null;

  // === Section 2: Classification ===
  categoryId: string | null;
  subcategoryId: string | null;
  productTypeId: string | null;

  // === Section 3: Weight & Specifications ===
  weightGrams: number | null;
  weightDisplayUnit: WeightUnit;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;

  // === Section 4: Purchase Details ===
  pricePaid: number | null;
  currency: string | null;
  purchaseDate: Date | null;
  retailer: string | null;
  retailerUrl: string | null;

  // === Section 5: Media ===
  primaryImageUrl: string | null;
  galleryImageUrls: string[];
  nobgImages?: NobgImages;

  // === Section 6: Status & Condition ===
  condition: GearCondition;
  status: GearStatus;
  notes: string | null;

  // === Section 7: Dependencies (NEW - Feature 037) ===
  /**
   * Array of GearItem IDs that this item depends on.
   * Example: Packraft depends on ["paddleId", "pfdId"]
   */
  dependencyIds: string[];
}
```

### GearItemFormData (Extended)

```typescript
// types/gear.ts

export interface GearItemFormData {
  // ... existing fields ...

  // === Section 7: Dependencies (NEW - Feature 037) ===
  /** Array of GearItem IDs selected as dependencies */
  dependencyIds: string[];
}
```

### Default Form Values (Updated)

```typescript
// types/gear.ts

export const DEFAULT_GEAR_ITEM_FORM: GearItemFormData = {
  // ... existing defaults ...
  dependencyIds: [],  // NEW
};
```

---

## Firestore Schema

### Collection: `userBase/{userId}/gearInventory`

```json
{
  "id": "abc123xyz789",
  "name": "Packraft",
  "brand": "Alpacka",

  // ... existing fields (snake_case) ...

  "dependency_ids": ["paddleId456", "pfdId789"],  // NEW field

  "created_at": "2025-12-09T10:00:00Z",
  "updated_at": "2025-12-09T10:00:00Z"
}
```

### Field Mapping (Adapter)

| TypeScript (camelCase) | Firestore (snake_case) | Type |
|------------------------|------------------------|------|
| `dependencyIds` | `dependency_ids` | `string[]` |

---

## Validation Schema (Zod)

```typescript
// lib/validations/gear-schema.ts

import { z } from 'zod';

export const GearItemSchema = z.object({
  // ... existing fields ...

  // Dependencies validation (Feature 037)
  dependencyIds: z.array(z.string()).default([]),
});

// Validation rules:
// - Array of strings (gear item IDs)
// - Defaults to empty array if not provided
// - No self-references (validated at application layer)
// - No circular references (validated at application layer)
```

---

## Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                        GearItem                             │
├─────────────────────────────────────────────────────────────┤
│  id: string (PK)                                           │
│  dependencyIds: string[] (FK references GearItem.id)       │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
           │
           │ 1:N (one item can have many dependencies)
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                   GearItem (as dependency)                  │
├─────────────────────────────────────────────────────────────┤
│  id: string (PK)                                           │
│  (same item can be dependency of multiple parents)          │
└─────────────────────────────────────────────────────────────┘
```

### Relationship Rules

1. **One-to-Many**: One GearItem can have multiple dependencies
2. **Many-to-One**: One GearItem can be a dependency of multiple parents
3. **Bidirectional Navigation**: Not supported (only parent→child)
4. **Self-Reference**: Not allowed (item cannot depend on itself)
5. **Circular Reference**: Not allowed (A→B→A is invalid)
6. **Transitive**: Dependencies of dependencies are included in loadout prompts

---

## State Transitions

### Dependency Link Lifecycle

```
┌──────────────┐
│   No Link    │
└──────────────┘
       │
       │ User adds dependency in Gear Editor
       ▼
┌──────────────┐
│   Linked     │ ◄── Stored in dependencyIds[]
└──────────────┘
       │
       │ User removes dependency OR dependency item deleted
       ▼
┌──────────────┐
│   Unlinked   │ ◄── Removed from dependencyIds[]
└──────────────┘
```

### Loadout Dependency Detection Flow

```
┌──────────────────────┐
│ User adds item to    │
│ loadout              │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│ Check item.          │
│ dependencyIds        │
└──────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐   ┌────────────┐
│ Empty  │   │ Has deps   │
└────────┘   └────────────┘
    │              │
    │              ▼
    │        ┌────────────────┐
    │        │ Resolve        │
    │        │ transitive     │
    │        │ dependencies   │
    │        └────────────────┘
    │              │
    │              ▼
    │        ┌────────────────┐
    │        │ Filter out     │
    │        │ already in     │
    │        │ loadout        │
    │        └────────────────┘
    │              │
    │       ┌──────┴──────┐
    │       │             │
    │       ▼             ▼
    │  ┌────────┐   ┌────────────┐
    │  │ None   │   │ Missing    │
    │  │ missing│   │ deps exist │
    │  └────────┘   └────────────┘
    │       │             │
    │       │             ▼
    │       │       ┌────────────┐
    │       │       │ Show modal │
    │       │       │ with       │
    │       │       │ options    │
    │       │       └────────────┘
    │       │             │
    │       │    ┌────────┼────────┐
    │       │    │        │        │
    │       │    ▼        ▼        ▼
    │       │ ┌──────┐ ┌──────┐ ┌──────┐
    │       │ │Add   │ │Select│ │Skip  │
    │       │ │All   │ │Some  │ │      │
    │       │ └──────┘ └──────┘ └──────┘
    │       │    │        │        │
    │       │    ▼        ▼        │
    │       │  ┌────────────┐      │
    │       │  │ Add to     │      │
    │       │  │ loadout    │      │
    │       │  └────────────┘      │
    │       │        │             │
    └───────┴────────┴─────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │ Item(s) added    │
          │ to loadout       │
          └──────────────────┘
```

---

## Data Integrity Rules

### Validation Constraints

| Constraint | Enforcement | Error Message |
|------------|-------------|---------------|
| No self-reference | Application layer (Gear Editor) | "An item cannot depend on itself" |
| No circular reference | Application layer (Gear Editor) | "This would create a circular dependency" |
| Valid item IDs | Application layer (on read) | Silent removal + toast notification |
| Max dependencies | None (unlimited per clarification) | N/A |

### Referential Integrity

**On Delete (GearItem)**:
- Dependents: Keep broken references, clean up lazily on read
- Parents: No action needed (array contains deleted ID until cleaned)

**Cleanup Strategy**:
```typescript
// When loading item for edit, filter invalid dependencies
const validDependencyIds = item.dependencyIds.filter(
  id => allItemsMap.has(id)
);
if (validDependencyIds.length !== item.dependencyIds.length) {
  toast.info('Some linked accessories no longer exist');
  // Optionally auto-save cleaned array
}
```

---

## Migration Notes

### Backward Compatibility

- **Existing documents**: Field `dependency_ids` will be undefined
- **Default handling**: Treat undefined/null as empty array `[]`
- **No data migration required**: Feature is additive

### Adapter Changes

```typescript
// lib/firebase/adapter.ts - transformGearItemFromFirestore

// Add to field mapping:
dependencyIds: resolveField<string[]>(doc, 'dependencyIds', 'dependency_ids', []),
```

```typescript
// lib/firebase/adapter.ts - prepareGearItemForFirestore

// Add to output:
dependency_ids: item.dependencyIds ?? [],
```
