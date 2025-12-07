# Implementation Plan: Client-Side Background Removal

**Branch**: `026-client-bg-removal` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-client-bg-removal/spec.md`

## Summary

Implement client-side background removal for gear images using the `@imgly/background-removal` WASM library. When users upload images in the Gear Editor, backgrounds are automatically removed in the browser before Firebase upload. This replaces dependency on legacy Cloud Functions for background removal.

Key approach:
- Add `@imgly/background-removal` dependency (lazy-loads WASM from CDN)
- Create `lib/image-processing.ts` utility for `removeBackground()` function
- Add toggle and processing UI to MediaSection component
- Process images client-side, then upload transparent PNG to Firebase

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Next.js 16+ (App Router)
**Primary Dependencies**: @imgly/background-removal (WASM), shadcn/ui (Switch), Firebase Storage
**Storage**: Firebase Storage (existing - uploads processed PNG)
**Testing**: Manual testing + lint + build validation
**Target Platform**: Web (modern browsers with WASM support)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Background removal completes within 5 seconds
**Constraints**: Lazy-load WASM to avoid initial bundle impact
**Scale/Scope**: Single component enhancement, ~100 lines new code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Feature-Sliced Light Architecture**: Processing logic in `lib/image-processing.ts`, UI stateless
- [x] **TypeScript Strict Mode**: All new code fully typed, no `any`
- [x] **Design System Compliance**: Uses shadcn/ui Switch component, Tailwind styling
- [x] **Spec-Driven Development**: Full spec and plan created before implementation
- [x] **Import Organization**: Uses `@/*` path aliases

## Project Structure

### Documentation (this feature)

```text
specs/026-client-bg-removal/
├── plan.md              # This file
├── research.md          # DR-001 through DR-006
├── quickstart.md        # Step-by-step implementation guide
├── checklists/
│   └── requirements.md  # Validation checklist
└── spec.md              # Feature specification
```

### Source Code (repository root)

```text
lib/
└── image-processing.ts         # NEW: removeBackground() utility

components/
└── gear-editor/
    └── sections/
        └── MediaSection.tsx    # MODIFY: Add toggle, processing UI

components/ui/
└── switch.tsx                  # ADD (if not present): shadcn/ui Switch
```

**Structure Decision**: Following existing Next.js App Router structure. New utility goes in `lib/` per Feature-Sliced Light architecture. UI changes are isolated to MediaSection.tsx.

## Complexity Tracking

No violations - this feature aligns with all constitution principles.

## Implementation Phases

### Phase 1: Setup

1. Install `@imgly/background-removal` dependency
2. Add shadcn/ui Switch component (if not present)

### Phase 2: Core Implementation

1. Create `lib/image-processing.ts` with:
   - `removeBackground(imageFile: File): Promise<Blob>`
   - `blobToFile(blob: Blob, filename: string): File`

### Phase 3: UI Integration

1. Add state to ImageUploadInput:
   - `autoRemoveBg` (boolean, default: true)
   - `isProcessingBg` (boolean)

2. Update `handleFileChange`:
   - Check toggle state
   - Process with removeBackground() if enabled
   - Show processing spinner
   - Fall back on error

3. Add UI elements:
   - Toggle switch with label
   - Processing overlay on ImagePreview

### Phase 4: Validation

1. Run `npm run lint`
2. Run `npm run build`
3. Manual testing per quickstart.md

## References

- [research.md](./research.md) - Decision records
- [quickstart.md](./quickstart.md) - Implementation steps
- [spec.md](./spec.md) - Full requirements
