# Quickstart: Secure Asset Pipeline Sprint

**Feature**: 032-secure-asset-pipeline
**Date**: 2025-12-08

## Implementation Sequence

### Step 1: Create Image Proxy API Route

**File**: `app/api/proxy-image/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// SSRF protection: block internal URLs
function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Block private IP ranges
    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
    ];

    return privatePatterns.some(pattern => pattern.test(hostname));
  } catch {
    return true; // Invalid URL = blocked
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  // Validate URL presence
  if (!url) {
    return NextResponse.json(
      { error: 'MISSING_URL', message: 'URL parameter is required' },
      { status: 400 }
    );
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return NextResponse.json(
      { error: 'INVALID_URL', message: 'Invalid or malformed URL' },
      { status: 400 }
    );
  }

  // SSRF protection
  if (isBlockedUrl(url)) {
    return NextResponse.json(
      { error: 'BLOCKED_URL', message: 'URLs pointing to localhost or internal IPs are not allowed' },
      { status: 400 }
    );
  }

  try {
    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GearshackImageProxy/1.0',
      },
    });

    clearTimeout(timeout);

    // Handle 404
    if (response.status === 404) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Image not found at the specified URL' },
        { status: 404 }
      );
    }

    // Validate content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'NOT_IMAGE', message: 'The URL does not point to an image' },
        { status: 403 }
      );
    }

    // Check size limit (10MB)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'TOO_LARGE', message: 'Image exceeds maximum size of 10MB' },
        { status: 413 }
      );
    }

    // Get image data
    const imageBuffer = await response.arrayBuffer();

    // Double-check size after download
    if (imageBuffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'TOO_LARGE', message: 'Image exceeds maximum size of 10MB' },
        { status: 413 }
      );
    }

    // Return proxied image
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'TIMEOUT', message: 'Request to source timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'FETCH_FAILED', message: 'Failed to retrieve image from source' },
      { status: 500 }
    );
  }
}
```

### Step 2: Add Helper Functions to useGearEditor

**File**: `hooks/useGearEditor.ts`

Add at top of file:

```typescript
// Helper: Check if URL is external (needs import)
function isExternalUrl(url: string | null): boolean {
  if (!url) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  return !url.includes('firebasestorage.googleapis.com');
}

// Helper: Get file extension from content type
function getExtensionFromContentType(contentType: string): string {
  const mapping: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  };
  return mapping[contentType] || '.jpg';
}

// Helper: Import external image via proxy
async function importExternalImage(url: string): Promise<File> {
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to import image');
  }

  const blob = await response.blob();
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const extension = getExtensionFromContentType(contentType);

  return new File([blob], `imported_image${extension}`, { type: contentType });
}
```

### Step 3: Modify handleSubmit in useGearEditor

In the `handleSubmit` function, add image import logic before the save:

```typescript
// Inside handleSubmit, before calling addItem/updateItem:

// Check if we need to import an external image
if (isExternalUrl(data.primaryImageUrl)) {
  toast.info('Importing image...');
  try {
    const importedFile = await importExternalImage(data.primaryImageUrl);
    // Upload the imported file using existing uploadGearImage
    const uploadedUrl = await uploadGearImage(importedFile, user.uid, itemId);
    data.primaryImageUrl = uploadedUrl;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to import image');
    setIsSubmitting(false);
    return;
  }
}
```

## Testing Checklist

1. **New item with external image**: Create item, search for image, select, save. Verify saved URL is Firebase Storage URL.

2. **Edit item with internal image**: Edit existing item (don't change image), save. Verify no re-upload occurs.

3. **Invalid URL handling**: Manually test proxy with non-image URL. Verify error response.

4. **Large file rejection**: Test with image > 10MB. Verify rejection.

5. **Network error handling**: Test with unreachable URL. Verify graceful error.

## Key Points

- External URL detection uses simple string check for `firebasestorage.googleapis.com`
- Proxy follows redirects automatically (handled by fetch)
- Same 10MB limit as direct uploads
- Toast feedback during import process
- Error messages map to user-friendly text
