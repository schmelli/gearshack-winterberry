# Implementation Plan: Total Freedom Sprint

**Branch**: `025-image-freedom-fix` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-image-freedom-fix/spec.md`

## Summary

Fix two critical bugs affecting image management:
1. **Image deletion not persisting**: Use Firestore `deleteField()` sentinel instead of `null` to properly remove image references
2. **External domains blocked**: Replace domain whitelist with wildcard pattern to allow all HTTPS images

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Next.js 16+ (App Router)
**Primary Dependencies**: Firebase Firestore SDK, Next.js Image component
**Storage**: Firebase Firestore (`userBase/{uid}/gearInventory`)
**Testing**: Manual testing + lint + build validation
**Target Platform**: Web (all modern browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: No impact (minimal code change)
**Constraints**: Must maintain Flutter app data compatibility
**Scale/Scope**: 2 bug fixes, ~20 lines of code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Max 3 active projects: This is the only active feature
- [x] Logic in hooks: Changes are in hooks/useStore.ts
- [x] No CSS files: Only TypeScript and config changes
- [x] Use shadcn/ui: No UI changes required
- [x] File size < 500 lines: useStore.ts is 609 lines - minor addition acceptable

## Project Structure

### Documentation (this feature)

```text
specs/025-image-freedom-fix/
├── plan.md              # This file
├── research.md          # DR-001 through DR-005
├── quickstart.md        # Implementation steps
├── checklists/
│   └── requirements.md  # Validation checklist
└── spec.md              # Feature specification
```

### Source Code (repository root)

```text
hooks/
└── useStore.ts          # Add deleteField() logic for image removal

next.config.ts           # Add wildcard hostname pattern
```

**Structure Decision**: Minimal changes to existing files. No new files needed.

## Complexity Tracking

No violations - this is a simple 2-file bug fix.

## Implementation Strategy

### Phase 1: Image Deletion Fix (User Story 1)

**File**: `hooks/useStore.ts`

1. Add `deleteField` to import from 'firebase/firestore'
2. In `updateItem()` function, before `updateDoc()` call:
   - Check if `primaryImageUrl` is `null` in updates
   - If yes, transform to use `deleteField()` for `primary_image` and `nobgImages`
   - Remove the `primaryImageUrl` key from updates object

### Phase 2: External Domains Fix (User Story 2)

**File**: `next.config.ts`

1. Replace the current `remotePatterns` array with single wildcard entry:
   ```typescript
   remotePatterns: [
     {
       protocol: 'https',
       hostname: '**',
     },
   ],
   ```

### Phase 3: Validation

1. Run `npm run lint`
2. Run `npm run build`
3. Manual testing per quickstart.md

## References

- [research.md](./research.md) - Decision records
- [quickstart.md](./quickstart.md) - Implementation steps
- [spec.md](./spec.md) - Full requirements
