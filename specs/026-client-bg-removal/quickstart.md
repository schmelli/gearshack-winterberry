# Quickstart: Client-Side Background Removal

**Feature**: 026-client-bg-removal
**Date**: 2025-12-07
**Estimated Changes**: ~100 lines across 2 files + 1 new file

## Pre-Implementation Checklist

- [x] Read spec.md - 3 user stories (auto BG removal, toggle, error handling)
- [x] Read research.md - 6 decision records
- [x] Understand existing MediaSection.tsx flow
- [x] Identify exact files and lines to modify

## Implementation Steps

### Step 1: Install Dependency

```bash
npm install @imgly/background-removal
```

### Step 2: Create Image Processing Utility

**File**: `lib/image-processing.ts` (NEW)

```typescript
/**
 * Image Processing Utilities
 *
 * Feature: 026-client-bg-removal
 * Constitution: Business logic in lib/, UI components stateless
 *
 * Client-side image processing using WASM-based background removal.
 */

import imglyRemoveBackground from '@imgly/background-removal';

/**
 * Remove background from an image file
 *
 * Uses @imgly/background-removal WASM library for client-side processing.
 * Assets are lazy-loaded from CDN on first use.
 *
 * @param imageFile - The image file to process
 * @returns PNG blob with transparent background
 * @throws Error if processing fails
 */
export async function removeBackground(imageFile: File): Promise<Blob> {
  const blob = await imglyRemoveBackground(imageFile);
  return blob;
}

/**
 * Convert a Blob to a File object
 *
 * @param blob - The blob to convert
 * @param filename - The filename for the new File
 * @returns File object
 */
export function blobToFile(blob: Blob, filename: string = 'processed.png'): File {
  return new File([blob], filename, { type: 'image/png' });
}
```

### Step 3: Update MediaSection.tsx

**File**: `components/gear-editor/sections/MediaSection.tsx`

#### 3a. Add Imports (after line 26)

```typescript
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { removeBackground, blobToFile } from '@/lib/image-processing';
```

#### 3b. Add State to ImageUploadInput (after line 93)

```typescript
// Auto-remove background toggle state (default: ON per FR-001)
const [autoRemoveBg, setAutoRemoveBg] = useState(true);
// Processing state for background removal
const [isProcessingBg, setIsProcessingBg] = useState(false);
```

#### 3c. Update handleFileChange (replace lines 103-150)

Add background removal processing between validation and upload:

```typescript
const handleFileChange = useCallback(
  async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];

    if (!file) {
      onFileSelect?.(null, null);
      return;
    }

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Please select a valid image file (JPG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    // Feature 026: Process background removal if enabled
    let fileToUpload = file;

    if (autoRemoveBg) {
      setIsProcessingBg(true);
      try {
        const processedBlob = await removeBackground(file);
        fileToUpload = blobToFile(processedBlob, `${file.name.split('.')[0]}_nobg.png`);
      } catch (error) {
        console.error('Background removal failed:', error);
        toast.info('Could not remove background. Using original image.');
        // Fall back to original file
      } finally {
        setIsProcessingBg(false);
      }
    }

    // Create local preview URL for immediate feedback
    const previewUrl = URL.createObjectURL(fileToUpload);
    onFileSelect?.(fileToUpload, previewUrl);

    // If Firebase upload is enabled, upload immediately
    if (enableFirebaseUpload) {
      const downloadUrl = await upload(fileToUpload);
      if (downloadUrl) {
        onChange(downloadUrl);
        onFileSelect?.(null, null);
        URL.revokeObjectURL(previewUrl);
      } else {
        setError('Upload failed. Please try again.');
        toast.error('Image upload failed. Please try again.');
      }
    } else {
      onChange('');
    }
  },
  [onChange, onFileSelect, enableFirebaseUpload, upload, autoRemoveBg]
);
```

#### 3d. Add Toggle UI (before mode toggle, around line 206)

```typescript
{/* Feature 026: Auto-remove background toggle (FR-001) */}
<div className="flex items-center justify-between mb-3">
  <Label htmlFor="auto-remove-bg" className="text-sm">
    Auto-remove background
  </Label>
  <Switch
    id="auto-remove-bg"
    checked={autoRemoveBg}
    onCheckedChange={setAutoRemoveBg}
    disabled={isProcessingBg || isUploading}
  />
</div>
```

#### 3e. Add Processing Spinner Overlay (modify ImagePreview section)

Replace the ImagePreview wrapper (lines 178-203) to include processing state:

```typescript
{/* Feature 024 + 026: Wrap ImagePreview with remove button and processing overlay */}
<div className="relative">
  <ImagePreview
    src={displayUrl || ''}
    alt={`${label} preview`}
    size={size}
  />
  {/* Processing overlay (FR-003) */}
  {isProcessingBg && (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg">
      <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
      <span className="text-xs text-muted-foreground">Removing background...</span>
    </div>
  )}
  {/* Remove button - only visible when image exists and not processing */}
  {displayUrl && !isProcessingBg && (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
      onClick={(e) => {
        e.stopPropagation();
        onChange('');
        onFileSelect?.(null, null);
        handleClearFile();
      }}
      aria-label="Remove image"
    >
      <X className="h-3 w-3" />
    </Button>
  )}
</div>
```

### Step 4: Add shadcn/ui Switch Component (if not present)

```bash
npx shadcn@latest add switch
```

## Validation

1. **Lint**: `npm run lint` - must pass
2. **Build**: `npm run build` - must succeed
3. **Manual Test - Auto BG Removal**:
   - Navigate to /inventory/new or /inventory/[id]/edit
   - Ensure "Auto-remove background" toggle is ON (default)
   - Upload an image with a background
   - See "Removing background..." spinner
   - Verify transparent PNG in preview
   - Save and verify image persists correctly
4. **Manual Test - Toggle Off**:
   - Turn off "Auto-remove background"
   - Upload an image
   - Verify no processing, original image used
5. **Manual Test - Error Fallback**:
   - Test with problematic image or simulate error
   - Verify fallback to original with toast notification

## Success Criteria

- [ ] SC-001: Background removed within 5 seconds of upload
- [ ] SC-002: Toggle controls processing behavior
- [ ] SC-003: Errors fall back to original image gracefully
- [ ] SC-004: Initial page load not impacted (lazy WASM loading)
- [ ] SC-005: Lint and build pass
