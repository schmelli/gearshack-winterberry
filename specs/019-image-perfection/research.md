# Research: Image Perfection Sprint

**Feature**: 019-image-perfection
**Date**: 2025-12-06

## Research Areas

### 1. Cloud Functions nobgImages Format

**Question**: What is the exact structure of the `nobgImages` field from Cloud Functions?

**Decision**: Use flexible index signature with size keys

**Rationale**: Based on typical Cloud Functions image processing patterns and the spec assumptions:
- Output structure: `{ [size]: { png: string, webp?: string } }`
- Size keys are dynamic (e.g., "original", "thumbnail", "medium")
- PNG is required, WebP is optional future optimization

**Alternatives Considered**:
- Fixed enum for sizes - Rejected: Too rigid, hard to extend
- Array of images - Rejected: Harder to select by size

### 2. Image Display: object-cover vs object-contain

**Question**: What is the best CSS approach for gear product images?

**Decision**: Use `object-contain` with white background

**Rationale**:
- `object-cover`: Fills container, crops overflow - BAD for product images (hides details)
- `object-contain`: Fits within container, maintains aspect ratio - GOOD for products
- White background: Clean product photography aesthetic, works with transparent PNGs

**Alternatives Considered**:
- `object-cover` with larger container - Rejected: Still crops some images
- `object-fill` - Rejected: Distorts aspect ratio
- `object-none` - Rejected: No scaling, images overflow

### 3. Image Selection Priority

**Question**: Which image source should take priority?

**Decision**: nobgImages > primaryImageUrl > null

**Rationale**:
- Processed images (nobgImages) are professionally cleaned with background removal
- Legacy items only have primaryImageUrl
- Must gracefully handle items with neither

**Alternatives Considered**:
- User toggle between original/processed - Rejected: Over-engineering for MVP
- Always show original - Rejected: Wastes Cloud Function processing

### 4. Adapter Pass-Through Strategy

**Question**: How should the adapter handle nobgImages?

**Decision**: Simple pass-through with optional field

**Rationale**:
- Field is already in correct camelCase format from Cloud Functions
- No transformation needed (unlike snake_case legacy fields)
- Optional field - undefined when not present

**Alternatives Considered**:
- Deep validation of nobgImages structure - Rejected: Over-engineering, trust Cloud Function output
- Separate adapter for nobgImages - Rejected: Unnecessary complexity

## Existing Code Analysis

### Current Image Display (GearCard.tsx)

```typescript
// Line 165: Standard/Detailed view
className="object-cover"

// Line 85: Compact view
className="object-contain p-2"
```

Note: Compact already uses `object-contain` - only Standard/Detailed need updating.

### Current Image Source (GearCard.tsx)

```typescript
// Line 57
const showImage = item.primaryImageUrl && !imageError;
```

### Current Image Display (GearDetailModal.tsx)

```typescript
// Line 75-88
<div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
  {item.primaryImageUrl ? (
    <Image
      src={item.primaryImageUrl}
      ...
      className="object-cover"
    />
  ) : ...
```

## Implementation Notes

1. **Type Safety**: Add `NobgImage` and `NobgImages` interfaces before modifying GearItem
2. **Helper Function**: Create `getOptimizedImageUrl` in `lib/gear-utils.ts`
3. **Styling Consistency**: Use `bg-white` on all image containers (not `bg-muted`)
4. **Compact View**: Already uses `object-contain` - only add `bg-white`
5. **Error State**: Keep existing `imageError` state for fallback handling

## Validation Schema Update

Need to update `FirestoreGearItemSchema` in `lib/validations/adapter.ts`:

```typescript
nobgImages: z.record(z.object({
  png: z.string(),
  webp: z.string().optional(),
})).optional(),
```
