# Quickstart: Stabilization Sprint - i18n, Image Domains & MIME Fixes

**Feature**: 036-stabilization-sprint
**Date**: 2025-12-08

## Prerequisites

- Node.js 18+
- npm
- Access to the repository

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

### 3. Manual Testing

#### Test 1: i18n Error Fix (User Story 1)

1. Navigate to `http://localhost:3000/en/inventory`
2. **Expected**: Page loads without errors
3. If items exist, verify "Showing X of Y items" displays correctly
4. Switch to `http://localhost:3000/de/inventory`
5. **Expected**: German translation "Zeige X von Y Gegenständen" displays

**Pass Criteria**: No console errors, counts display correctly in both locales

#### Test 2: External Image Display (User Story 2)

1. Navigate to any gear item with an external image URL
2. **Expected**: Image loads and displays without errors
3. Try adding an item with an image from:
   - fjellsport.no
   - rei.com
   - Any other HTTPS domain
4. **Expected**: All images display correctly

**Pass Criteria**: No "hostname not allowed" errors

#### Test 3: Image Upload MIME Type (User Story 3)

1. Create or edit a gear item
2. Use image search to find an external image
3. Select the image and save
4. **Expected**: Save completes successfully
5. View the item - image should be displayed

**Pass Criteria**: No "Storage rejected file" errors, image displays after save

## Key Files

| File | Change |
|------|--------|
| `app/[locale]/inventory/page.tsx` | Pass i18n parameters |
| `components/inventory-gallery/GalleryToolbar.tsx` | Use pre-formatted strings |
| `hooks/useGearEditor.ts` | Validate MIME type |
| `next.config.ts` | Already has wildcard domains (no change) |

## Troubleshooting

### "FORMATTING_ERROR" in console

- Ensure `t('showingItems', { filtered, total })` is called with parameters
- Check that `filteredCount` and `itemCount` are available in scope

### Image not loading from external domain

- Verify `next.config.ts` has `hostname: '**'` in remotePatterns
- Check browser console for specific error message

### Save fails after image import

- Check console for Firebase Storage rejection reason
- Verify MIME type is being set correctly (`image/jpeg` fallback)
- Check that proxy route is returning valid image data

## Build Verification

```bash
npm run lint
npm run build
```

Both commands should complete without errors.
