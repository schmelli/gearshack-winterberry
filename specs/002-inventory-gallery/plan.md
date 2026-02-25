# Implementation Plan: Inventory Gallery

**Branch**: `002-inventory-gallery` | **Date**: 2025-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-inventory-gallery/spec.md`

## Summary

Build a visual gallery view for browsing the gear collection with responsive CSS Grid layout, three view density modes (Compact/Standard/Detailed), text search and category filtering, and premium card design with image previews and category-based placeholders. Extends the existing inventory page from Sprint 1.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) with React 19+
**Primary Dependencies**: Next.js 16+ (App Router), shadcn/ui, Tailwind CSS 4, lucide-react
**Storage**: N/A (client-side mock data for MVP)
**Testing**: Manual testing via browser (no automated tests specified)
**Target Platform**: Web (responsive: mobile, tablet, desktop)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: < 2s page load, < 100ms view density switch
**Constraints**: Client-side filtering only, no backend persistence
**Scale/Scope**: 10-15 mock items, single page feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Feature-Sliced Light | UI stateless, logic in hooks | ✅ PASS | Will create `useInventory` hook for data/filtering logic |
| II. TypeScript Strict | No `any`, explicit types | ✅ PASS | Reuse existing GearItem type, add ViewDensity type |
| III. Design System | shadcn/ui, Tailwind only | ✅ PASS | Use Card, Select, Input, Button from shadcn/ui |
| IV. Spec-Driven | Types → Hooks → UI order | ✅ PASS | Following spec from /specs/002-inventory-gallery |
| V. Import Organization | @/* paths, feature co-location | ✅ PASS | Components in components/inventory-gallery/ |

**Gate Status**: ✅ PASSED - All principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/002-inventory-gallery/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Next.js App Router structure (existing from Sprint 1)
app/
├── layout.tsx
├── page.tsx
└── inventory/
    ├── page.tsx              # UPDATE: Replace placeholder with gallery
    ├── new/page.tsx          # Existing from Sprint 1
    └── [id]/edit/page.tsx    # Existing from Sprint 1

# New components for this feature
components/
├── ui/                       # Existing shadcn/ui components
├── gear-editor/              # Existing from Sprint 1
└── inventory-gallery/        # NEW: Gallery feature components
    ├── GearCard.tsx          # Card component with density modes
    ├── GalleryGrid.tsx       # Responsive grid container
    ├── GalleryToolbar.tsx    # Search, filter, view controls
    └── CategoryPlaceholder.tsx # Placeholder icon by category

# New hook for this feature
hooks/
├── useGearEditor.ts          # Existing from Sprint 1
└── useInventory.ts           # NEW: Mock data + filtering logic

# Existing utilities (reused)
lib/
├── gear-utils.ts             # Weight formatting
├── taxonomy/
│   ├── taxonomy-data.json    # Category data
│   └── taxonomy-utils.ts     # Category lookups
└── validations/

# Existing types (extended)
types/
├── gear.ts                   # GearItem type (existing)
└── inventory.ts              # NEW: ViewDensity, FilterState types
```

**Structure Decision**: Extend existing Next.js App Router structure. New gallery components co-located in `components/inventory-gallery/`. Logic isolated in `hooks/useInventory.ts`. Reuse existing taxonomy and gear utilities from Sprint 1.

## Complexity Tracking

> No violations - all principles satisfied with simple patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
