# Implementation Plan: Grand Polish Sprint ("Nano Banana")

**Branch**: `007-grand-polish-sprint` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-grand-polish-sprint/spec.md`

## Summary

Major UI/UX overhaul to elevate the application to premium standards. Primary changes include:
1. **Global layout centering** with max-w-7xl container
2. **Site header redesign** with 2x larger logo, h-24 height, right-aligned navigation
3. **Footer redesign** with 4-column layout and dark stone background
4. **Advanced weight calculations** with worn/consumable flags for proper Base Weight
5. **Universal card interactions** where clicking any gear card opens detail modal
6. **Loadouts dashboard search/filter** toolbar
7. **Micro-interactions and animations** for polish

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+, React 19+, Tailwind CSS 4, shadcn/ui, zustand, recharts, sonner, lucide-react
**Storage**: localStorage via zustand persist middleware (no backend)
**Testing**: Manual testing, npm run lint, npm run build
**Target Platform**: Web (desktop and mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Dialog/animation <300ms, filter <100ms keystroke, immediate toggle response
**Constraints**: Must use existing shadcn/ui components, Tailwind-only styling, no new base components
**Scale/Scope**: Single-user local storage, ~50 gear items, ~10 loadouts typical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | ✅ PASS | All new logic in hooks (useLoadoutSearch, useLoadoutItemState), stateless UI components |
| II. TypeScript Strict Mode | ✅ PASS | New types (LoadoutItemState, WeightSummary) in types/, no `any` usage |
| III. Design System Compliance | ✅ PASS | Uses existing shadcn/ui Dialog, Sheet, Card, Button. Tailwind-only styling |
| IV. Spec-Driven Development | ✅ PASS | spec.md complete before planning |
| V. Import and File Organization | ✅ PASS | @/ path alias, feature-organized files |

**Gate Result**: PASS - No violations. Ready to proceed.

## Project Structure

### Documentation (this feature)

```text
specs/007-grand-polish-sprint/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output - entity extensions
├── quickstart.md        # Phase 1 output - testing scenarios
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── layout.tsx           # MODIFY: Add centered container wrapper
├── loadouts/
│   ├── page.tsx         # MODIFY: Add search/filter toolbar
│   └── [id]/page.tsx    # MODIFY: Wire up worn/consumable toggles, metadata edit
└── inventory/
    └── page.tsx         # MODIFY: Wire up card click to detail modal

components/
├── layout/
│   ├── SiteHeader.tsx   # MODIFY: h-24, 2x logo, right-aligned nav
│   └── SiteFooter.tsx   # MODIFY: 4-column layout, dark stone background
├── loadouts/
│   ├── LoadoutHeader.tsx      # MODIFY: Add metadata edit, dual weight display
│   ├── LoadoutList.tsx        # MODIFY: Add worn/consumable toggles
│   ├── LoadoutCard.tsx        # MODIFY: Card click opens detail
│   ├── LoadoutPicker.tsx      # EXISTING: Already has card click
│   ├── LoadoutMetadataSheet.tsx  # NEW: Edit name, description, season, date
│   └── GearDetailModal.tsx    # MODIFY: Add edit icon in header
├── inventory-gallery/
│   └── GearCard.tsx           # MODIFY: Card body click opens detail
└── ui/
    └── [existing shadcn components]

hooks/
├── useStore.ts               # MODIFY: Add worn/consumable item state
├── useLoadoutEditor.ts       # MODIFY: Add weight calculations
├── useLoadoutSearch.ts       # NEW: Search/filter for loadouts dashboard
└── useLoadoutItemState.ts    # NEW: Manage worn/consumable toggles

types/
├── loadout.ts          # MODIFY: Add LoadoutItemState, WeightSummary
└── store.ts            # MODIFY: Add item state actions

lib/
└── loadout-utils.ts    # MODIFY: Add baseWeight calculation
```

**Structure Decision**: Follows existing Next.js App Router pattern with feature-organized components. New hooks and types extend existing patterns. No new directories needed except LoadoutMetadataSheet component.

## Complexity Tracking

> No constitution violations to justify.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Animation library | CSS transitions | shadcn/ui Dialog/Sheet already have animations; no new dependency needed |
| Item state storage | Extend existing zustand store | Consistent with current architecture, stored in localStorage |
| Search/filter | Client-side filtering | No backend, works with existing loadouts array |
