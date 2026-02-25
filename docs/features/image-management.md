# Image Management

**Status**: ✅ Active
**Features**: 038-cloudinary-hybrid-upload, 048-ai-loadout-image-gen, 019-image-perfection
**Primary Hook**: `hooks/useCloudinaryUpload.ts`
**CDN**: Cloudinary (res.cloudinary.com)

## Overview

Gearshack nutzt **Cloudinary** als CDN für alle Bilder. Das Image Management System bietet mehrere Upload-Wege, automatische Background Removal via WASM, AI-generated Hero Images für Loadouts, und umfassende Optimierungen für Performance und Bildqualität.

### Core Features
- Cloudinary CDN (globale Verfügbarkeit, automatisches WebP)
- 3 Upload Methods: Local File, External URL, Widget
- WASM Background Removal (client-side, kein Server)
- AI Hero Image Generation (Vercel AI SDK + Gemini)
- CORS Proxy für externe Bilder
- Automatic Image Optimization (f_auto, q_auto, c_limit)
- Security (file validation, size limits, MIME type checking)
- Progress Tracking (0-100%)
- Organized Folder Structure (`gearshack/users/{userId}/{itemId}`)

---

## Architecture

### Cloudinary Configuration

**Environment Variables**:
```bash
# Public (exposed to client)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset

# Secret (server-only, for deletion/admin)
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

**Upload Preset** (configured in Cloudinary Dashboard):
- Unsigned upload (no authentication required)
- Folder: `gearshack/` (dynamic via API)
- Allowed formats: jpg, png, webp, gif
- Max file size: 10 MB

**Folder Structure**:
```
gearshack/
  users/
    {userId}/
      {itemId}/
        image1.jpg
        image1_nobg.png
      {loadoutId}/
        hero_image.jpg
  loadouts/
    generated/
      {uuid}.png    # AI-generated hero images
  fallback-images/
    hiking-summer.jpg
    camping-winter.jpg
    ...
```

---

## Upload Methods

### 1. Local File Upload

**Use Case**: User wählt Bild von Device (drag-drop oder file picker).

**Hook**: `useCloudinaryUpload()`

```typescript
const { uploadLocal, status, progress } = useCloudinaryUpload();

const handleFileSelect = async (file: File) => {
  const url = await uploadLocal(file, {
    userId: user.uid,
    itemId: gearItem.id,
    removeBackground: true,  // Optional
  });

  if (url) {
    console.log('Uploaded:', url);
    // url = 'https://res.cloudinary.com/your-cloud/image/upload/v123/gearshack/users/{userId}/{itemId}/image_nobg.png'
  }
};
```

**Pipeline**:
1. **Validate** file (size ≤ 10 MB, MIME type = image/*)
2. **Remove Background** (WASM, optional)
3. **Upload** to Cloudinary REST API
4. **Return** `secure_url`

**Progress States**:
- `idle` → Initial state
- `processing` → Background removal (25-50%)
- `uploading` → Upload to Cloudinary (60-90%)
- `success` → Complete (100%)
- `error` → Failed

### 2. External URL Import

**Use Case**: User findet Bild via Product Search (Serper API) oder gibt URL manuell ein.

**Problem**: Direct URL → CORS error (browser blocks cross-origin fetch)

**Solution**: Server-side proxy

```typescript
const { uploadUrl, status, progress } = useCloudinaryUpload();

const handleUrlImport = async (externalUrl: string) => {
  const url = await uploadUrl(externalUrl, {
    userId: user.uid,
    itemId: gearItem.id,
    removeBackground: true,
  });

  if (url) {
    console.log('Imported & Uploaded:', url);
  }
};
```

**Pipeline**:
1. **Validate** URL format (http:// or https://)
2. **Fetch** via proxy (`/api/proxy-image?url=...`)
3. **Remove Background** (WASM, optional)
4. **Upload** to Cloudinary
5. **Return** `secure_url`

**Proxy Route** (`app/api/proxy-image/route.ts`):
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    // Server-side fetch (bypasses CORS)
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Gearshack/1.0 (Image Proxy)',
      },
    });

    if (!response.ok) {
      return new Response('Failed to fetch image', { status: response.status });
    }

    // Stream image to client
    const blob = await response.blob();
    return new Response(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',  // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('[Proxy] Image fetch failed:', error);
    return new Response('Proxy failed', { status: 500 });
  }
}
```

**Benefits**:
- ✅ Bypasses CORS (server-side fetch)
- ✅ Caching (reduces redundant fetches)
- ✅ User-Agent spoofing (some sites block default fetch)

### 3. Cloudinary Widget (Future)

**Use Case**: Advanced users want access to Cloudinary's full feature set (camera, crop, effects).

**Implementation**:
```tsx
import { CldUploadWidget } from 'next-cloudinary';

<CldUploadWidget
  uploadPreset="your-preset"
  onSuccess={(result) => {
    handleWidgetResult(result.info.secure_url);
  }}
>
  {({ open }) => (
    <button onClick={() => open()}>
      Upload with Cloudinary Widget
    </button>
  )}
</CldUploadWidget>
```

**Not Implemented Yet** (due to complexity and UI consistency concerns).

---

## WASM Background Removal

### Technology

**Library**: `@imgly/background-removal` (WASM + ML model)

**Model**: SegmentationONNX (1.2 MB, loads on-demand)

**Performance**:
- 512×512 image: ~2-4 seconds
- 1024×1024 image: ~5-8 seconds
- Pure client-side (no server, no API costs)

### Implementation

**Location**: `lib/image-processing.ts`

```typescript
import { removeBackground as wasmRemoveBackground } from '@imgly/background-removal';

export async function removeBackground(file: File): Promise<Blob> {
  try {
    const blob = await wasmRemoveBackground(file, {
      model: 'small',  // Fast model (1.2 MB)
      output: {
        format: 'png',  // PNG for transparency
        quality: 0.8,   // Balance quality/size
      },
    });

    return blob;
  } catch (error) {
    console.error('[BG Removal] Failed:', error);
    throw new Error('Background removal failed');
  }
}
```

**Usage**:
```typescript
const { uploadLocal } = useCloudinaryUpload();

// With background removal
await uploadLocal(file, {
  userId: user.uid,
  itemId: item.id,
  removeBackground: true,  // ✅ PNG with transparency
});

// Without background removal
await uploadLocal(file, {
  userId: user.uid,
  itemId: item.id,
  removeBackground: false,  // ✅ Original JPG/PNG
});
```

### Benefits

- ✅ **No API costs** (client-side processing)
- ✅ **Privacy** (image never leaves browser)
- ✅ **Quality** (ML-based, better than chroma key)
- ✅ **Fast** (~2-8s depending on image size)

### Trade-offs

- ❌ **Initial Load** (1.2 MB WASM model on first use)
- ❌ **Client CPU** (mobile devices may struggle)
- ❌ **Battery** (ML processing is CPU-intensive)

**Solution**: Make it optional (default: enabled, can be disabled).

---

## AI Hero Image Generation

**Feature**: 048-ai-loadout-image-gen

### Concept

**Problem**: Loadouts ohne Bilder wirken langweilig.

**Solution**: AI generiert hero images basierend auf Loadout Metadata (seasons, activities, style).

### Pipeline

**User Journey**:
1. User erstellt Loadout ("Summer Alps 2025", seasons: summer, activities: hiking+backpacking)
2. User klickt "Generate Hero Image"
3. **Prompt Generation**:
   ```typescript
   const prompt = buildPrompt({
     seasons: ['summer'],
     activities: ['hiking', 'backpacking'],
     style: 'realistic',
   });
   // → "A realistic outdoor scene for summer hiking and backpacking,
   //    featuring mountain trails and camping gear in daylight"
   ```
4. **AI Generation** (Vercel AI SDK + Gemini Flash-8b):
   ```typescript
   const { image } = await generateImage({
     model: 'google/gemini-2.5-flash-8b',
     prompt,
     size: '1024x1024',
   });
   ```
5. **Upload to Cloudinary** (CDN hosting)
6. **Contrast Analysis** (WCAG AA compliance, 4.5:1 ratio)
7. **Save to Database** (`generated_images` table)
8. **Set as Hero Image** (link loadout → generated_image)

### Contrast Analysis

**Why**: Text overlay (loadout name) must be readable.

**WCAG AA Standard**: 4.5:1 contrast ratio (normal text)

**Implementation** (`lib/contrast-analyzer.ts`):
```typescript
export function analyzeContrast(imageUrl: string): Promise<ContrastResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Sample 100 pixels from top-left (where text overlays)
      const imageData = ctx.getImageData(0, 0, 100, 100);
      const avgLuminance = calculateAverageLuminance(imageData.data);

      // Test contrast with white and black text
      const whiteContrast = contrastRatio(avgLuminance, 1.0);  // White = 1.0
      const blackContrast = contrastRatio(avgLuminance, 0.0);  // Black = 0.0

      resolve({
        avgLuminance,
        whiteContrast,
        blackContrast,
        recommendedTextColor: whiteContrast >= 4.5 ? 'white' : 'black',
      });
    };
  });
}
```

**Result**: UI automatically wählt white oder black text based on background luminance.

### Fallback Images

**When**: AI generation fails (API error, quota exceeded, disabled)

**Solution**: 24 curated stock images (6 activities × 4 seasons)

**Location**: `public/fallback-images/`

**Structure**:
```
fallback-images/
  hiking-spring.jpg
  hiking-summer.jpg
  hiking-fall.jpg
  hiking-winter.jpg
  camping-spring.jpg
  camping-summer.jpg
  ...
```

**Selection Logic**:
```typescript
function selectFallbackImage(loadout: Loadout): string {
  const primaryActivity = loadout.activity_types[0] || 'hiking';
  const primarySeason = loadout.seasons[0] || 'summer';

  return `/fallback-images/${primaryActivity}-${primarySeason}.jpg`;
}
```

### Limits & Cleanup

**Max Images per Loadout**: 3

**Why**: Prevent storage bloat (1024×1024 PNG ≈ 500 KB)

**Auto-Delete** (oldest first):
```sql
-- Database trigger: Delete oldest image when count > 3
CREATE OR REPLACE FUNCTION cleanup_old_generated_images()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM generated_images
  WHERE loadout_id = NEW.loadout_id
  AND id NOT IN (
    SELECT id FROM generated_images
    WHERE loadout_id = NEW.loadout_id
    ORDER BY created_at DESC
    LIMIT 3
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Image Optimization

### Automatic Optimizations

**Cloudinary** (via URL parameters):
- `f_auto` → Auto format (WebP für Chrome/Firefox, JPEG für Safari)
- `q_auto` → Auto quality (balances size/quality)
- `c_limit` → Constrain dimensions (maintains aspect ratio)
- `w_800` → Max width (responsive sizing)

**Example**:
```typescript
// Original URL
const url = 'https://res.cloudinary.com/.../gearshack/users/123/456/image.jpg';

// Optimized URL (via optimizeCloudinaryUrl())
const optimized = 'https://res.cloudinary.com/.../f_auto,q_auto:good,c_limit,w_800/gearshack/users/123/456/image.jpg';
```

**Result**:
- Original: 2.5 MB JPEG
- Optimized: 180 KB WebP (93% smaller!)

### Lazy Loading

**next/image** (automatic):
```tsx
import Image from 'next/image';

<Image
  src={item.primaryImageUrl}
  alt={item.name}
  width={300}
  height={300}
  loading="lazy"  // Default (only loads when scrolling near)
  placeholder="blur"  // Optional blur-up effect
/>
```

**Benefits**:
- ✅ Faster initial page load
- ✅ Reduced bandwidth (images only load wenn visible)
- ✅ Better Core Web Vitals (LCP, CLS)

---

## Security

### File Validation

**Client-Side** (hooks/useCloudinaryUpload.ts):
```typescript
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;  // 10 MB

function validateImageFile(file: File): string | null {
  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Invalid file type: ${file.type}`;
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `File too large: ${Math.round(file.size / 1024 / 1024)}MB (max 10MB)`;
  }

  return null;  // Valid
}
```

**Server-Side** (Cloudinary Upload Preset):
- Max file size: 10 MB
- Allowed formats: jpg, png, webp, gif
- No executable files (.exe, .js, .sh)

### CORS Protection

**Problem**: Malicious websites könnten unseren Proxy missbrauchen.

**Solution**: Rate limiting + Referrer check (future).

**Current** (app/api/proxy-image/route.ts):
- No auth (public endpoint)
- No rate limiting (rely on Vercel's built-in protections)
- No referrer check (allow all origins)

**Future Improvements**:
- IP-based rate limiting (10 requests/minute)
- Referrer whitelist (nur gearshack.app)
- Signed URLs (HMAC tokens)

### MIME Type Sniffing

**Attack**: Upload `.jpg` with malicious JS inside → Server executes.

**Defense**: Cloudinary automatically validates file content (not just extension).

**Result**: Safe storage (even if user uploads malicious file).

---

## Error Handling

### Upload Failures

**Common Errors**:
1. **File too large** → Show size limit (10 MB)
2. **Invalid MIME type** → Show allowed types
3. **Network error** → Retry button
4. **Cloudinary quota exceeded** → Contact admin
5. **Background removal failed** → Offer upload without BG removal

**User Experience**:
```tsx
const { uploadLocal, status, error } = useCloudinaryUpload();

{status === 'error' && (
  <Alert variant="destructive">
    <AlertTitle>Upload failed</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
    <Button onClick={() => reset()}>Try Again</Button>
  </Alert>
)}
```

### Proxy Failures

**Common Errors**:
1. **Invalid URL** → Check format (must start with http://)
2. **Image not found (404)** → URL broken
3. **CORS blocked (even via proxy)** → Some sites block proxies
4. **Timeout** → Image too large or server slow

**Solution**: Graceful degradation
```typescript
try {
  const url = await uploadUrl(externalUrl, { ... });
} catch (error) {
  toast.error('Failed to import image. Please try uploading manually.');
}
```

---

## Performance Optimization

### CDN Benefits

**Cloudinary CDN**:
- Global edge network (150+ locations)
- Automatic geo-routing (nearest server)
- HTTP/2 + Brotli compression
- Immutable caching (1 year TTL)

**Result**: Image loads in **50-200ms** (vs 1-3s ohne CDN).

### Image Sizing

**Problem**: Loading 4K images on mobile wastes bandwidth.

**Solution**: Responsive images via `next/image`:
```tsx
<Image
  src={url}
  alt="Gear item"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  width={800}
  height={800}
/>
```

→ Browser automatisch wählt richtige Größe (400px für mobile, 800px für desktop).

---

## Integration Points

### Gear Items

**Primary Image**:
```typescript
interface GearItem {
  primaryImageUrl: string | null;  // Cloudinary URL
  galleryImageUrls: string[];      // Additional images
  nobgImages?: {                   // Processed images (BG removed)
    "512": { png: string, webp?: string },
    "1024": { png: string, webp?: string },
  };
}
```

### Loadouts

**Hero Image**:
```typescript
interface Loadout {
  heroImageUrl: string | null;    // AI-generated or fallback
  heroImageId: string | null;     // Links to generated_images table
}
```

### Messaging

**Image Attachments**:
```typescript
interface Message {
  imageUrl: string | null;        // Cloudinary URL
  voiceUrl: string | null;        // Voice message (also Cloudinary)
}
```

---

## Future Improvements

- [ ] **Cloudinary Widget** (advanced upload features)
- [ ] **Multiple Image Upload** (batch processing)
- [ ] **Image Editing** (crop, rotate, filters)
- [ ] **Video Support** (gear demos, reviews)
- [ ] **3D Model Support** (.glb files for AR previews)
- [ ] **AVIF Format** (better than WebP, emerging standard)
- [ ] **Signed URLs** (prevent unauthorized uploads)
- [ ] **Image Moderation** (AI-powered NSFW detection)
- [ ] **Smart Cropping** (AI-detected focal points)
- [ ] **Low-Quality Image Placeholders** (LQIP, blur-up effect)

---

## Related Docs

- [Tech Stack](../architecture/tech-stack.md) - Cloudinary, @imgly/background-removal
- [Loadout Management](loadout-management.md) - AI Hero Images
- [Inventory Gallery](inventory-gallery.md) - Image handling in UI

---

**Last Updated**: 2026-02-06
**Status**: Production-Ready
**CDN**: Cloudinary
**Storage**: ~50 GB (12,000 items × ~4 MB average)
**Bandwidth**: ~500 GB/month
