# Implementation Plan: Visual Identity Overhaul & Data Fixes

**Branch**: `012-visual-identity-fixes` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-visual-identity-fixes/spec.md`

## Summary

This feature overhauls the visual identity of Gearshack with new brand colors (Deep Forest Green #405A3D and Pale Mist #FCFDF7), enhances the header/footer with consistent styling, fixes the GearCard density sizing behavior, polishes modal/dialog UX, and resolves the "Untitled Item" bug in the legacy data adapter by extending the name field resolution chain.

Technical approach:
1. **Theme Update**: Modify CSS variables in globals.css and update SiteHeader/SiteFooter components
2. **GearCard Fix**: Add density-based sizing logic for card dimensions and images
3. **Modal Polish**: Update DialogOverlay styling and convert LoadoutMetadataSheet to Dialog with icon-based season selector
4. **Data Fix**: Extend adapter name resolution with additional fields and brand/model fallbacks

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, Tailwind CSS 4, shadcn/ui, lucide-react
**Storage**: Firebase Firestore (legacy data in `userBase/{uid}/gearInventory`)
**Testing**: Manual testing (no automated test framework)
**Target Platform**: Web (responsive, desktop-first)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Page load <3s, visual updates immediate
**Constraints**: WCAG AA contrast compliance (7.2:1 for white on Deep Forest Green)
**Scale/Scope**: Single-user app, ~100s of gear items per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | ✅ PASS | All logic in adapters/hooks, UI components stateless |
| II. TypeScript Strict Mode | ✅ PASS | No `any` types, Zod validation for external data |
| III. Design System Compliance | ✅ PASS | Using shadcn/ui Dialog, Tailwind CSS only |
| IV. Spec-Driven Development | ✅ PASS | Spec created before implementation |
| V. Import and File Organization | ✅ PASS | All imports use `@/*` alias |

**Technology Constraints Check**:
- ✅ Next.js 16+ App Router
- ✅ TypeScript strict mode
- ✅ Tailwind CSS 4 only (custom colors via arbitrary values)
- ✅ shadcn/ui components
- ✅ lucide-react icons

**Code Quality Gates**:
- Will run `npm run lint` before merge
- Will run `npm run build` before merge

## Project Structure

### Documentation (this feature)

```text
specs/012-visual-identity-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
├── checklists/          # Quality checklists
│   └── requirements.md  # Already created
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router structure
app/
├── globals.css          # FR-001, FR-002: Brand color variables
├── layout.tsx           # Root layout
├── inventory/
│   └── page.tsx         # Uses GearCard with density

components/
├── layout/
│   ├── SiteHeader.tsx   # FR-003, FR-005, FR-006, FR-007: Header styling
│   └── SiteFooter.tsx   # FR-004: Footer styling
├── gear/
│   └── GearCard.tsx     # FR-009-012: Density-based sizing
├── loadouts/
│   ├── LoadoutMetadataDialog.tsx  # FR-014-016: Dialog with icon seasons
│   └── SeasonSelector.tsx         # FR-016: Icon card season selection
└── ui/
    └── dialog.tsx       # FR-013: Update DialogOverlay styling

lib/
└── firebase/
    └── adapter.ts       # FR-017-021: Extended name resolution

lib/validations/
└── adapter.ts           # Add productName, label fields to schema
```

**Structure Decision**: Using existing Next.js App Router structure. Minor additions for SeasonSelector component.

## Complexity Tracking

> No constitution violations - all changes follow existing patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
