# Implementation Plan: Grand Visual Polish Sprint

**Branch**: `009-grand-visual-polish` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-grand-visual-polish/spec.md`

## Summary

Comprehensive visual polish sprint addressing typography consistency (Rock Salt reserved for logo only), header redesign with nature-inspired styling, loadout editor column layout flip (inventory left, loadout right with sticky), inline metadata editing, activity matrix visualization, full-width footer, and component overlap fixes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, Tailwind CSS 4, shadcn/ui, lucide-react
**Storage**: N/A (existing zustand/localStorage persistence unchanged)
**Testing**: Manual testing only (no test framework configured)
**Target Platform**: Web (Desktop/Mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Smooth UI interactions, CSS transitions under 300ms
**Constraints**: No new dependencies, use existing shadcn/ui components
**Scale/Scope**: ~15 component modifications, ~7 styling updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | ✅ PASS | All changes are styling/layout; logic remains in hooks |
| II. TypeScript Strict Mode | ✅ PASS | No new types required; Activity Matrix config is simple object |
| III. Design System Compliance | ✅ PASS | Using existing shadcn/ui, Tailwind only, no new base components |
| IV. Spec-Driven Development | ✅ PASS | Full spec defined with acceptance criteria |
| V. Import and File Organization | ✅ PASS | Using @/* aliases, feature-organized files |

**Technology Constraints Check**:
| Constraint | Status |
|------------|--------|
| Framework: Next.js 16+ | ✅ In use |
| Language: TypeScript (strict) | ✅ Enabled |
| Styling: Tailwind CSS 4 only | ✅ All changes via Tailwind classes |
| Components: shadcn/ui | ✅ Using existing Dialog, ScrollArea, Progress |
| Icons: lucide-react | ✅ Already using |
| Forms: react-hook-form + zod | ✅ For inline editing (existing pattern) |
| React Version: React 19+ | ✅ In use |

## Project Structure

### Documentation (this feature)

```text
specs/009-grand-visual-polish/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API changes)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (affected files)

```text
components/
├── layout/
│   ├── SiteHeader.tsx        # FR-004-007: Header redesign with pastel green
│   └── SiteFooter.tsx        # FR-019-021: Full-width footer with reduced padding
├── loadouts/
│   ├── LoadoutHeader.tsx     # FR-012-015: Sans-serif title, inline editing, description position
│   ├── GearDetailModal.tsx   # FR-022-024: Separate Edit/Close icons
│   └── ActivityMatrix.tsx    # NEW: FR-015-018: Activity priority visualization
├── inventory-gallery/
│   └── GearCard.tsx          # FR-024: Display uploaded images
└── ui/
    └── progress.tsx          # For Activity Matrix bars (existing shadcn)

app/
├── loadouts/
│   └── [id]/
│       └── page.tsx          # FR-008-011: Column layout flip, sticky positioning
├── inventory/
│   └── page.tsx              # FR-001-003: Typography check
└── globals.css               # May need emerald-50 color definition

lib/
└── loadout-utils.ts          # Activity Matrix config data

types/
└── loadout.ts                # ActivityPriorityMatrix type (if needed)
```

## Complexity Tracking

> No violations requiring justification. All changes use existing patterns.

## Implementation Phases

### Phase 0: Research (completed via /speckit.plan)
- Typography audit across codebase
- Existing component patterns analysis
- Color palette verification

### Phase 1: Design Artifacts
- data-model.md: Activity Matrix config structure
- contracts/: N/A (no API changes)
- quickstart.md: Manual testing procedures

### Phase 2: Task Generation (/speckit.tasks)
- Typography fixes (FR-001-003)
- Header redesign (FR-004-007)
- Loadout editor layout (FR-008-011)
- Loadout header inline editing (FR-012-015)
- Activity Matrix (FR-016-018)
- Footer fixes (FR-019-021)
- Component overlap fixes (FR-022-024)
- Responsive validation (FR-025-026)

## Key Implementation Decisions

### Typography Strategy
- Remove `font-[family-name:var(--font-rock-salt)]` from LoadoutHeader.tsx (line 129)
- Keep Rock Salt only in: SiteHeader.tsx (line 50), MobileNav.tsx (line 53), login page logo
- All H1/H2 headings use default Geist/Inter (font-sans)

### Header Redesign
- Add `bg-emerald-50/90` to SiteHeader instead of `bg-background/80`
- Maintain existing height (h-24 = 96px) per FR-020
- Full-width background achieved via existing `w-full` class

### Loadout Editor Layout Flip
- Current: `grid-cols-[2fr_3fr]` with picker left, list right
- Target: Swap column order so inventory is left, loadout is right
- Sticky: Already has `md:sticky md:top-24` on right column (will move to new right)

### Activity Matrix
- New component with 4 Progress bars (Weight, Comfort, Durability, Safety)
- Config object mapping ActivityType to priority scores (0-100)
- Smooth value transitions via CSS `transition-all`

### Inline Description Editing
- Replace modal-based editing with expandable textarea in LoadoutHeader
- Use existing react-hook-form patterns from ProfileEditForm

### Footer Full-Width
- Change footer background from `bg-zinc-900` to `bg-emerald-900`
- Ensure background spans full width (already does via parent structure)
- Reduce vertical padding from `py-12` to `py-8`

### GearDetailModal Overlap Fix
- Move Edit button from `flex items-start justify-between` to left of title
- Or add explicit spacing with `gap-4` between title and close button area

## Dependencies

| From | To | Reason |
|------|-----|--------|
| Typography fixes | All pages | Visual consistency |
| Header redesign | All pages | Layout component |
| Activity Matrix | LoadoutHeader | New sub-component |
| Inline editing | LoadoutHeader | UI enhancement |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Typography regression | Grep audit before/after |
| Layout breaking on mobile | Test all viewport sizes |
| Sticky positioning conflicts with header | Account for h-24 header height in top offset |
