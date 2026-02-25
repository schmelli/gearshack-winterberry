# Implementation Plan: Cloudinary Migration with Hybrid Processing

**Branch**: `038-cloudinary-hybrid-upload` | **Date**: 2025-12-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-cloudinary-hybrid-upload/spec.md`

## Summary

Migrate image storage from Firebase Storage to Cloudinary using a hybrid approach:
1. **Local files**: Drag-and-drop → WASM background removal (optional, on by default) → Cloudinary unsigned upload
2. **Cloud sources**: Cloudinary Upload Widget → direct Cloudinary storage (Unsplash, URLs)

Store Cloudinary `secure_url` in Firestore to decouple assets from database provider, enabling future migration to Supabase.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, @imgly/background-removal (WASM), next-cloudinary or cloudinary-upload-widget, shadcn/ui, Tailwind CSS 4
**Storage**: Firebase Firestore (`userBase/{uid}/gearInventory`), Cloudinary (image assets)
**Testing**: Vitest (unit), Playwright (e2e)
**Target Platform**: Web (modern browsers with WASM support)
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: Local upload + processing < 30 seconds, Cloud import < 10 seconds
**Constraints**: 10MB max file size (Cloudinary free tier), client-side only (no server-side upload signing)
**Scale/Scope**: Single user app, MVP usage within Cloudinary free tier limits

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | ✅ PASS | Image upload logic will be in `hooks/useCloudinaryUpload.ts`, UI components remain stateless |
| II. TypeScript Strict Mode | ✅ PASS | All new code will use strict types, CloudinaryUploadResult will be typed |
| III. Design System Compliance | ✅ PASS | Using shadcn/ui Button, Switch (for toggle), existing Card layouts |
| IV. Spec-Driven Development | ✅ PASS | Spec complete with clarifications, following workflow |
| V. Import and File Organization | ✅ PASS | Using `@/*` imports, organizing by feature |

**Technology Constraints Check**:
| Constraint | Status | Notes |
|------------|--------|-------|
| Framework (Next.js 16+) | ✅ PASS | No changes to framework |
| Language (TypeScript strict) | ✅ PASS | All new code strictly typed |
| Styling (Tailwind CSS 4) | ✅ PASS | No custom CSS files |
| Components (shadcn/ui) | ✅ PASS | Using existing components |
| Icons (lucide-react) | ✅ PASS | Cloud, Upload icons available |
| Forms (react-hook-form + zod) | ✅ PASS | Existing form integration |

**New Dependency Justification**:
- `next-cloudinary` or direct Cloudinary Upload Widget SDK: Required for Cloudinary integration, no Next.js built-in alternative exists

## Project Structure

### Documentation (this feature)

```text
specs/038-cloudinary-hybrid-upload/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── [locale]/
│   └── gear/
│       └── [id]/
│           └── edit/     # Gear item editor (image upload integration point)

components/
├── gear-editor/
│   ├── ImageUploadZone.tsx     # NEW: Drag-drop + toggle + cloud import button
│   └── ...existing components

hooks/
├── useCloudinaryUpload.ts      # NEW: Cloudinary upload logic
├── useBackgroundRemoval.ts     # EXISTING: WASM processing (reuse)
└── useGearItem.ts              # EXISTING: Form state (update to save Cloudinary URL)

lib/
├── cloudinary/
│   └── config.ts               # NEW: Cloudinary configuration
└── firebase/
    └── storage.ts              # MODIFY: Remove upload logic, keep display helpers

types/
├── cloudinary.ts               # NEW: CloudinaryUploadResult, CloudinaryConfig
└── gear.ts                     # EXISTING: GearItem.imageUrl already supports URLs
```

**Structure Decision**: Web application following existing Next.js App Router structure. New files organized by feature (cloudinary/) with hooks separated per constitution requirements.

## Complexity Tracking

No constitution violations requiring justification. Implementation uses existing patterns and approved technologies.
