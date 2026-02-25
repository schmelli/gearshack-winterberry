# Implementation Plan: Secure Asset Pipeline Sprint

**Branch**: `032-secure-asset-pipeline` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/032-secure-asset-pipeline/spec.md`

## Summary

This feature implements a secure image pipeline that ensures all images (including search-selected ones) are stored in Firebase Storage to prevent link rot. Key components:
1. **Image Proxy API Route**: Server-side endpoint that fetches external images, bypassing browser CORS restrictions
2. **Save Logic Enhancement**: Automatic detection and import of external images during gear item save
3. **Internal URL Detection**: Smart skipping of already-internal images to avoid redundant processing

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+
**Primary Dependencies**: Firebase Storage, sonner (toast), existing `uploadGearImage` service
**Storage**: Firebase Storage (`userBase/{uid}/inventory/`)
**Testing**: No automated tests - validation via lint, build, and manual testing
**Target Platform**: Web browser (modern browsers)
**Project Type**: web (Next.js App Router)
**Performance Goals**: Image import completes in under 10 seconds
**Constraints**: Max 10MB file size (same as direct uploads), only proxy `image/*` content types
**Scale/Scope**: 1 new API route, 1 modified hook, ~100 lines of new code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | ✅ PASS | Image import logic in useGearEditor hook, API route is server-side |
| II. TypeScript Strict | ✅ PASS | All types defined, Zod validation for proxy requests |
| III. Design System | ✅ PASS | No new UI components, uses existing loading states |
| IV. Spec-Driven | ✅ PASS | Spec created before implementation |
| V. Import Organization | ✅ PASS | Using `@/*` imports, new API route follows Next.js conventions |

**Gate Status**: PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/032-secure-asset-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── proxy-image.md   # API route contract
└── checklists/
    └── requirements.md  # Quality validation
```

### Source Code (repository root)

```text
# New files
app/
└── api/
    └── proxy-image/
        └── route.ts           # FR-001, FR-002, FR-003: Image proxy API route

# Modified files
hooks/
└── useGearEditor.ts           # FR-004, FR-005, FR-006: Image import logic during save
```

**Structure Decision**: Next.js App Router API route for server-side proxy, hook modification for save logic

## Complexity Tracking

> No violations to justify - all changes follow existing patterns.
