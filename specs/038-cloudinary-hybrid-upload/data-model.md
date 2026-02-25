# Data Model: Cloudinary Migration with Hybrid Processing

**Feature**: 038-cloudinary-hybrid-upload
**Date**: 2025-12-09

## Entity Changes

### GearItem (Existing - Modified)

The `GearItem` entity already has an `imageUrl` field that stores image URLs. No schema changes required - the field will now store Cloudinary `secure_url` values instead of Firebase Storage URLs.

```typescript
interface GearItem {
  id: string;
  // ... existing fields ...

  /**
   * Primary image URL.
   * - New uploads: Cloudinary secure_url (https://res.cloudinary.com/...)
   * - Legacy items: Firebase Storage URL (https://firebasestorage.googleapis.com/...)
   */
  imageUrl?: string;

  // ... existing fields ...
}
```

**Backward Compatibility**: Existing Firebase Storage URLs remain valid. The app displays images from either source transparently via Next.js Image component or standard img tags.

---

## New Types

### CloudinaryConfig

Configuration for Cloudinary integration.

```typescript
// types/cloudinary.ts

export interface CloudinaryConfig {
  /** Cloudinary cloud name (from dashboard) */
  cloudName: string;
  /** Unsigned upload preset name */
  uploadPreset: string;
}
```

### CloudinaryUploadResult

Response from Cloudinary after successful upload.

```typescript
// types/cloudinary.ts

export interface CloudinaryUploadResult {
  /** Full CDN URL with HTTPS */
  secure_url: string;
  /** Unique identifier for the asset */
  public_id: string;
  /** Original filename */
  original_filename: string;
  /** File format (jpg, png, etc.) */
  format: string;
  /** File size in bytes */
  bytes: number;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Resource type (image, video, raw) */
  resource_type: 'image' | 'video' | 'raw';
  /** Upload timestamp */
  created_at: string;
  /** Folder path in Cloudinary */
  folder: string;
}
```

### UploadPipeline

Discriminated union for upload pipeline types.

```typescript
// types/cloudinary.ts

export type UploadPipeline =
  | { type: 'local'; removeBackground: boolean }
  | { type: 'cloud'; source: 'unsplash' | 'url' | 'local' };
```

### CloudinaryUploadState

State for upload progress tracking.

```typescript
// types/cloudinary.ts

export type CloudinaryUploadStatus =
  | 'idle'
  | 'processing'  // WASM background removal
  | 'uploading'   // Cloudinary upload
  | 'success'
  | 'error';

export interface CloudinaryUploadState {
  status: CloudinaryUploadStatus;
  progress?: number;  // 0-100 for upload progress
  error?: string;
  result?: CloudinaryUploadResult;
}
```

---

## State Transitions

### Upload State Machine

```
┌─────────┐
│  idle   │
└────┬────┘
     │ User drops file / clicks widget
     ▼
┌─────────────┐
│ processing  │ (only for local files with bg removal)
└──────┬──────┘
       │ WASM complete
       ▼
┌─────────────┐
│  uploading  │
└──────┬──────┘
       │
   ┌───┴───┐
   ▼       ▼
┌─────┐ ┌─────┐
│success│ │error│
└─────┘ └─────┘
```

---

## Validation Rules

### File Validation (Client-Side)

| Rule | Constraint | Error Message |
|------|------------|---------------|
| File type | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | "Please select a valid image file (JPG, PNG, WebP, or GIF)" |
| File size | ≤ 10MB | "File size must be less than 10MB" |
| File presence | Required | "Please select an image" |

### Upload Preset Validation (Cloudinary-Side)

Configured in Cloudinary dashboard upload preset:
- Max file size: 10MB
- Allowed formats: jpg, png, webp, gif
- Unsigned mode: enabled

---

## Folder Structure (Cloudinary)

```
gearshack/
└── users/
    └── {userId}/
        └── {itemId}/
            └── {filename}.{ext}
```

**Example**:
```
gearshack/users/abc123/gear-item-xyz/product-image.png
```

**Note**: For new items not yet saved, use a temporary UUID as `itemId`, then the URL is stored when the item is saved.

---

## Environment Variables

```typescript
// Required environment variables

interface CloudinaryEnv {
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: string;  // e.g., "gearshack"
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: string;  // e.g., "gearshack-unsigned"
}
```

**Validation**: App should fail fast on startup if these are missing.
