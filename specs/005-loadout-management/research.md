# Research: Loadout Management

**Feature**: 005-loadout-management
**Date**: 2025-12-05

## Decision 1: State Management Library

**Decision**: Use `zustand` with persist middleware

**Rationale**:
- Built-in persist middleware for localStorage synchronization (FR-002)
- Simpler API than Redux or Context + useReducer
- No boilerplate, no providers needed at app root
- Excellent TypeScript support
- DevTools available via middleware
- Small bundle size (~1KB gzipped)

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| React Context + useReducer | No built-in persistence, more boilerplate, re-render issues |
| Redux Toolkit | Overkill for client-only app, larger bundle |
| Jotai | Atomic model less suited for this use case with related entities |
| localStorage directly | No reactivity, manual sync required |

**Implementation Pattern**:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreState {
  items: GearItem[];
  loadouts: Loadout[];
  addItem: (item: GearItem) => void;
  // ... other actions
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      items: [],
      loadouts: [],
      addItem: (item) => set((state) => ({
        items: [...state.items, item]
      })),
    }),
    { name: 'gearshack-store' }
  )
);
```

---

## Decision 2: Chart Library

**Decision**: Use `recharts` for donut chart visualization

**Rationale**:
- React-native library with declarative components
- PieChart component supports donut configuration (innerRadius prop)
- CSS variable support for theming via fill prop
- Responsive container built-in
- Tooltip support for hover interactions (FR-023)
- Tree-shakeable imports

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Chart.js + react-chartjs-2 | Imperative API, harder to theme with CSS variables |
| Victory | Larger bundle, more complex API |
| Nivo | Heavier, more features than needed |
| D3 directly | Too low-level for simple donut chart |
| Canvas-based | Accessibility concerns, harder to style |

**Implementation Pattern**:
```typescript
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Use CSS variables for colors
const CHART_COLORS = [
  'var(--chart-1)', // Forest green
  'var(--chart-2)', // Terracotta
  'var(--chart-3)', // Blue
  'var(--chart-4)', // Yellow
  'var(--chart-5)', // Orange
];
```

---

## Decision 3: Weight Threshold Color Coding

**Decision**: Use industry-standard backpacking weight categories

**Rationale**:
- Ultralight: < 4.5kg (10 lbs) - Base weight target for ultralight backpackers
- Moderate: 4.5kg - 9kg (10-20 lbs) - Traditional lightweight range
- Heavy: > 9kg (20 lbs) - Comfort-focused or winter gear

**Color Mapping**:
| Category | Weight Range | Color | CSS Variable |
|----------|--------------|-------|--------------|
| Ultralight | < 4,500g | Green | `--primary` (forest green) |
| Moderate | 4,500g - 9,000g | Amber | `--accent` (terracotta) |
| Heavy | > 9,000g | Red | `--destructive` |

**Implementation**:
```typescript
export const WEIGHT_THRESHOLDS = {
  ULTRALIGHT_MAX: 4500, // grams
  MODERATE_MAX: 9000,   // grams
} as const;

export function getWeightCategory(weightGrams: number): 'ultralight' | 'moderate' | 'heavy' {
  if (weightGrams < WEIGHT_THRESHOLDS.ULTRALIGHT_MAX) return 'ultralight';
  if (weightGrams < WEIGHT_THRESHOLDS.MODERATE_MAX) return 'moderate';
  return 'heavy';
}
```

---

## Decision 4: Store Structure

**Decision**: Unified store with items and loadouts as top-level arrays

**Rationale**:
- Simple flat structure avoids nesting complexity
- Loadouts reference items by ID (not embedded copies)
- Single source of truth for all gear data
- Easy to migrate existing mock data

**Store Shape**:
```typescript
interface GearshackStore {
  // Data
  items: GearItem[];
  loadouts: Loadout[];

  // Item Actions
  addItem: (item: Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateItem: (id: string, updates: Partial<GearItem>) => void;
  deleteItem: (id: string) => void;

  // Loadout Actions
  createLoadout: (name: string, tripDate?: Date) => string;
  updateLoadout: (id: string, updates: Partial<Loadout>) => void;
  deleteLoadout: (id: string) => void;
  addItemToLoadout: (loadoutId: string, itemId: string) => void;
  removeItemFromLoadout: (loadoutId: string, itemId: string) => void;

  // Selectors (computed via hooks)
  getLoadoutItems: (loadoutId: string) => GearItem[];
  getLoadoutWeight: (loadoutId: string) => number;
}
```

---

## Decision 5: Loadout-Item Relationship

**Decision**: Many-to-many via itemIds array in Loadout

**Rationale**:
- An item can belong to multiple loadouts (realistic - same tent for different trips)
- Loadout stores array of item IDs, not copies of items
- Deleting an item from inventory removes it from all loadouts
- No quantity field in v1 (each item appears once per loadout max)

**Data Flow**:
```
Loadout { id, name, itemIds: string[] }
         ↓ (lookup)
GearItem { id, name, weightGrams, categoryId, ... }
         ↓ (aggregate)
CategoryWeight { categoryId, totalWeight, itemCount }
```

---

## Decision 6: Mock Data Migration

**Decision**: Initialize store from existing MOCK_GEAR_ITEMS on first load

**Rationale**:
- Existing useInventory.ts has 15 mock items
- On first store initialization (no localStorage), seed with mock data
- Subsequent loads use persisted data from localStorage
- Provides immediate demo data for users

**Migration Strategy**:
1. Check if localStorage has existing store
2. If empty, initialize with MOCK_GEAR_ITEMS
3. Migrate useInventory to read from store instead of hardcoded array
4. Update useGearEditor to write to store

---

## Decision 7: Component Architecture

**Decision**: Stateless presentational components with hook-based logic

**Components** (all stateless, receive data via props):
- `LoadoutCard` - Renders single loadout card with mini donut
- `LoadoutList` - Renders items grouped by category
- `LoadoutPicker` - Renders searchable item list
- `WeightBar` - Renders sticky weight display
- `WeightDonut` - Renders recharts PieChart

**Hooks** (all business logic):
- `useStore` - Global state access
- `useLoadoutEditor` - Edit state, search, add/remove actions
- `useWeightCalculations` - Derived weight/category data

This follows Constitution Principle I (Feature-Sliced Light Architecture).

---

## Decision 8: Responsive Layout Strategy

**Decision**: CSS Grid with Tailwind breakpoints

**Layout**:
- Desktop (≥768px): Two-column grid - List (60%) | Picker (40%)
- Mobile (<768px): Single column stack - List above, Picker below

**Implementation**:
```tsx
<div className="grid gap-6 md:grid-cols-[3fr_2fr]">
  <LoadoutList ... />
  <LoadoutPicker ... />
</div>
```

**Sticky Weight Bar**:
- Fixed position at bottom of viewport
- Full width on mobile
- Contained within editor area on desktop
- z-index above content, below modals
