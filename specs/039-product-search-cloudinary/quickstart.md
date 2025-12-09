# Quickstart: Restore Product Search with Cloudinary Integration

**Feature**: 039-product-search-cloudinary
**Date**: 2025-12-09

## Prerequisites

1. **Serper.dev API Key** - Must be configured in `.env.local`:
   ```
   SERPER_API_KEY=your_api_key_here
   ```

2. **Cloudinary Configuration** - Already configured from Feature 038:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=gearshack_web_uploads
   ```

3. **Development Server**:
   ```bash
   npm run dev
   ```

## Quick Test

### 1. Navigate to Gear Editor
```
http://localhost:3000/en/inventory/new
```

### 2. Test Product Search
1. In the Media section, find the search input at the top
2. Enter a product name: "MSR Hubba Hubba tent"
3. Click the Search button (or press Enter)
4. Observe: Loading spinner appears, then 3x3 grid of images

### 3. Test Image Selection
1. Click any image in the search results
2. Observe: Loading indicator shows "Uploading to Cloudinary..."
3. Observe: Image appears in preview after upload completes
4. Check browser Network tab: Request to `api.cloudinary.com` with URL payload

### 4. Test Form Save
1. Fill in required fields (Name, Category)
2. Click Save
3. Verify: Item saved with Cloudinary URL in Firestore

## Key Files

| File | Purpose |
|------|---------|
| `hooks/useProductSearch.ts` | NEW: Search state management |
| `hooks/useCloudinaryUpload.ts` | MODIFIED: Added `uploadUrl` method |
| `components/gear-editor/ProductSearchGrid.tsx` | NEW: Search results grid |
| `components/gear-editor/ImageUploadZone.tsx` | MODIFIED: Added search UI |
| `app/actions/image-search.ts` | EXISTING: Serper server action |

## API Contracts

### Serper Image Search (Existing)
```typescript
// app/actions/image-search.ts
export async function searchGearImages(query: string): Promise<ImageSearchResult[]>
```

### Cloudinary URL Upload (New)
```typescript
// hooks/useCloudinaryUpload.ts
uploadUrl: (url: string, options: { userId: string; itemId: string }) => Promise<string | null>
```

## Architecture Overview

```
User Action                    Hook Layer                 External Service
─────────────────────────────────────────────────────────────────────────
[Type search]           →   useProductSearch           →   Serper.dev API
       ↓
[See results grid]      ←   ProductSearchGrid
       ↓
[Click image]           →   useCloudinaryUpload        →   Cloudinary API
       ↓                     .uploadUrl()
[See Cloudinary URL]    ←   ImageUploadZone
       ↓
[Save form]             →   useGearEditor              →   Firestore
```

## Testing Checklist

### Build Verification (2025-12-09)
- [x] `npm run lint` - Passed (only unrelated warnings in GearCard.tsx)
- [x] `npm run build` - Passed (production build successful)

### Functional Tests (Manual)
- [ ] Search input visible at top of Media section
- [ ] Search returns 9 product images in 3x3 grid
- [ ] Loading indicator during search
- [ ] Clicking image triggers Cloudinary upload
- [ ] Upload progress indicator visible
- [ ] Cloudinary URL populates form field
- [ ] Existing drag-and-drop still works
- [ ] Existing Cloud Import (Unsplash) still works
- [ ] Error message on search failure
- [ ] Error message on upload failure
- [ ] Empty state when no search results (toast notification)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No search results | Check SERPER_API_KEY in .env.local |
| Upload fails | Verify Cloudinary preset is "Unsigned" |
| CORS error on image | Cloudinary handles this - check network tab |
| Slow uploads | External URL fetched by Cloudinary server-side |

## Success Criteria Verification

| Criteria | How to Verify |
|----------|---------------|
| SC-001: Search + upload < 15s | Time from search click to image preview |
| SC-002: Search results < 3s | Time from search click to grid display |
| SC-003: 90% upload success | Test 10 different product images |
| SC-004: Find specific products | Search "Nitecore NB10000", verify product images (not stock) |
| SC-005: Actionable errors | Disconnect network, verify message |
| SC-006: Existing workflows work | Test drag-drop and Cloud Import |
