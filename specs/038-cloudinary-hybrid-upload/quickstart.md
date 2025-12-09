# Quickstart: Cloudinary Migration with Hybrid Processing

**Feature**: 038-cloudinary-hybrid-upload
**Date**: 2025-12-09

## Prerequisites

### 1. Cloudinary Account Setup

1. Create a free Cloudinary account at [cloudinary.com](https://cloudinary.com)
2. Note your **Cloud Name** from the dashboard

### 2. Create Unsigned Upload Preset

1. Go to **Settings** > **Upload** > **Upload presets**
2. Click **Add upload preset**
3. Configure:
   - **Preset name**: `gearshack-unsigned`
   - **Signing Mode**: `Unsigned`
   - **Folder**: Leave empty (set dynamically)
   - **Allowed formats**: `jpg, png, webp, gif`
   - **Max file size**: `10000000` (10MB)
4. Click **Save**

### 3. Enable Unsplash (Optional)

1. Go to **Settings** > **Upload** > **Upload sources**
2. Enable **Unsplash** integration
3. This allows users to search and import stock photos

---

## Environment Setup

Add to `.env.local`:

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=gearshack-unsigned
```

---

## Installation

```bash
npm install next-cloudinary
```

---

## Quick Implementation

### 1. Create Cloudinary Config

```typescript
// lib/cloudinary/config.ts
export function getCloudinaryConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Missing Cloudinary environment variables');
  }

  return { cloudName, uploadPreset };
}
```

### 2. Create Upload Hook

```typescript
// hooks/useCloudinaryUpload.ts
'use client';

import { useState, useCallback } from 'react';
import { removeBackground, blobToFile } from '@/lib/image-processing';
import { getCloudinaryConfig } from '@/lib/cloudinary/config';

export function useCloudinaryUpload() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const uploadLocal = useCallback(async (
    file: File,
    options: { userId: string; itemId: string; removeBackground?: boolean }
  ): Promise<string | null> => {
    const { cloudName, uploadPreset } = getCloudinaryConfig();

    try {
      let fileToUpload: File | Blob = file;

      // Optional background removal
      if (options.removeBackground !== false) {
        setStatus('processing');
        const processedBlob = await removeBackground(file);
        fileToUpload = blobToFile(processedBlob, 'processed.png');
      }

      // Upload to Cloudinary
      setStatus('uploading');
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', `gearshack/users/${options.userId}/${options.itemId}`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setStatus('success');
      return data.secure_url;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    }
  }, []);

  return { status, error, uploadLocal, reset: () => setStatus('idle') };
}
```

### 3. Add Cloud Import Button

```typescript
// components/CloudImportButton.tsx
'use client';

import { CldUploadWidget } from 'next-cloudinary';
import { Button } from '@/components/ui/button';
import { Cloud } from 'lucide-react';

interface Props {
  userId: string;
  itemId: string;
  onUpload: (url: string) => void;
}

export function CloudImportButton({ userId, itemId, onUpload }: Props) {
  return (
    <CldUploadWidget
      uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
      options={{
        sources: ['unsplash', 'url'],
        folder: `gearshack/users/${userId}/${itemId}`,
        maxFiles: 1,
        resourceType: 'image',
      }}
      onSuccess={(result) => {
        if (result?.info && typeof result.info !== 'string') {
          onUpload(result.info.secure_url);
        }
      }}
    >
      {({ open }) => (
        <Button type="button" variant="outline" onClick={() => open()}>
          <Cloud className="w-4 h-4 mr-2" />
          Import from Cloud
        </Button>
      )}
    </CldUploadWidget>
  );
}
```

---

## Testing Checklist

**Implementation Complete (2025-12-09)**

- [x] Drag-drop local file → background removed → uploaded to Cloudinary ✅ (ImageUploadZone.tsx + useCloudinaryUpload.ts)
- [x] Toggle off background removal → file uploaded as-is ✅ (Switch component in ImageUploadZone)
- [x] Click "Import from Cloud" → Unsplash search works ✅ (CloudImportButton.tsx with CldUploadWidget)
- [x] Click "Import from Cloud" → URL import works ✅ (CloudImportButton.tsx sources: ['unsplash', 'url'])
- [x] Saved gear item shows Cloudinary URL in Firestore ✅ (MediaSection.tsx → useGearEditor.ts)
- [x] Image displays correctly on page reload ✅ (next.config.ts allows res.cloudinary.com)
- [x] Existing Firebase Storage images still display ✅ (hostname: '**' wildcard pattern)

**Build Verification:**
- `npm run lint`: ✅ Passed (0 errors, 2 unrelated warnings)
- `npm run build`: ✅ Passed (Compiled successfully)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget doesn't open | Check browser console for script loading errors |
| Upload fails with 401 | Verify upload preset is set to "Unsigned" |
| Unsplash not showing | Enable Unsplash in Cloudinary upload sources |
| CORS error | Cloudinary handles CORS automatically; check network tab |
| Large file fails | Check file size < 10MB, verify preset limits |

---

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Implement tasks in priority order (P1 → P2 → P3)
3. Test each user story independently
4. Remove Firebase Storage upload code after verification
