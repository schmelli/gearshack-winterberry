# Implementation Plan: Image Perfection Sprint

**Branch**: `019-image-perfection` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-image-perfection/spec.md`

## Summary

Fix image display issues in GearCard and GearDetailModal by switching from `object-cover` to `object-contain` (prevents cropping), adding white backgrounds for transparent PNGs, and consuming the `nobgImages` field from Cloud Functions for professionally processed background-removed images.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, shadcn/ui, Tailwind CSS 4
**Storage**: Firebase Firestore (`userBase/{uid}/gearInventory` - nobgImages field from Cloud Functions)
**Testing**: Manual testing (visual verification)
**Target Platform**: Web (all modern browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: No additional network requests - use existing Firestore data
**Constraints**: Backward compatible with legacy items that lack nobgImages
**Scale/Scope**: 3 files modified (types, adapter, 2 components)

## Constitution Check

*GATE: Must pass before implementation.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | PASS | Image selection logic in helper function, UI components remain stateless |
| II. TypeScript Strict Mode | PASS | Adding typed `NobgImage` interface with proper structure |
| III. Design System Compliance | PASS | Using Tailwind classes (object-contain, bg-white), no new components |
| IV. Spec-Driven Development | PASS | Spec completed first with user stories and acceptance criteria |
| V. Import and File Organization | PASS | Types in @/types, helper in lib, components in existing locations |

**All gates pass.**

## Project Structure

### Documentation (this feature)

```text
specs/019-image-perfection/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Specification checklist
```

### Source Code Changes

```text
types/
└── gear.ts                     # MODIFY: Add NobgImage interface and nobgImages field

lib/
└── gear-utils.ts               # MODIFY: Add getOptimizedImageUrl helper function

lib/firebase/
└── adapter.ts                  # MODIFY: Pass through nobgImages from Firestore

lib/validations/
└── adapter.ts                  # MODIFY: Update Zod schema for nobgImages field

components/inventory-gallery/
└── GearCard.tsx                # MODIFY: Use object-contain, bg-white, getOptimizedImageUrl

components/loadouts/
└── GearDetailModal.tsx         # MODIFY: Use object-contain, bg-white, getOptimizedImageUrl
```

**Structure Decision**: Minimal file modifications. Type extension in existing gear.ts, helper function in existing gear-utils.ts, component updates for styling and image source.

## Key Implementation Details

### NobgImage Interface (types/gear.ts)

```typescript
/** Single processed image from Cloud Functions */
export interface NobgImage {
  png: string;
  webp?: string;
}

/** Collection of processed images by size */
export interface NobgImages {
  [size: string]: NobgImage;
}

// Add to GearItem interface:
nobgImages?: NobgImages;
```

### Image Selection Helper (lib/gear-utils.ts)

```typescript
/**
 * Returns the best available image URL for a gear item
 * Priority: nobgImages (first PNG) > primaryImageUrl > null
 */
export function getOptimizedImageUrl(item: GearItem): string | null {
  // Check for processed images first
  if (item.nobgImages) {
    const firstSize = Object.values(item.nobgImages)[0];
    if (firstSize?.png) {
      return firstSize.png;
    }
  }

  // Fall back to primary image
  return item.primaryImageUrl;
}
```

### GearCard Changes

1. Replace `object-cover` with `object-contain`
2. Add `bg-white` to image containers
3. Use `getOptimizedImageUrl(item)` instead of `item.primaryImageUrl`

### GearDetailModal Changes

1. Replace `object-cover` with `object-contain`
2. Change `bg-muted` to `bg-white` on image container
3. Use `getOptimizedImageUrl(item)` instead of `item.primaryImageUrl`

### Adapter Changes

Pass through `nobgImages` field from Firestore:
```typescript
nobgImages: validated.nobgImages ?? undefined,
```

## Validation Requirements

- [ ] npm run lint passes
- [ ] npm run build passes
- [ ] Images display without cropping in all density modes
- [ ] Processed images appear when nobgImages exists
- [ ] Fallback to primaryImageUrl works for legacy items
- [ ] Transparent PNGs show white background
