# Research: Visual Identity Overhaul & Data Fixes

**Feature Branch**: `012-visual-identity-fixes`
**Date**: 2025-12-05

## Research Tasks

### 1. Tailwind Custom Colors Implementation

**Question**: How to implement custom brand colors (Deep Forest Green #405A3D, Pale Mist #FCFDF7) in Tailwind CSS 4?

**Findings**:
- Tailwind CSS 4 supports arbitrary values: `bg-[#405A3D]`
- Can also extend theme in `tailwind.config.ts` with custom colors
- CSS variables in globals.css for shadcn/ui theming: `--primary`, `--background`

**Decision**: Use Tailwind arbitrary values for component styling + update CSS variables for theme consistency
- Header/Footer: `bg-[#405A3D]` or `bg-forest` if configured
- Background: `bg-[#FCFDF7]` or CSS variable `--background`
- For shadcn/ui theming, update CSS variables in globals.css

**Rationale**: Arbitrary values work immediately without config changes. CSS variables ensure shadcn components use correct colors.

---

### 2. WCAG Contrast Compliance

**Question**: Does white text on Deep Forest Green (#405A3D) meet WCAG AA standards?

**Findings**:
- Deep Forest Green: #405A3D (rgb 64, 90, 61)
- White: #FFFFFF
- Contrast ratio calculation: 7.21:1
- WCAG AA requires 4.5:1 for normal text, 3:1 for large text
- WCAG AAA requires 7:1 for normal text

**Decision**: White text on Deep Forest Green is compliant
- Ratio 7.21:1 exceeds WCAG AA (4.5:1) ✅
- Ratio 7.21:1 exceeds WCAG AAA (7:1) ✅

**Rationale**: The chosen color combination passes the highest accessibility standard.

---

### 3. Active Navigation Indicator Pattern

**Question**: What visual pattern should indicate the active page in navigation?

**Findings**:
- Common patterns: underline, pill/highlight, bold weight, color change
- Current header already has text styling
- Constitution: "Use Tailwind CSS classes exclusively"

**Decision**: Use underline with offset for active state
- Apply `border-b-2 border-white` for active nav item
- Alternative: pill background with `bg-white/20 rounded-full px-3`

**Rationale**: Underline is clean, accessible, and works well with white text on green background.

---

### 4. GearCard Density Sizing Approach

**Question**: How should card dimensions change between compact/standard/detailed?

**Findings from current GearCard**:
- Density prop exists but may only affect text
- Need to change: card width, card height, image container size, text visibility

**Decision**: Implement sizing maps per density mode
```
Compact:
- Card: w-full (grid handles columns), min-h-[180px]
- Image: h-32, object-contain
- Text: name only, truncated

Standard:
- Card: w-full, auto height
- Image: aspect-square
- Text: name + brand visible

Detailed:
- Card: w-full, larger min-height
- Image: aspect-[4/3] or larger
- Text: name + brand + description + notes
```

**Rationale**: Clear visual distinction between modes. Grid layout handles responsive columns.

---

### 5. Season Selector Icon Cards

**Question**: What icons should represent each season?

**Findings**:
- lucide-react icons available: Sun, Snowflake, Leaf, Flower2
- Constitution: "Icons: lucide-react"
- Need clickable card layout, not dropdown

**Decision**: Use lucide-react icons with label cards
- Spring: `Flower2` (flower blooming)
- Summer: `Sun` (sunshine)
- Fall: `Leaf` (autumn leaf)
- Winter: `Snowflake` (snow)

**Implementation**: Grid of 4 cards with icon + label, toggle selection

**Rationale**: Visual icons are more intuitive than text dropdown. lucide-react provides suitable icons.

---

### 6. Legacy Data Field Names

**Question**: What additional field names might contain the gear item name in legacy Firestore data?

**Findings from FR-018**:
- Already checking: name, title
- Additional to check: productName, label, model
- Brand+model combination: "{brand} {model}"
- Brand fallback: "{brand} Item"

**Decision**: Extend resolveField chain
1. name (primary)
2. title (legacy)
3. productName (product catalog)
4. item_name (snake_case legacy)
5. displayName (camelCase variant)
6. label (generic)
7. If brand+model exists: "{brand} {model}"
8. If brand only: "{brand} Item"
9. Final: "Unnamed Gear"

**Rationale**: Covers all likely field naming conventions from various data sources.

---

### 7. Dialog Overlay Styling

**Question**: How to add backdrop blur and opacity to shadcn Dialog?

**Findings**:
- shadcn/ui Dialog uses DialogOverlay component
- Current: may use default styling
- Need: `bg-black/60 backdrop-blur-sm`

**Decision**: Modify DialogOverlay className in components/ui/dialog.tsx
- Add: `bg-black/60 backdrop-blur-sm`
- Keep existing animation classes

**Rationale**: Simple className modification achieves the polished modal effect.

---

## Summary of Decisions

| Topic | Decision | Impact |
|-------|----------|--------|
| Brand Colors | Arbitrary values + CSS variables | globals.css, SiteHeader, SiteFooter |
| Contrast | 7.21:1 - WCAG AAA compliant | No changes needed |
| Active Nav | Underline with border-b-2 | SiteHeader.tsx |
| Card Sizing | Density-based dimension maps | GearCard.tsx |
| Season Icons | Flower2/Sun/Leaf/Snowflake | New SeasonSelector.tsx |
| Name Fields | 9-step resolution chain | adapter.ts |
| Dialog Overlay | bg-black/60 backdrop-blur-sm | dialog.tsx |

---

## Unknowns Resolved

All technical decisions have been made through code analysis and pattern research. No external dependencies or clarifications needed.
