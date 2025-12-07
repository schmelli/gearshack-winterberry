# Research: Client-Side Background Removal

**Input**: spec.md requirements for client-side background removal using @imgly/background-removal
**Date**: 2025-12-07

## Decision Records

### DR-001: Use @imgly/background-removal Library

**Status**: APPROVED

**Context**: Need a client-side background removal solution that processes images in the browser using WASM, avoiding server-side Cloud Functions.

**Decision**: Use `@imgly/background-removal` npm package

**Rationale**:
- Runs entirely in browser using WebAssembly (WASM) and WebGL/WebGPU
- No server costs or privacy concerns - data stays client-side
- Lazy-loads WASM/ONNX assets from CDN (default behavior)
- Well-maintained by IMG.LY with TypeScript support
- AGPL-3.0 license acceptable for this project

**Installation**:
```bash
npm install @imgly/background-removal
```

**Note**: The library may require `onnxruntime-web` as a peer dependency for certain versions.

**Alternatives Considered**:
- `remove.bg` API - Rejected (server-side, costs per image)
- Custom TensorFlow.js model - Rejected (more complex, less mature)
- Keep Cloud Function - Rejected (user wants client-side approach)

---

### DR-002: Create Dedicated Image Processing Utility

**Status**: APPROVED

**Context**: Need a clean utility function that can be imported by the MediaSection component.

**Decision**: Create `lib/image-processing.ts` with `removeBackground()` function

**Implementation**:
```typescript
// lib/image-processing.ts
import imglyRemoveBackground from '@imgly/background-removal';

export async function removeBackground(imageFile: File): Promise<Blob> {
  const blob = await imglyRemoveBackground(imageFile);
  return blob; // PNG with transparency
}
```

**Configuration**: Use default CDN asset loading (unpkg.com) to lazy-load WASM and ONNX model files. No custom `publicPath` needed for initial implementation.

**Consequences**:
- Clean separation of concerns
- Easy to test and mock
- Following Feature-Sliced Light architecture (logic in lib/, not components)

---

### DR-003: Integrate Processing into handleFileChange

**Status**: APPROVED

**Context**: The `ImageUploadInput` component has a `handleFileChange` callback that processes selected files. Need to insert background removal before Firebase upload.

**Decision**: Add background removal step between file validation and Firebase upload

**Flow**:
1. User selects file
2. Validate file type and size (existing)
3. If toggle enabled: Call `removeBackground(file)` with processing indicator
4. Convert Blob to File: `new File([blob], 'processed.png', { type: 'image/png' })`
5. Upload processed file to Firebase (existing `upload()` call)

**Key Insight**: Since we replace the File object before upload, no changes needed to `useImageUpload` hook or Firebase upload logic.

**Consequences**:
- Minimal changes to existing upload flow
- Processing happens transparently before upload
- User sees processed image in preview

---

### DR-004: Add Toggle State to ImageUploadInput

**Status**: APPROVED

**Context**: Need an "Auto-remove background" toggle (default: ON) in the upload UI.

**Decision**: Add local state `autoRemoveBg` with shadcn/ui Switch component

**Implementation Location**: `ImageUploadInput` component in MediaSection.tsx

**UI Placement**: Add Switch with label above the mode toggle buttons (Paste URL / Upload)

**Props**: No new props needed - toggle is internal component state (doesn't persist)

**Consequences**:
- Toggle resets to ON when component remounts (per spec - no persistence needed)
- Clean UI integration with existing layout
- shadcn/ui Switch component for consistency

---

### DR-005: Processing State and Spinner

**Status**: APPROVED

**Context**: WASM processing takes 2-5 seconds. Need visible feedback.

**Decision**: Add `isProcessing` state and overlay spinner on image preview

**Implementation**:
```typescript
const [isProcessing, setIsProcessing] = useState(false);

// In handleFileChange:
setIsProcessing(true);
try {
  const processedBlob = await removeBackground(file);
  // ... convert and continue
} finally {
  setIsProcessing(false);
}
```

**UI**:
- Show spinner overlay on ImagePreview during processing
- Use existing `Loader2` icon from lucide-react with "Removing background..." text
- Disable further interactions during processing

**Consequences**:
- Clear user feedback during processing
- Consistent with existing upload spinner UX
- Prevents double-processing on rapid clicks

---

### DR-006: Error Handling and Fallback

**Status**: APPROVED

**Context**: Processing may fail (browser compatibility, WASM issues, certain image types).

**Decision**: Fall back to original image on error and notify user

**Implementation**:
```typescript
try {
  const processedBlob = await removeBackground(file);
  // Use processed image
} catch (error) {
  console.error('Background removal failed:', error);
  toast.info('Could not remove background. Using original image.');
  // Continue with original file
}
```

**Consequences**:
- No data loss on processing failure
- User is informed but not blocked
- Graceful degradation

---

## File Impact Summary

| File | Change Type | Reason |
|------|-------------|--------|
| `package.json` | Modify | Add @imgly/background-removal dependency |
| `lib/image-processing.ts` | Create | New utility for removeBackground() |
| `components/gear-editor/sections/MediaSection.tsx` | Modify | Add toggle, processing state, integration |

## No Changes Needed

- `hooks/useImageUpload.ts` - Upload logic unchanged (receives processed File)
- `hooks/useGearEditor.ts` - Form handling unchanged
- `lib/firebase/storage.ts` - Storage upload unchanged

## Research Conclusion

The implementation is straightforward with minimal changes:
1. Install dependency
2. Create utility function
3. Add toggle and processing UI
4. Integrate into existing handleFileChange

Total estimated new code: ~80-100 lines (utility + UI changes)

Sources:
- [@imgly/background-removal - npm](https://www.npmjs.com/package/@imgly/background-removal)
- [GitHub - imgly/background-removal-js](https://github.com/imgly/background-removal-js)
- [IMG.LY Blog - Background Removal](https://img.ly/blog/announcing-imgly-background-removal/)
