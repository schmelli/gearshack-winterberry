# Research: Grand Polish Sprint

**Feature**: 007-grand-polish-sprint
**Date**: 2025-12-05
**Status**: Complete

## Research Tasks

### 1. Base Weight Calculation Pattern

**Context**: The ultralight backpacking community uses "Base Weight" as the key metric - total pack weight minus worn items and consumables.

**Decision**: Implement per-loadout item state tracking with `isWorn` and `isConsumable` flags.

**Rationale**:
- Base Weight = Total Weight - (Worn Weight + Consumable Weight)
- Items can be marked as both worn AND consumable (rare edge case, e.g., edible clothing - should still only be excluded once)
- State stored per loadout (same item might be worn in one loadout, packed in another)

**Implementation Pattern**:
```typescript
// types/loadout.ts
interface LoadoutItemState {
  itemId: string;
  isWorn: boolean;      // Clothing, shoes, watch, etc.
  isConsumable: boolean; // Food, fuel, water, etc.
}

// Weight calculation
const baseWeight = items.reduce((sum, item) => {
  const state = itemStates.find(s => s.itemId === item.id);
  const isExcluded = state?.isWorn || state?.isConsumable;
  return isExcluded ? sum : sum + (item.weightGrams ?? 0);
}, 0);
```

**Alternatives Considered**:
- **Global item flags**: Rejected - same item might be worn in one loadout but packed in another
- **Separate worn/consumable arrays**: Rejected - more complex state management, same outcome
- **Category-based auto-detection**: Rejected - user needs control (e.g., bringing extra shoes)

---

### 2. Layout Container Pattern

**Context**: Content currently hugs the left edge on wide screens. Need centered max-width container.

**Decision**: Wrap children in layout.tsx with centered container.

**Rationale**:
- `max-w-7xl` (1280px) matches spec requirement
- `container mx-auto` handles centering
- `px-4 sm:px-6` provides responsive padding
- Applied at layout level ensures consistency across all pages

**Implementation Pattern**:
```tsx
// app/layout.tsx
<main className="flex-1">
  <div className="container mx-auto max-w-7xl px-4 sm:px-6">
    {children}
  </div>
</main>
```

**Alternatives Considered**:
- **Per-page containers**: Rejected - inconsistent, easy to forget
- **CSS-in-JS global styles**: Rejected - violates Tailwind-only constraint
- **Tailwind @apply in globals.css**: Rejected - unnecessary complexity for simple wrapper

---

### 3. Header Redesign Pattern

**Context**: Header needs to be taller (h-24 = 96px), logo 2x larger, nav right-aligned.

**Decision**: Modify SiteHeader.tsx with updated dimensions and flex layout.

**Rationale**:
- `h-24` provides 96px height as specified
- Logo container: `h-20 w-20` (80px) for 2x increase from current h-10/w-10
- Title: `text-3xl` for 2x increase from current text-xl
- Navigation: Move to `ml-auto` flex group with right-side items

**Implementation Pattern**:
```tsx
<header className="h-24 ...">
  <Link className="flex items-center gap-4">
    <div className="h-20 w-20 ...">
      <Image width={80} height={80} ... />
    </div>
    <span className="text-3xl ...">Gearshack</span>
  </Link>

  {/* Nav + notifications + user menu all on right */}
  <div className="ml-auto flex items-center gap-6">
    <nav className="hidden md:flex gap-6">...</nav>
    <Button>...</Button>
    <UserMenu />
  </div>
</header>
```

**Logo Background Fix**:
- Current logo is at `/logos/small_gearshack_logo.png`
- Will check if transparent; if white background, either:
  - Remove bg-primary/10 container to let logo blend with header
  - Or use `mix-blend-multiply` to blend white into background

---

### 4. Footer 4-Column Layout

**Context**: Need 4-column footer with Logo/About, Features, Resources, Connect sections.

**Decision**: Rebuild SiteFooter.tsx with 4-column grid and dark stone background.

**Rationale**:
- `grid-cols-1 md:grid-cols-4` for responsive columns
- `bg-zinc-900` or `bg-slate-900` for "dark stone" appearance
- Placeholder content acceptable per spec assumptions

**Implementation Pattern**:
```tsx
<footer className="bg-zinc-900 text-zinc-300">
  <div className="container mx-auto max-w-7xl px-4 py-12">
    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
      {/* Column 1: Logo + About */}
      {/* Column 2: Features */}
      {/* Column 3: Resources */}
      {/* Column 4: Connect */}
    </div>
  </div>
</footer>
```

---

### 5. Universal Card Click Pattern

**Context**: Cards should open detail modal when body is clicked, but action buttons should not trigger modal.

**Decision**: Wrap card in clickable container, use `stopPropagation` on action buttons.

**Rationale**:
- Already implemented in LoadoutPicker - extend pattern to GearCard and LoadoutList
- `onClick` on card container, `e.stopPropagation()` on buttons
- Maintains accessibility with proper keyboard handlers

**Implementation Pattern**:
```tsx
<div
  role="button"
  tabIndex={0}
  onClick={() => openDetailModal(item)}
  onKeyDown={(e) => e.key === 'Enter' && openDetailModal(item)}
>
  <Card>
    ...
    <Button onClick={(e) => { e.stopPropagation(); handleAction(); }}>
      Action
    </Button>
  </Card>
</div>
```

---

### 6. Loadout Search/Filter

**Context**: Loadouts dashboard needs search by name and filter by season.

**Decision**: Create `useLoadoutSearch` hook with client-side filtering.

**Rationale**:
- No backend, all data in zustand store
- Real-time filtering as user types
- Season filter uses existing Season type

**Implementation Pattern**:
```typescript
// hooks/useLoadoutSearch.ts
function useLoadoutSearch() {
  const loadouts = useStore(state => state.loadouts);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<Season | null>(null);

  const filteredLoadouts = useMemo(() => {
    return loadouts.filter(loadout => {
      const matchesSearch = loadout.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeason = !seasonFilter || loadout.seasons?.includes(seasonFilter);
      return matchesSearch && matchesSeason;
    });
  }, [loadouts, searchQuery, seasonFilter]);

  return { filteredLoadouts, searchQuery, setSearchQuery, seasonFilter, setSeasonFilter };
}
```

---

### 7. Animation Approach

**Context**: Dialogs and Sheets need smooth animations.

**Decision**: Rely on existing shadcn/ui animations (already present).

**Rationale**:
- shadcn/ui Dialog and Sheet components already have CSS animations
- Radix UI primitives handle enter/exit animations
- No need for framer-motion dependency
- Check and ensure `data-[state=open]` and `data-[state=closed]` transitions are present

**Existing Animations** (verified in shadcn/ui components):
- Dialog: fade in/out overlay, scale content
- Sheet: slide in/out from specified side

---

### 8. Loadout Metadata Sheet

**Context**: Need ability to edit loadout name, description, season, trip date.

**Decision**: Create `LoadoutMetadataSheet` component using existing Sheet component.

**Rationale**:
- Sheet provides mobile-friendly drawer experience
- Form with controlled inputs for each field
- Extends existing `updateLoadout` store action

**New Fields Needed**:
- `description: string | null` - Add to Loadout interface
- Existing: name, tripDate, seasons

---

## Summary of Decisions

| Area | Decision | New Files |
|------|----------|-----------|
| Weight Calculation | Per-loadout item state with isWorn/isConsumable | None (extend types) |
| Layout Centering | container wrapper in layout.tsx | None (modify layout) |
| Header Redesign | h-24, 2x logo, right-aligned nav | None (modify SiteHeader) |
| Footer Redesign | 4-column grid, dark stone bg | None (modify SiteFooter) |
| Card Interactions | Click card → modal, stopPropagation on buttons | None (modify cards) |
| Loadout Search | useLoadoutSearch hook | hooks/useLoadoutSearch.ts |
| Animations | Use existing shadcn/ui animations | None |
| Metadata Edit | LoadoutMetadataSheet | components/loadouts/LoadoutMetadataSheet.tsx |

**No NEEDS CLARIFICATION items remain.**
