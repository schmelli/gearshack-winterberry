# Data Model: Secure Asset Pipeline Sprint

**Feature**: 032-secure-asset-pipeline
**Date**: 2025-12-08

## Overview

This feature does not introduce new persistent data models. It modifies the behavior of existing entities during save operations.

## Affected Entities

### GearItem (Existing - Behavior Change)

The `primaryImageUrl` field behavior changes:

**Before**: Could contain either Firebase Storage URL or external URL
**After**: Always contains Firebase Storage URL for saved items (external URLs are imported during save)

```typescript
interface GearItem {
  // ... other fields
  primaryImageUrl: string | null;  // NOW: Always internal URL after save
  // ... other fields
}
```

## Transient Types (Not Persisted)

### ProxyImageRequest

Request to the image proxy endpoint:

```typescript
interface ProxyImageRequest {
  url: string;  // External image URL to fetch
}
```

**Validation Rules**:
- `url` must be a valid HTTP/HTTPS URL
- `url` must not point to localhost or internal IPs
- Response content-type must start with `image/`

### ProxyImageResponse

Success: Binary image data with appropriate content-type header
Error: JSON response with error details

```typescript
// Error response shape
interface ProxyImageError {
  error: string;    // Error code (INVALID_URL, NOT_IMAGE, etc.)
  message: string;  // Human-readable message
}
```

### ImportedImageFile

Client-side representation of downloaded image:

```typescript
// Created from proxy response blob
const file = new File([blob], `imported_image${extension}`, {
  type: contentType,  // e.g., 'image/jpeg'
});
```

## Helper Functions

### isExternalUrl

Determines if a URL needs to be imported:

```typescript
function isExternalUrl(url: string): boolean {
  // Returns true if URL is:
  // - Starts with http:// or https://
  // - Does NOT contain 'firebasestorage.googleapis.com'
}
```

### getExtensionFromContentType

Maps MIME type to file extension:

```typescript
function getExtensionFromContentType(contentType: string): string {
  // 'image/jpeg' → '.jpg'
  // 'image/png' → '.png'
  // 'image/gif' → '.gif'
  // 'image/webp' → '.webp'
  // default → '.jpg'
}
```

## State Transitions

### Image URL During Save

```
External URL (from search) → Proxy Fetch → Blob → File → Upload → Firebase URL

States:
1. IDLE: Form has external URL in primaryImageUrl field
2. IMPORTING: Fetching via proxy, toast shows "Importing image..."
3. UPLOADING: Uploading to Firebase Storage, reuses existing upload logic
4. SAVED: Firebase URL stored in Firestore
```

### Skip Path (Already Internal)

```
Firebase URL → No processing → Same URL saved

States:
1. IDLE: Form has Firebase URL in primaryImageUrl field
2. SAVED: Same URL stored in Firestore (no intermediate steps)
```

## Error States

| Error | Cause | User Message |
|-------|-------|--------------|
| INVALID_URL | URL validation failed | "Invalid image URL. Please try a different image." |
| NOT_IMAGE | Content-type not image/* | "The URL does not point to an image. Please try a different image." |
| FETCH_FAILED | Network error or timeout | "Could not download image. Please try again or use direct upload." |
| UPLOAD_FAILED | Firebase upload error | "Could not save image. Please try again." |
