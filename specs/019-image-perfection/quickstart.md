# Quickstart: Image Perfection Sprint

**Feature**: 019-image-perfection
**Date**: 2025-12-06

## Overview

This sprint fixes image display in the gear inventory by:
1. Preventing cropping with `object-contain`
2. Adding white backgrounds for transparent PNGs
3. Consuming processed `nobgImages` from Cloud Functions

## Files to Modify

| File | Changes |
|------|---------|
| `types/gear.ts` | Add `NobgImage`, `NobgImages` interfaces; add field to `GearItem` |
| `lib/gear-utils.ts` | Add `getOptimizedImageUrl` helper function |
| `lib/validations/adapter.ts` | Add `nobgImages` to Zod schema |
| `lib/firebase/adapter.ts` | Pass through `nobgImages` field |
| `components/inventory-gallery/GearCard.tsx` | Use `object-contain`, `bg-white`, new helper |
| `components/loadouts/GearDetailModal.tsx` | Use `object-contain`, `bg-white`, new helper |

## Implementation Order

### Phase 1: Types (T001)

Add to `types/gear.ts`:

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

// In GearItem interface, add:
nobgImages?: NobgImages;
```

### Phase 2: Helper Function (T002)

Add to `lib/gear-utils.ts`:

```typescript
import type { GearItem } from '@/types/gear';

/**
 * Returns the best available image URL for a gear item
 * Priority: nobgImages (first PNG) > primaryImageUrl > null
 */
export function getOptimizedImageUrl(item: GearItem): string | null {
  if (item.nobgImages) {
    const firstSize = Object.values(item.nobgImages)[0];
    if (firstSize?.png) {
      return firstSize.png;
    }
  }
  return item.primaryImageUrl;
}
```

### Phase 3: Validation Schema (T003)

Add to `lib/validations/adapter.ts` Zod schema:

```typescript
nobgImages: z.record(z.object({
  png: z.string(),
  webp: z.string().optional(),
})).optional(),
```

### Phase 4: Adapter (T004)

Update `lib/firebase/adapter.ts` in `adaptGearItem`:

```typescript
// In the return statement, add:
nobgImages: validated.nobgImages ?? undefined,
```

### Phase 5: GearCard (T005)

Update `components/inventory-gallery/GearCard.tsx`:

1. Import helper:
   ```typescript
   import { getOptimizedImageUrl } from '@/lib/gear-utils';
   ```

2. Update image source check:
   ```typescript
   const optimizedImageUrl = getOptimizedImageUrl(item);
   const showImage = optimizedImageUrl && !imageError;
   ```

3. Update compact view container (add `bg-white`):
   ```typescript
   <div className="h-24 w-24 flex-shrink-0 bg-white relative ...">
   ```

4. Update standard/detailed view:
   - Container: change `bg-muted` to `bg-white`
   - Image: change `object-cover` to `object-contain`
   - Use `optimizedImageUrl` as src

### Phase 6: GearDetailModal (T006)

Update `components/loadouts/GearDetailModal.tsx`:

1. Import helper:
   ```typescript
   import { getOptimizedImageUrl } from '@/lib/gear-utils';
   ```

2. Get optimized URL:
   ```typescript
   const optimizedImageUrl = getOptimizedImageUrl(item);
   ```

3. Update image container:
   - Change `bg-muted` to `bg-white`
   - Change `object-cover` to `object-contain`
   - Use `optimizedImageUrl` as src

### Phase 7: Validation (T007-T008)

```bash
npm run lint
npm run build
```

## Testing Checklist

- [ ] Compact view: Images not cropped, white background
- [ ] Standard view: Images not cropped, white background
- [ ] Detailed view: Images not cropped, white background
- [ ] Detail modal: Images not cropped, white background
- [ ] Items with nobgImages: Show processed image
- [ ] Legacy items: Show primaryImageUrl
- [ ] Items with no images: Show placeholder
- [ ] Transparent PNGs: Show white background (not gray)

## Rollback

If issues arise:
1. Revert `object-contain` → `object-cover`
2. Revert `bg-white` → `bg-muted`
3. Revert to `item.primaryImageUrl` directly
