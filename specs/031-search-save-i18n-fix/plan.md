# Implementation Plan: Search Save Fix & i18n Repair Sprint

**Branch**: `031-search-save-i18n-fix` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/031-search-save-i18n-fix/spec.md`

## Summary

This bugfix sprint addresses two critical issues and one UX polish item:
1. **Image Save Bug**: When users select images via Search (Serper), the save operation fails because the system may be attempting to process the external URL as a file upload. Fix ensures external URLs are saved directly.
2. **i18n Crash**: German locale Inventory page crashes with FORMATTING_ERROR because the `showingItems` translation variables are not being passed correctly.
3. **Toast Feedback**: Add "Image selected" toast when clicking search results for better UX.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+
**Primary Dependencies**: react-hook-form 7.x, Zod 4.x, shadcn/ui, Tailwind CSS 4, sonner (toast), next-intl
**Storage**: Firebase Firestore (`userBase/{uid}/gearInventory`)
**Testing**: No automated tests for this sprint - validation via lint, build, and manual testing
**Target Platform**: Web browser (modern browsers)
**Project Type**: web (Next.js App Router)
**Performance Goals**: Toast feedback within 100ms of click
**Constraints**: No breaking changes to existing save flow for file uploads
**Scale/Scope**: 3 bug fixes affecting 3-4 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | ✅ PASS | Bug fixes are in existing hooks and components following the pattern |
| II. TypeScript Strict | ✅ PASS | No new `any` types, existing type definitions used |
| III. Design System | ✅ PASS | Using existing shadcn/ui components (toast via sonner) |
| IV. Spec-Driven | ✅ PASS | Spec created before implementation |
| V. Import Organization | ✅ PASS | Using `@/*` imports, no new file structure changes |

**Gate Status**: PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/031-search-save-i18n-fix/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal - bug fixes)
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Quality validation
```

### Source Code (repository root)

```text
# Files to modify (bug fixes - no new files)
components/
└── gear-editor/
    └── sections/
        └── MediaSection.tsx       # FR-003, FR-006: Clear file state, add toast

components/
└── inventory-gallery/
    └── GalleryToolbar.tsx         # FR-004: Verify translation variable passing

messages/
├── de.json                        # FR-005: Verify showingItems variables
└── en.json                        # FR-005: Verify showingItems variables
```

**Structure Decision**: No new files created. Bug fixes modify existing files only.

## Complexity Tracking

> No violations to justify - all fixes follow existing patterns.
