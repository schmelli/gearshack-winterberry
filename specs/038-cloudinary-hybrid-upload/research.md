# Research: Cloudinary Migration with Hybrid Processing

**Feature**: 038-cloudinary-hybrid-upload
**Date**: 2025-12-09

## Decision Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Cloudinary SDK | `next-cloudinary` package | Official Next.js integration, App Router compatible, handles widget loading |
| Upload Method | Unsigned with upload preset | Client-side only, no server required, sufficient for MVP |
| Widget Sources | `['local', 'url', 'unsplash']` | Covers all user stories (local files, URLs, stock photos) |
| Folder Structure | `gearshack/users/{userId}/{itemId}` | Per-user/item organization, matches Firestore structure |
| Direct Upload API | Fetch POST to Cloudinary REST API | For local files after WASM processing (bypasses widget) |

---

## 1. Cloudinary Integration Approach

### Decision: Use `next-cloudinary` package

**Rationale**:
- Official package maintained by Cloudinary for Next.js
- Handles widget script loading and lifecycle
- Compatible with App Router (`"use client"` directive)
- Provides `CldUploadWidget` component with proper TypeScript types

**Alternatives Considered**:
- Direct Cloudinary Upload Widget SDK: More boilerplate, manual script loading
- Custom fetch implementation only: Loses widget benefits (Unsplash, URL imports)

**Source**: [Next Cloudinary - CldUploadWidget](https://next.cloudinary.dev/clduploadwidget/basic-usage)

### Implementation Pattern

```typescript
'use client';

import { CldUploadWidget } from 'next-cloudinary';
import type { CloudinaryUploadWidgetResults } from 'next-cloudinary';

interface ImageUploadProps {
  onUpload: (secureUrl: string) => void;
  userId: string;
  itemId: string;
}

export function CloudinaryUploadButton({ onUpload, userId, itemId }: ImageUploadProps) {
  return (
    <CldUploadWidget
      uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
      options={{
        sources: ['local', 'url', 'unsplash'],
        folder: `gearshack/users/${userId}/${itemId}`,
        maxFiles: 1,
        resourceType: 'image',
      }}
      onSuccess={(result: CloudinaryUploadWidgetResults) => {
        if (result?.info && typeof result.info !== 'string') {
          onUpload(result.info.secure_url);
        }
      }}
    >
      {({ open }) => (
        <button type="button" onClick={() => open()}>
          Import from Cloud
        </button>
      )}
    </CldUploadWidget>
  );
}
```

---

## 2. Unsigned Upload Configuration

### Decision: Unsigned uploads with upload preset

**Rationale**:
- Client-side only (no server-side signing required)
- Sufficient security for MVP (preset controls allowed file types/sizes)
- Simpler implementation, faster iteration

**Security Considerations**:
- Upload preset restricts: max file size (10MB), allowed types (images only)
- Folder paths include userId to prevent cross-user access
- Cannot overwrite existing assets (Cloudinary unsigned limitation)

**Source**: [Cloudinary Client-side Uploading](https://cloudinary.com/documentation/client_side_uploading)

### Required Cloudinary Dashboard Setup

1. Go to Settings > Upload > Upload Presets
2. Create new preset with:
   - **Name**: `gearshack-unsigned`
   - **Signing Mode**: Unsigned
   - **Folder**: Leave empty (set dynamically per upload)
   - **Allowed formats**: jpg, png, webp, gif
   - **Max file size**: 10MB

### Environment Variables

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=gearshack-unsigned
```

---

## 3. Hybrid Upload Pipeline

### Decision: Two separate pipelines

**Pipeline 1: Local Files (with WASM processing)**
```
Local File → WASM Background Removal → Cloudinary REST API Upload
```

**Pipeline 2: Cloud Sources (via Widget)**
```
Cloudinary Widget → Direct to Cloudinary (no local processing)
```

**Rationale**:
- Local files benefit from free WASM background removal
- Cloud sources (Unsplash, URLs) don't need background removal
- Keeps widget simple for cloud imports

### Direct Upload API (for processed files)

After WASM processing, upload the resulting Blob directly via fetch:

```typescript
async function uploadToCloudinary(
  file: File | Blob,
  userId: string,
  itemId: string
): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset!);
  formData.append('folder', `gearshack/users/${userId}/${itemId}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return data.secure_url;
}
```

**Source**: [Cloudinary Upload API Reference](https://cloudinary.com/documentation/image_upload_api_reference)

---

## 4. Folder Organization

### Decision: `gearshack/users/{userId}/{itemId}/`

**Rationale**:
- Matches Firestore structure (`userBase/{uid}/gearInventory/{itemId}`)
- Enables per-user cleanup/migration
- Supports future per-item galleries (multiple images)

**Note**: For new items without an ID yet, use a temporary ID or upload after item creation.

---

## 5. Existing Code Analysis

### Files to Modify

| File | Change |
|------|--------|
| `hooks/useImageUpload.ts` | Replace Firebase upload with Cloudinary upload |
| `lib/firebase/storage.ts` | Remove `uploadGearImage`, keep display helpers |
| `components/gear/ImageUploadInput.tsx` | Add cloud import button, background removal toggle |
| `lib/image-processing.ts` | Keep as-is (WASM background removal) |

### Files to Create

| File | Purpose |
|------|---------|
| `hooks/useCloudinaryUpload.ts` | Cloudinary upload logic with progress |
| `lib/cloudinary/config.ts` | Environment variable validation |
| `types/cloudinary.ts` | TypeScript interfaces |

---

## 6. Dependencies

### New Package

```bash
npm install next-cloudinary
```

**Package Details**:
- `next-cloudinary`: ^6.x (latest)
- Includes TypeScript types
- ~50KB gzipped

### Existing Packages (unchanged)

- `@imgly/background-removal`: WASM-based background removal
- `firebase`: Firestore for storing URLs (keep)
- `sonner`: Toast notifications

---

## 7. Migration Strategy

### Phase 1: Add Cloudinary (New Uploads)
- New uploads go to Cloudinary
- Existing Firebase Storage URLs continue to work
- No data migration required

### Phase 2: Cleanup (Post-Verification)
- Remove Firebase Storage upload code
- Keep Firebase Storage display helpers for legacy images
- Optionally migrate existing images (out of scope for MVP)

---

## Sources

- [Next Cloudinary - CldUploadWidget](https://next.cloudinary.dev/clduploadwidget/basic-usage)
- [CldUploadWidget Configuration](https://next.cloudinary.dev/clduploadwidget/configuration)
- [Cloudinary Upload Widget](https://cloudinary.com/documentation/upload_widget)
- [Cloudinary Client-side Uploading](https://cloudinary.com/documentation/client_side_uploading)
- [Cloudinary Upload API Reference](https://cloudinary.com/documentation/image_upload_api_reference)
