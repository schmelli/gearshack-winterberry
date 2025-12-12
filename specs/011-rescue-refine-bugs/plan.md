# Implementation Plan: Rescue & Refine

**Branch**: `011-rescue-refine-bugs` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-rescue-refine-bugs/spec.md`

## Summary

This feature addresses critical runtime bugs and UI polish issues in the newly implemented Firestore sync feature (010). The primary work involves:

1. **Critical Bugs (P1)**: Fix LoadoutCard navigation crashes caused by invalid IDs (hex colors) and "Untitled Item" display issues from legacy data adapter
2. **UI Polish (P2-P3)**: Migrate Edit Loadout from Sheet to Dialog, fix footer styling consistency, standardize modal z-index

Technical approach: Extend the existing legacy data adapter with more robust field resolution and ID validation, add defensive rendering in components, and apply consistent styling patterns.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, Zod 4.x, shadcn/ui, Tailwind CSS 4, Firebase SDK
**Storage**: Firebase Firestore (`userBase/{uid}/gearInventory`, `userBase/{uid}/loadouts`)
**Testing**: Manual testing (no automated test framework configured yet)
**Target Platform**: Web (responsive, desktop-first)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Page load <3s, validation overhead <50ms
**Constraints**: Must maintain backward compatibility with legacy Flutter Firestore data
**Scale/Scope**: Single-user app, ~100s of gear items and ~10s of loadouts per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | ✅ PASS | All logic in hooks/adapters, UI components stateless |
| II. TypeScript Strict Mode | ✅ PASS | No `any` types, Zod validation for external data |
| III. Design System Compliance | ✅ PASS | Using shadcn/ui Dialog, Card, Button components |
| IV. Spec-Driven Development | ✅ PASS | Spec created before implementation |
| V. Import and File Organization | ✅ PASS | All imports use `@/*` alias |

**Technology Constraints Check**:
- ✅ Next.js 16+ App Router
- ✅ TypeScript strict mode
- ✅ Tailwind CSS 4 only (no CSS files)
- ✅ shadcn/ui components
- ✅ lucide-react icons
- ✅ Zod for validation

**Code Quality Gates**:
- Will run `npm run lint` before merge
- Will run `npm run build` before merge

## Project Structure

### Documentation (this feature)

```text
specs/011-rescue-refine-bugs/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A - no new models)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API changes)
└── tasks.md             # Already created
```

### Source Code (repository root)

```text
# Next.js App Router structure
app/
├── layout.tsx           # Root layout with providers
├── loadouts/
│   ├── page.tsx         # Loadouts list page
│   └── [id]/page.tsx    # Loadout detail page

components/
├── layout/
│   ├── SiteHeader.tsx
│   └── SiteFooter.tsx   # FR-006: Footer styling
├── loadouts/
│   ├── LoadoutCard.tsx  # FR-004: Defensive rendering
│   └── EditLoadoutSheet.tsx → EditLoadoutDialog.tsx  # FR-005
├── gear/
│   └── GearDetailModal.tsx  # FR-007: Z-index fix (if exists)
└── ui/                  # shadcn/ui components

hooks/
└── useStore.ts          # Zustand store

lib/
├── firebase/
│   └── adapter.ts       # FR-001, FR-002, FR-003: ID validation, name resolution
└── validations/
    └── adapter.ts       # Zod schema updates

types/
├── gear.ts
├── loadout.ts
└── store.ts
```

**Structure Decision**: Using existing Next.js App Router structure. No new directories needed - all changes are to existing files.

## Complexity Tracking

> No constitution violations - all changes follow existing patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
