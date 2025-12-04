# Research: Inventory Gallery

**Feature**: 002-inventory-gallery
**Date**: 2025-12-04

## Research Topics

### 1. CSS Grid Responsive Layout Pattern

**Decision**: Use CSS Grid with Tailwind's grid utilities and auto-fill/minmax for responsive columns.

**Rationale**:
- Tailwind CSS 4 provides excellent grid support
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` pattern is simple and predictable
- Alternative: CSS Grid with `auto-fill` and `minmax()` for more fluid behavior
- Constitution requires Tailwind-only styling

**Implementation**:
```css
/* Tailwind classes for responsive grid */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4
```

**Alternatives Considered**:
- Flexbox with wrap: Less control over column count
- CSS Container Queries: Overkill for this use case
- Masonry layout: Not needed, cards have consistent height

---

### 2. View Density State Management

**Decision**: Use React useState in useInventory hook with session persistence via sessionStorage.

**Rationale**:
- Simple state that only affects display, not data
- Session storage sufficient per spec assumptions
- No need for global state (Zustand/Context) for single-page feature
- Constitution requires logic in hooks

**Implementation**:
```typescript
type ViewDensity = 'compact' | 'standard' | 'detailed';

// In useInventory hook
const [viewDensity, setViewDensity] = useState<ViewDensity>(() => {
  if (typeof window !== 'undefined') {
    return (sessionStorage.getItem('viewDensity') as ViewDensity) || 'standard';
  }
  return 'standard';
});
```

**Alternatives Considered**:
- URL query params: Unnecessary complexity for view preference
- localStorage: Spec says session-only is fine
- Context: Overkill for single-component tree

---

### 3. Client-Side Filtering Pattern

**Decision**: Use useMemo with filter callbacks in useInventory hook.

**Rationale**:
- Pure client-side operation
- useMemo prevents recalculation on unrelated state changes
- Simple filter predicates are easy to compose
- Constitution requires logic in hooks

**Implementation**:
```typescript
const filteredItems = useMemo(() => {
  return items.filter(item => {
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !categoryFilter ||
      item.categoryId === categoryFilter;

    return matchesSearch && matchesCategory;
  });
}, [items, searchQuery, categoryFilter]);
```

**Alternatives Considered**:
- External library (fuse.js): Overkill for simple contains search
- Web Worker: Not needed for 10-15 items
- Debounced search: Could add later if performance issues

---

### 4. Category Placeholder Icons

**Decision**: Map category IDs to lucide-react icons with a fallback default.

**Rationale**:
- lucide-react already in project per constitution
- Simple mapping object is maintainable
- Fallback icon handles edge cases

**Implementation**:
```typescript
import { Tent, Moon, Backpack, Shirt, Flame, Droplet, Zap, Compass, Heart, Bath, Package } from 'lucide-react';

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

const DEFAULT_ICON = Package;
```

**Alternatives Considered**:
- SVG sprites: More complex build setup
- Image placeholders: Requires asset management
- CSS-only placeholder: Less visually meaningful

---

### 5. Weight Display Formatting

**Decision**: Reuse existing formatWeight from lib/gear-utils.ts, extend to handle kg display.

**Rationale**:
- DRY principle - weight formatting already exists
- Simple extension: g for < 1000g, kg for >= 1000g
- Spec requirement: FR-017

**Implementation**:
```typescript
// Extend existing formatWeight or create new display function
export function formatWeightForDisplay(grams: number | null): string {
  if (grams === null) return '—';
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${Math.round(grams)} g`;
}
```

**Alternatives Considered**:
- Always show in original unit: User chose unit in editor, but gallery should be consistent
- Intl.NumberFormat: Overkill for weight

---

### 6. Mock Data Generation

**Decision**: Create MOCK_GEAR_ITEMS array in useInventory hook covering all 11 categories.

**Rationale**:
- Spec requires 10-15 items across multiple categories
- Realistic data enables proper testing of filtering
- Keep in hook file for MVP, extract to data/ folder later

**Implementation**:
- Generate 12-15 items covering: Shelter, Sleep System, Packs, Clothing, Cooking, Water, Electronics, Navigation, First Aid, Toiletries, Miscellaneous
- Include variety: some with images, some without, different statuses
- Use realistic brands and weights

**Alternatives Considered**:
- faker.js: External dependency, unnecessary for fixed mock data
- JSON file: Would work, but hook file is simpler for MVP

---

### 7. Card Component Structure

**Decision**: Single GearCard component with viewDensity prop controlling conditional rendering.

**Rationale**:
- Constitution requires stateless UI components
- Single component with props is simpler than 3 separate components
- Conditional rendering based on density mode

**Implementation**:
```tsx
interface GearCardProps {
  item: GearItem;
  viewDensity: ViewDensity;
}

export function GearCard({ item, viewDensity }: GearCardProps) {
  return (
    <Card>
      <CardImage />
      <CardContent>
        {/* Always show */}
        <Brand /><Name />

        {/* Standard+ */}
        {viewDensity !== 'compact' && (
          <>
            <Category /><Weight /><Status />
          </>
        )}

        {/* Detailed only */}
        {viewDensity === 'detailed' && <Notes />}
      </CardContent>
      <EditButton />
    </Card>
  );
}
```

**Alternatives Considered**:
- Separate CompactCard, StandardCard, DetailedCard: More duplication
- Render props pattern: Overkill for 3 fixed modes
- CSS-only show/hide: Less control, still ships all content

---

## Dependencies on Sprint 1

| Artifact | Location | Usage |
|----------|----------|-------|
| GearItem type | types/gear.ts | Data structure for cards |
| taxonomy-data.json | lib/taxonomy/taxonomy-data.json | Category filter options |
| taxonomy-utils.ts | lib/taxonomy/taxonomy-utils.ts | getCategoryLabel() for display |
| gear-utils.ts | lib/gear-utils.ts | Weight formatting base |
| shadcn Card | components/ui/card.tsx | Card UI component |
| shadcn Select | components/ui/select.tsx | Category filter dropdown |
| shadcn Input | components/ui/input.tsx | Search text input |
| shadcn Button | components/ui/button.tsx | Edit button, view toggle |
| Edit page route | app/inventory/[id]/edit | Card edit button links here |

---

## Resolved Clarifications

No NEEDS CLARIFICATION items in technical context - all decisions made based on:
1. Constitution requirements
2. Existing Sprint 1 patterns
3. Standard React/Next.js best practices
