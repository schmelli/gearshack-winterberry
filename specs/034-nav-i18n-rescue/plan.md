# Implementation Plan: Navigation & Translation Rescue Sprint

**Branch**: `034-nav-i18n-rescue` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/034-nav-i18n-rescue/spec.md`

## Summary

This feature fixes locale-preservation bugs in navigation by migrating 8 files from standard Next.js `Link` and `useRouter` imports to the locale-aware versions from `@/i18n/navigation`. No translation changes are needed - the keys are already correct.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+
**Primary Dependencies**: next-intl (i18n), existing `@/i18n/navigation` module
**Storage**: N/A (no data changes)
**Testing**: No automated tests - validation via lint, build, and manual testing
**Target Platform**: Web browser (modern browsers)
**Project Type**: web (Next.js App Router)
**Performance Goals**: N/A (bug fix, no performance impact)
**Constraints**: Must preserve existing behavior while fixing locale handling
**Scale/Scope**: 8 files need import updates, ~20 lines changed total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | ✅ PASS | Import changes only, no new logic in components |
| II. TypeScript Strict | ✅ PASS | Using typed imports, no `any` introduced |
| III. Design System | ✅ PASS | No UI changes, using existing shadcn components |
| IV. Spec-Driven | ✅ PASS | Spec created before implementation |
| V. Import Organization | ✅ PASS | Using `@/*` path alias for i18n imports |

**Gate Status**: PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/034-nav-i18n-rescue/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── README.md        # Behavioral contracts
└── checklists/
    └── requirements.md  # Quality validation
```

### Source Code (repository root)

```text
# Modified files
hooks/
└── useGearEditor.ts           # FR-002: useRouter import fix

components/
├── inventory-gallery/
│   └── GearCard.tsx           # FR-001: Link import fix
├── loadouts/
│   ├── LoadoutCard.tsx        # FR-001: Link import fix
│   ├── GearDetailModal.tsx    # FR-001: Link import fix
│   └── LoadoutHeader.tsx      # FR-001: Link import fix
└── layout/
    └── SiteFooter.tsx         # FR-001: Link import fix

app/[locale]/loadouts/
├── page.tsx                   # FR-001: Link import fix
└── new/page.tsx               # FR-001, FR-002: Link + useRouter import fix
```

**Structure Decision**: Standard Next.js App Router structure with i18n integration via next-intl

## Complexity Tracking

> No violations to justify - this is a straightforward import migration with no new patterns.
