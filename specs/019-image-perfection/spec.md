# Feature Specification: Image Perfection Sprint

**ID**: 019-image-perfection
**Created**: 2025-12-06
**Status**: Draft

## Problem Statement

Users currently experience two image display issues in the gear inventory:

1. **Cropping Problem**: Images use `object-cover` which crops product images, hiding important details like handles, straps, or labels
2. **Background Removal Results Unused**: Cloud Functions process uploaded images and generate optimized `nobgImages` with background removal, but these results are never displayed to users

This results in a suboptimal visual experience where carefully processed images are wasted and product details are lost to cropping.

## User Stories

### US1: Preserve Full Image Content (Priority: P1)

**As a** gear enthusiast viewing my inventory,
**I want** to see my gear images without cropping,
**So that** I can view the complete product including all edges and details.

**Acceptance Criteria**:
- Images display using `object-contain` instead of `object-cover`
- Image containers have white background (`bg-white`) for transparent PNG support
- No part of the gear image is cropped or hidden
- Images maintain aspect ratio without distortion

**Acceptance Scenarios**:
1. **Given** a gear item with a tall/narrow product image, **When** viewing in gallery, **Then** the full image is visible with white padding on sides
2. **Given** a gear item with a wide product image, **When** viewing in gallery, **Then** the full image is visible with white padding on top/bottom
3. **Given** a gear item with a transparent PNG, **When** viewing in gallery, **Then** the transparent areas show as white background

### US2: Display Background-Removed Images (Priority: P1)

**As a** gear enthusiast who has uploaded images,
**I want** to see the professionally processed background-removed versions,
**So that** my gear displays with clean, consistent product-style photography.

**Acceptance Criteria**:
- GearCard component uses `nobgImages` when available
- Falls back to `primaryImageUrl` when no processed images exist
- Helper function selects the best available optimized image
- Image selection priority: nobgImages.png > primaryImageUrl

**Acceptance Scenarios**:
1. **Given** a gear item with `nobgImages` data, **When** viewing in gallery, **Then** the processed image is displayed
2. **Given** a gear item without `nobgImages` data, **When** viewing in gallery, **Then** the `primaryImageUrl` is displayed
3. **Given** a gear item with neither, **When** viewing in gallery, **Then** the category placeholder is shown

### US3: Type System Support (Priority: P1)

**As a** developer working with gear items,
**I want** the `nobgImages` field properly typed in the GearItem interface,
**So that** TypeScript provides autocomplete and type safety for processed images.

**Acceptance Criteria**:
- `NobgImage` interface defines the structure from Cloud Functions
- `GearItem` interface includes optional `nobgImages` field
- Adapter passes through `nobgImages` from Firestore documents
- Type definitions match the Cloud Function output format

**Acceptance Scenarios**:
1. **Given** TypeScript code accessing `item.nobgImages`, **When** compiling, **Then** proper type inference is available
2. **Given** Firestore document with `nobgImages` field, **When** loading via adapter, **Then** the field is preserved in the GearItem

### US4: Detail Modal Image Optimization (Priority: P2)

**As a** user viewing gear item details,
**I want** the detail modal to also display optimized images,
**So that** I get the same clean visual experience in all views.

**Acceptance Criteria**:
- GearDetailModal uses the same image selection logic as GearCard
- Detail view displays processed images when available
- Consistent visual treatment between gallery and detail views

**Acceptance Scenarios**:
1. **Given** clicking on a gear card with processed images, **When** the detail modal opens, **Then** the processed image is displayed

## Edge Cases

1. **Legacy Items**: Items created before Cloud Functions processing should gracefully fall back to `primaryImageUrl`
2. **Processing In Progress**: Items where Cloud Functions haven't completed yet show original image
3. **Multiple nobgImages**: When multiple sizes exist in `nobgImages`, select the first available PNG
4. **Corrupted nobgImages**: If `nobgImages` exists but has invalid structure, fall back to `primaryImageUrl`

## Out of Scope

- Cloud Functions implementation (already exists)
- Image upload changes
- Re-processing existing images
- Adding multiple image size variants (future enhancement)
- Gallery image support (only primary image in this sprint)

## Success Criteria

1. All gear images display without cropping in gallery view
2. Processed background-removed images are visible when available
3. Transparent PNGs display correctly on white background
4. No TypeScript errors related to `nobgImages` field
5. Build and lint pass without errors

## Dependencies

- Firebase Cloud Functions (already deployed, generating `nobgImages`)
- Existing GearCard component
- Existing GearDetailModal component
- Firestore adapter

## Assumptions

- Cloud Functions output format: `{ nobgImages: { [size]: { png: string, webp?: string } } }`
- Only PNG format needed for MVP (webp is optional future optimization)
- White background is acceptable for all image containers
