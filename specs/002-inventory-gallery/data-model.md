# Data Model: Inventory Gallery

**Feature**: 002-inventory-gallery
**Date**: 2025-12-04

## Overview

This feature reuses the existing GearItem type from Sprint 1 and adds supporting types for view state management. No new persistent entities are created.

## Existing Types (Reused)

### GearItem (from types/gear.ts)

```typescript
interface GearItem {
  // Identity
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // General Info
  name: string;
  brand: string | null;
  brandUrl: string | null;
  modelNumber: string | null;
  productUrl: string | null;

  // Classification
  categoryId: string | null;
  subcategoryId: string | null;
  productTypeId: string | null;

  // Weight & Specifications
  weightGrams: number | null;
  weightDisplayUnit: WeightUnit;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;

  // Purchase Details
  pricePaid: number | null;
  currency: string | null;
  purchaseDate: Date | null;
  retailer: string | null;
  retailerUrl: string | null;

  // Media
  primaryImageUrl: string | null;
  galleryImageUrls: string[];

  // Status & Condition
  condition: GearCondition;
  status: GearStatus;
  notes: string | null;
}
```

**Gallery Usage**:
- `id` → Card key, edit link
- `name` → Card title (all densities)
- `brand` → Card subtitle (all densities)
- `categoryId` → Filter matching, placeholder icon selection
- `weightGrams` → Weight display (Standard+)
- `status` → Status badge (Standard+)
- `primaryImageUrl` → Card image
- `notes` → Notes snippet (Detailed only)

---

## New Types (for this feature)

### ViewDensity

```typescript
/**
 * Controls how much information is displayed on each gear card.
 *
 * - compact: Image, Brand, Name only (minimal, quick scanning)
 * - standard: + Category, Weight, Status Badge (default, balanced view)
 * - detailed: + Notes snippet (maximum information)
 */
type ViewDensity = 'compact' | 'standard' | 'detailed';
```

**UI Labels**:
```typescript
const VIEW_DENSITY_LABELS: Record<ViewDensity, string> = {
  compact: 'Compact',
  standard: 'Standard',
  detailed: 'Detailed',
};
```

---

### FilterState

```typescript
/**
 * Current filter/search state for the inventory gallery.
 * Used internally by useInventory hook.
 */
interface FilterState {
  /** Text search query (filters name and brand) */
  searchQuery: string;

  /** Selected category ID for filtering (null = all categories) */
  categoryFilter: string | null;
}
```

**Default State**:
```typescript
const DEFAULT_FILTER_STATE: FilterState = {
  searchQuery: '',
  categoryFilter: null,
};
```

---

### UseInventoryReturn

```typescript
/**
 * Return type for the useInventory hook.
 * Provides all state and actions needed by the gallery UI.
 */
interface UseInventoryReturn {
  // Data
  items: GearItem[];
  filteredItems: GearItem[];
  isLoading: boolean;

  // View Density
  viewDensity: ViewDensity;
  setViewDensity: (density: ViewDensity) => void;

  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string | null;
  setCategoryFilter: (categoryId: string | null) => void;
  clearFilters: () => void;

  // Derived State
  hasActiveFilters: boolean;
  itemCount: number;
  filteredCount: number;
}
```

---

### GearCardProps

```typescript
/**
 * Props for the GearCard component.
 * Component is stateless per constitution.
 */
interface GearCardProps {
  /** The gear item to display */
  item: GearItem;

  /** Current view density mode */
  viewDensity: ViewDensity;
}
```

---

### GalleryToolbarProps

```typescript
/**
 * Props for the GalleryToolbar component.
 * Contains search, filter, and view controls.
 */
interface GalleryToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Category Filter
  categoryFilter: string | null;
  onCategoryChange: (categoryId: string | null) => void;

  // View Density
  viewDensity: ViewDensity;
  onViewDensityChange: (density: ViewDensity) => void;

  // Clear
  hasActiveFilters: boolean;
  onClearFilters: () => void;

  // Stats
  itemCount: number;
  filteredCount: number;
}
```

---

### CategoryPlaceholderProps

```typescript
/**
 * Props for the CategoryPlaceholder component.
 * Displays an icon based on gear category.
 */
interface CategoryPlaceholderProps {
  /** Category ID to determine icon */
  categoryId: string | null;

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Additional CSS classes */
  className?: string;
}
```

---

## Category Icon Mapping

```typescript
import type { LucideIcon } from 'lucide-react';
import {
  Tent,
  Moon,
  Backpack,
  Shirt,
  Flame,
  Droplet,
  Zap,
  Compass,
  Heart,
  Bath,
  Package,
} from 'lucide-react';

/**
 * Maps category IDs to their corresponding icons.
 * Based on taxonomy-data.json categories.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'shelter': Tent,
  'sleep-system': Moon,
  'packs': Backpack,
  'clothing': Shirt,
  'cooking': Flame,
  'water': Droplet,
  'electronics': Zap,
  'navigation': Compass,
  'first-aid': Heart,
  'toiletries': Bath,
  'miscellaneous': Package,
};

const DEFAULT_CATEGORY_ICON = Package;
```

---

## File Organization

| Type | File Path | Notes |
|------|-----------|-------|
| ViewDensity | types/inventory.ts | New file |
| FilterState | types/inventory.ts | New file |
| UseInventoryReturn | types/inventory.ts | New file |
| GearCardProps | components/inventory-gallery/GearCard.tsx | Co-located |
| GalleryToolbarProps | components/inventory-gallery/GalleryToolbar.tsx | Co-located |
| CategoryPlaceholderProps | components/inventory-gallery/CategoryPlaceholder.tsx | Co-located |
| CATEGORY_ICONS | components/inventory-gallery/CategoryPlaceholder.tsx | Co-located |
| VIEW_DENSITY_LABELS | types/inventory.ts | Export for UI |

---

## Validation

No Zod schemas needed for this feature:
- ViewDensity is a simple union type
- FilterState is internal hook state
- No user input beyond text search (no complex validation needed)
- GearItem already has validation from Sprint 1
