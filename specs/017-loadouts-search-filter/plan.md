# Implementation Plan: Loadouts Search, Filter, and Sort

**Branch**: `017-loadouts-search-filter` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-loadouts-search-filter/spec.md`

## Summary

Extend the existing `useLoadoutSearch` hook to add activity filtering and sorting capabilities, then create a `LoadoutToolbar` component styled consistently with the Inventory `GalleryToolbar`. The implementation follows Feature-Sliced Light architecture with logic in hooks and stateless UI components.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, shadcn/ui, Tailwind CSS 4, lucide-react
**Storage**: zustand store (existing `useLoadouts` hook)
**Testing**: Manual testing (visual verification)
**Target Platform**: Web (all modern browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Instant filtering (<100ms for 100 loadouts)
**Constraints**: Client-side only, no server round-trips
**Scale/Scope**: Typical user has 5-50 loadouts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | PASS | Logic in `useLoadoutSearch` hook, UI in `LoadoutToolbar` component |
| II. TypeScript Strict Mode | PASS | New `SortOption` type, proper typing throughout |
| III. Design System Compliance | PASS | Using shadcn/ui Input, Select, Button components |
| IV. Spec-Driven Development | PASS | Spec completed, types first, then hook, then UI |
| V. Import and File Organization | PASS | Using `@/*` aliases, feature-organized files |

**All gates pass. Proceeding to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/017-loadouts-search-filter/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Validation checklist (complete)
```

### Source Code (repository root)

```text
# Next.js App Router structure
app/
└── loadouts/
    └── page.tsx           # MODIFY: Replace inline toolbar with LoadoutToolbar

components/
└── loadouts/
    └── LoadoutToolbar.tsx # CREATE: New toolbar component

hooks/
└── useLoadoutSearch.ts    # MODIFY: Add activity filter and sort

types/
└── loadout.ts             # MODIFY: Add SortOption type
```

**Structure Decision**: Single web application following existing Next.js App Router conventions. Extends existing hook and creates new component in established directories.

## Complexity Tracking

> No constitution violations to justify. Implementation follows established patterns.

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| Hook extension | Extend `useLoadoutSearch` | Follows existing pattern, avoids new hook proliferation |
| Toolbar component | New `LoadoutToolbar` | Mirrors `GalleryToolbar` pattern for consistency |
| Sort state | Include in hook | Keeps all filter/sort state co-located |
