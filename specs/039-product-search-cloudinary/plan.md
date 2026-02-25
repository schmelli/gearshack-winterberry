# Implementation Plan: Restore Product Search with Cloudinary Integration

**Branch**: `039-product-search-cloudinary` | **Date**: 2025-12-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/039-product-search-cloudinary/spec.md`

## Summary

Restore Google Images product search (via existing Serper.dev server action) and integrate it with Cloudinary upload. When users search for product images and click a result, the external image URL is uploaded to Cloudinary and the resulting `secure_url` populates the form field. This addresses user dissatisfaction with Unsplash (lacks specific product images) while maintaining consistency with the new Cloudinary storage strategy.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, Tailwind CSS 4, shadcn/ui, lucide-react, next-cloudinary
**Storage**: Cloudinary (via existing unsigned upload preset), Firebase Firestore (existing gear items)
**Testing**: Manual testing per acceptance scenarios
**Target Platform**: Web (Desktop/Mobile browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Search results < 3 seconds, Combined search + upload < 15 seconds
**Constraints**: Serper API rate limits, Cloudinary unsigned upload limits
**Scale/Scope**: Single-user gear inventory application

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | ✅ PASS | Hook extension (`useCloudinaryUpload`) for logic, UI in `ImageUploadZone` |
| II. TypeScript Strict Mode | ✅ PASS | All types defined in `@/types`, no `any` |
| III. Design System Compliance | ✅ PASS | Using shadcn/ui (Button, Input), Tailwind CSS only, lucide-react icons |
| IV. Spec-Driven Development | ✅ PASS | Full spec exists with acceptance scenarios |
| V. Import and File Organization | ✅ PASS | Using `@/*` aliases, feature-organized files |

**Gate Status**: ✅ PASS - All principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/039-product-search-cloudinary/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no new APIs)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
# Next.js App Router Structure (existing)
app/
├── [locale]/
│   └── inventory/          # Gear editor pages
└── actions/
    └── image-search.ts     # Existing Serper server action (Feature 030)

components/
├── gear-editor/
│   ├── ImageUploadZone.tsx    # MODIFY: Add search UI
│   ├── ProductSearchGrid.tsx  # NEW: Search results grid component
│   └── CloudImportButton.tsx  # EXISTS: Demote to secondary
└── ui/                        # shadcn/ui (no changes)

hooks/
└── useCloudinaryUpload.ts     # MODIFY: Add uploadUrl function

types/
└── cloudinary.ts              # EXISTS: May extend if needed
```

**Structure Decision**: Modify existing files from Feature 038. New component `ProductSearchGrid.tsx` for search results display. No new API routes needed - reuse existing server action.

## Complexity Tracking

> No Constitution violations - no complexity justification needed.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| New vs Modify | Mostly modifications | Extends Feature 038 infrastructure |
| New Component | `ProductSearchGrid.tsx` | Encapsulates search results display |
| Hook Extension | `uploadUrl` method | Reuse existing upload logic for URLs |
