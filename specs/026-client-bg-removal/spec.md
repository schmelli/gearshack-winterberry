# Feature Specification: Client-Side Background Removal

**Feature Branch**: `026-client-bg-removal`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "Implement Client-Side Background Removal using @imgly/background-removal"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Background Removal on Image Upload (Priority: P1)

As a user adding gear to my inventory, I want the background automatically removed from my product images when I upload them, so that my gear photos have a clean, professional appearance without manual editing.

**Why this priority**: This is the core feature - enabling automatic background removal in the browser replaces the legacy Cloud Function approach and delivers the primary user value.

**Independent Test**: Upload an image of gear with a background → image preview shows the processed result with transparent background → save the item and verify the transparent PNG is stored.

**Acceptance Scenarios**:

1. **Given** "Auto-remove background" is enabled (default), **When** the user selects/drops an image file, **Then** the system processes the image and displays the background-removed result
2. **Given** the user is uploading an image, **When** background removal is processing, **Then** a visible spinner/overlay indicates "Processing..." for the duration (2-5 seconds typical)
3. **Given** background removal completes successfully, **When** the user saves the gear item, **Then** the transparent PNG is uploaded to storage (not the original image)

---

### User Story 2 - Toggle Background Removal (Priority: P2)

As a user, I want to be able to disable automatic background removal, so that I can upload original images when I prefer to keep the background.

**Why this priority**: Provides user control and flexibility. Some users may want to keep original backgrounds for certain types of images.

**Independent Test**: Toggle off "Auto-remove background" → upload an image → verify the original image is used without processing.

**Acceptance Scenarios**:

1. **Given** "Auto-remove background" toggle is visible in the image upload section, **When** the user turns it OFF, **Then** uploaded images are used as-is without processing
2. **Given** "Auto-remove background" is OFF, **When** the user selects an image, **Then** no processing spinner appears and the original image shows in preview immediately

---

### User Story 3 - Graceful Error Handling (Priority: P2)

As a user, I want the system to handle processing failures gracefully, so that I don't lose my image if background removal fails.

**Why this priority**: Ensures reliability and good user experience even when WASM processing encounters issues.

**Independent Test**: Simulate a processing failure → verify the original image is used as fallback and user is notified.

**Acceptance Scenarios**:

1. **Given** background removal processing fails, **When** an error occurs, **Then** the system falls back to the original image and shows a notification explaining the fallback
2. **Given** processing fails, **When** the user saves the gear item, **Then** the original image is uploaded successfully (no data loss)

---

### Edge Cases

- What happens when the user uploads a very large image (>10MB)?
  - The system should handle it gracefully with the existing file size validation (5MB limit in current code)
- What happens when the user cancels/navigates away during processing?
  - The processing should be aborted and no partial state should remain
- What happens when the browser doesn't support WASM?
  - Fall back to original image with a notification
- What happens when the user uploads an image that already has a transparent background?
  - Process it anyway (the algorithm handles this gracefully)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an "Auto-remove background" toggle in the image upload section (default: ON)
- **FR-002**: System MUST process uploaded images using client-side WASM-based background removal when the toggle is enabled
- **FR-003**: System MUST display a visible processing indicator (spinner/overlay) during background removal (2-5 second duration typical)
- **FR-004**: System MUST replace the preview with the processed image (transparent PNG) after successful processing
- **FR-005**: System MUST update the file to be uploaded with the processed image (converted from Blob to File)
- **FR-006**: System MUST fall back to the original image if processing fails
- **FR-007**: System MUST notify the user when falling back to the original image due to processing failure
- **FR-008**: System MUST lazy-load WASM assets from CDN to avoid bloating the initial bundle
- **FR-009**: System MUST work with existing upload flow without changes to the upload service

### Key Entities

- **Image File**: The user-selected image file; may be replaced with processed version
- **Processed Blob**: The result of background removal (PNG with transparency)
- **Processing State**: Indicates whether background removal is in progress

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see background removed from their gear images within 5 seconds of upload
- **SC-002**: 95% of standard product photos (gear on plain backgrounds) are processed successfully
- **SC-003**: Processing failures result in graceful fallback with no data loss
- **SC-004**: Initial page load is not impacted (WASM assets load lazily on demand)
- **SC-005**: All changes pass lint and build validation without errors

## Assumptions

- The `@imgly/background-removal` library will be used for client-side processing
- The library uses WASM and lazy-loads assets from public CDN by default
- Processing time of 2-5 seconds is acceptable for this feature
- The existing MediaSection component handles file uploads via `onFileSelect` callback
- The existing upload service accepts any File object and uploads it to Firebase Storage
- Toggle state does not need to persist between sessions (default ON each time)

## Out of Scope

- Replacing or removing the legacy Cloud Function for background removal
- Processing images that are pasted as URLs (only uploaded files)
- Batch processing multiple images at once
- User-adjustable processing quality or parameters
- Persisting the toggle preference across sessions
