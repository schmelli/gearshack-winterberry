# Research: Grand Visual Polish Sprint

**Feature**: 009-grand-visual-polish
**Date**: 2025-12-05
**Purpose**: Resolve technical unknowns and document best practices for implementation

## Research Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Typography System | Use Geist/Inter for all headings, Rock Salt for logo only | Consistent professional appearance |
| Header Background | emerald-50 with 90% opacity | Nature vibe alignment, maintains backdrop-blur |
| Column Layout | CSS Grid with `order` property | Clean swap without DOM restructuring |
| Sticky Positioning | top-28 (112px) for header clearance | Account for h-24 header + 16px buffer |
| Activity Matrix | Static config object in lib/loadout-utils.ts | No database needed, simple lookup |
| Inline Editing | Expandable panel pattern | Lighter than modal, maintains context |

---

## 1. Typography Audit

### Current Rock Salt Usage

Found via codebase grep:

| File | Line | Usage | Action |
|------|------|-------|--------|
| `components/layout/SiteHeader.tsx` | 50 | Logo "Gearshack" | ✅ KEEP |
| `components/layout/MobileNav.tsx` | 53 | Mobile logo "Gearshack" | ✅ KEEP |
| `app/login/page.tsx` | 83 | Login page logo | ✅ KEEP |
| `components/loadouts/LoadoutHeader.tsx` | 129 | Loadout title H1 | ❌ REMOVE |

### Decision
- **Keep Rock Salt** only for brand identity (logo text "Gearshack")
- **Remove Rock Salt** from all page headings including loadout names
- **Use default font-sans** (Geist/Inter) for all H1/H2 elements

### Implementation
```tsx
// BEFORE (LoadoutHeader.tsx:129)
<h1 className="font-[family-name:var(--font-rock-salt)] text-3xl leading-relaxed">

// AFTER
<h1 className="text-3xl font-bold leading-relaxed">
```

---

## 2. Header Background Color Research

### Current Header Style
```tsx
// SiteHeader.tsx:29
'sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60'
```

### Tailwind Emerald Palette
- `emerald-50`: Very light mint green (#ecfdf5)
- `emerald-100`: Light green (#d1fae5)
- `emerald-900`: Deep forest green (#064e3b)

### Decision
Use `bg-emerald-50/90` to:
1. Provide distinct nature-inspired header
2. Maintain transparency for backdrop-blur effect
3. Match the "light pastel green" spec requirement (FR-004)

### Implementation
```tsx
// BEFORE
'bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60'

// AFTER
'bg-emerald-50/90 backdrop-blur-md supports-[backdrop-filter]:bg-emerald-50/80'
```

### Dark Mode Consideration
In dark mode, emerald-50 would be too light. Options:
1. Use `dark:bg-emerald-900/90` for dark mode
2. Use CSS variables for theme-aware coloring

**Decision**: Use conditional classes `bg-emerald-50/90 dark:bg-emerald-900/90`

---

## 3. Loadout Editor Layout Research

### Current Layout (app/loadouts/[id]/page.tsx)
```tsx
<div className="grid gap-6 md:grid-cols-[2fr_3fr]">
  {/* Left: Picker */}
  <div className="hidden space-y-4 md:block">...</div>

  {/* Right: Loadout List (sticky) */}
  <div className="space-y-4 md:sticky md:top-24 md:self-start">...</div>
</div>
```

**Current behavior**: Picker LEFT, Loadout RIGHT

**Spec requirement** (FR-008, FR-009): Inventory Picker LEFT, Loadout Items RIGHT
- Wait... that's the current layout!

### Re-reading Spec
> FR-008: Loadout editor MUST display Inventory Picker in the LEFT column on desktop
> FR-009: Loadout editor MUST display Loadout Items list in the RIGHT column on desktop

Checking current code comments:
```tsx
// FR-002: Inventory picker on the left column on desktop
```

The spec from 006-ui-makeover already has this correct. Let me verify the actual rendered output...

Actually, looking at the grid column order:
- First child = Picker (left when 2fr)
- Second child = Loadout List (right when 3fr)

**Conclusion**: Layout is already correct! The visual polish spec may be based on outdated observation.

**Decision**: Verify current implementation matches spec. If already correct, mark as "no change needed."

### Sticky Positioning Adjustment
Current: `md:sticky md:top-24`
- top-24 = 96px = exactly header height

Better: `md:top-28` (112px) for small buffer below header

---

## 4. Activity Matrix Design

### Spec Requirements (FR-015-018)
- 4 progress bars: Weight, Comfort, Durability, Safety
- Each activity type has predefined priority values (0-100)
- Values update when activity selection changes
- Smooth CSS transitions

### Activity Types (from types/loadout.ts)
```typescript
export type ActivityType = 'hiking' | 'camping' | 'backpacking' | 'climbing' | 'skiing';
```

### Priority Matrix Design

| Activity | Weight | Comfort | Durability | Safety |
|----------|--------|---------|------------|--------|
| Hiking | 70 | 60 | 50 | 40 |
| Camping | 30 | 90 | 60 | 50 |
| Backpacking | 90 | 50 | 70 | 60 |
| Climbing | 60 | 40 | 90 | 95 |
| Skiing | 50 | 70 | 80 | 90 |

### Data Structure
```typescript
// lib/loadout-utils.ts
export const ACTIVITY_PRIORITY_MATRIX: Record<ActivityType, {
  weight: number;
  comfort: number;
  durability: number;
  safety: number;
}> = {
  hiking: { weight: 70, comfort: 60, durability: 50, safety: 40 },
  camping: { weight: 30, comfort: 90, durability: 60, safety: 50 },
  backpacking: { weight: 90, comfort: 50, durability: 70, safety: 60 },
  climbing: { weight: 60, comfort: 40, durability: 90, safety: 95 },
  skiing: { weight: 50, comfort: 70, durability: 80, safety: 90 },
};
```

### Component Structure
```tsx
// components/loadouts/ActivityMatrix.tsx
interface ActivityMatrixProps {
  activityTypes: ActivityType[];
}

function ActivityMatrix({ activityTypes }: ActivityMatrixProps) {
  // Calculate average priorities across selected activities
  // Display 4 progress bars
}
```

### Alternatives Considered
1. **Per-activity separate display**: Rejected - too cluttered
2. **Radar chart**: Rejected - harder to read at small sizes
3. **Single activity only**: Rejected - users often select multiple activities

**Decision**: Average priorities across selected activities, display as 4 horizontal progress bars

---

## 5. Inline Editing Pattern

### Current Modal Pattern (LoadoutMetadataSheet.tsx)
- Opens full Sheet component
- Form with name, description, season, tripDate
- Save/Cancel buttons

### Inline Editing Requirements (FR-014)
> Description editing MUST be inline (expandable panel or in-place edit) without modal

### Pattern Options

#### Option A: Collapsible Panel
```tsx
<Collapsible>
  <CollapsibleTrigger>Edit Details</CollapsibleTrigger>
  <CollapsibleContent>
    <textarea ... />
    <Button>Save</Button>
  </CollapsibleContent>
</Collapsible>
```

#### Option B: In-Place Edit (Click to Edit)
```tsx
{isEditing ? (
  <textarea value={description} onChange={...} onBlur={handleSave} />
) : (
  <p onClick={() => setIsEditing(true)}>{description}</p>
)}
```

#### Option C: Hybrid - Expandable Section
Place description in header area, click to expand inline textarea

### Decision
**Option C: Hybrid Expandable** - Best of both:
- Description visible in header (right side, utilizing whitespace)
- Click on description or "Edit" icon expands inline textarea
- Save on blur or explicit save button

---

## 6. Footer Full-Width Research

### Current Footer (SiteFooter.tsx)
```tsx
<footer className="bg-zinc-900 text-zinc-300">
  <div className="container mx-auto grid gap-8 py-12 ...">
```

### Issues Identified
1. Background is zinc-900, not emerald-900 (nature theme)
2. Vertical padding (py-12) is generous

### Spec Requirements (FR-019-021)
- Background: emerald-900 (full width) ✅
- Content: max-w-7xl container ✅
- Padding: Reduced from current

### Implementation
```tsx
// BEFORE
<footer className="bg-zinc-900 text-zinc-300">
  <div className="container mx-auto grid gap-8 py-12 ...">

// AFTER
<footer className="bg-emerald-900 text-emerald-100">
  <div className="container mx-auto grid gap-8 py-8 ...">
```

---

## 7. GearDetailModal Overlap Fix

### Current Structure (GearDetailModal.tsx:54-67)
```tsx
<DialogHeader>
  <div className="flex items-start justify-between gap-4">
    <DialogTitle className="text-xl">{item.name}</DialogTitle>
    <Button asChild size="icon" variant="ghost" className="h-8 w-8 shrink-0">
      <Link href={...}><Pencil /></Link>
    </Button>
  </div>
</DialogHeader>
```

### Issue
The Edit button is placed in the header, close to where the Dialog's built-in close button would appear, causing visual overlap or confusion.

### Solution Options

#### Option A: Move Edit Button to Action Row Below Header
```tsx
<DialogHeader>
  <DialogTitle>{item.name}</DialogTitle>
</DialogHeader>
<div className="flex gap-2">
  <Button asChild><Link href={...}>Edit</Link></Button>
</div>
```

#### Option B: Place Edit Icon Left of Title
```tsx
<DialogHeader>
  <div className="flex items-center gap-2">
    <Button asChild size="icon" variant="ghost">
      <Link href={...}><Pencil /></Link>
    </Button>
    <DialogTitle>{item.name}</DialogTitle>
  </div>
</DialogHeader>
```

### Decision
**Option B**: Edit icon left of title
- Keeps action visible and accessible
- Clearly separates from close button (which is top-right)
- Follows common UI pattern (action icon before title)

---

## 8. GearCard Image Display

### Current Behavior
Need to verify if GearCard properly displays uploaded images.

### Research Finding
Looking at components/inventory-gallery/GearCard.tsx would show current image handling.

**Action**: Verify primaryImageUrl is being used correctly in GearCard render.

---

## Summary of Decisions

1. **Typography**: Remove Rock Salt from LoadoutHeader, keep only in logo locations
2. **Header**: Use `bg-emerald-50/90 dark:bg-emerald-900/90`
3. **Layout**: Verify current layout matches spec (may already be correct)
4. **Sticky**: Adjust to `top-28` for buffer
5. **Activity Matrix**: New component with averaged priorities
6. **Inline Editing**: Expandable panel in LoadoutHeader
7. **Footer**: Change to emerald-900, reduce padding to py-8
8. **GearDetailModal**: Move Edit icon to left of title
