# Feature Specification: Cloudinary Migration with Hybrid Processing

**Feature Branch**: `038-cloudinary-hybrid-upload`
**Created**: 2025-12-09
**Status**: Draft
**Input**: User description: "Migrate image storage from Firebase Storage to Cloudinary to solve persistence and CORS issues permanently. Use local WASM background removal + Cloudinary upload for local files, and Cloudinary Upload Widget for cloud/URL imports. Store `secure_url` in Firestore to decouple assets from database provider."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Local File Upload with Background Removal (Priority: P1)

As a user, I want to drag and drop a local image file (from my computer) onto the gear item form. The app should automatically remove the image background using the existing local WASM processing (free, no cloud costs) and then upload the clean PNG to Cloudinary, storing the resulting URL in my gear item.

**Why this priority**: This is the core user workflow for adding product images to gear items. Local file upload with background removal is the most common use case and provides the highest value by automating tedious manual image editing.

**Independent Test**: Can be fully tested by dragging a local JPEG/PNG onto the image upload area and verifying the background is removed and the image appears in the gear item form. Delivers immediate value for users cataloging their gear.

**Acceptance Scenarios**:

1. **Given** I am editing a gear item, **When** I drag and drop a local JPG/PNG file onto the image drop zone, **Then** the system processes it locally (background removal via WASM) and uploads the result to Cloudinary, displaying the processed image.
2. **Given** I have uploaded an image via drag and drop, **When** I save the gear item, **Then** the Cloudinary `secure_url` is persisted in Firestore and the image remains accessible on reload.
3. **Given** I am uploading a local file, **When** the background removal is processing, **Then** I see a progress indicator showing the operation is in progress.
4. **Given** I drag and drop a file that is not an image (e.g., PDF), **When** the system validates the file, **Then** I receive a clear error message explaining only images are accepted.

---

### User Story 2 - Cloud Import via Cloudinary Widget (Priority: P2)

As a user, I want to click an "Import from Cloud" button that opens the Cloudinary Upload Widget. This allows me to import images from Unsplash, URLs, or other cloud sources directly into Cloudinary without any local processing.

**Why this priority**: This provides an alternative upload path for users who want to use stock photos or images from URLs. It bypasses local processing because the source is already cloud-hosted and may not benefit from (or may conflict with) local background removal.

**Independent Test**: Can be tested by clicking "Import from Cloud", selecting an Unsplash image, and verifying it appears in the gear item form with the Cloudinary URL stored.

**Acceptance Scenarios**:

1. **Given** I am editing a gear item, **When** I click "Import from Cloud", **Then** the Cloudinary Upload Widget opens with options for Unsplash, URLs, and other available cloud sources.
2. **Given** I select an image from Unsplash in the widget, **When** the selection is confirmed, **Then** the image is uploaded directly to Cloudinary and the `secure_url` is populated in the form.
3. **Given** I paste a URL in the Cloudinary Widget, **When** I confirm the upload, **Then** the image at that URL is imported to Cloudinary and stored in my gear item.
4. **Given** I open the Cloudinary Widget, **When** I click cancel or close, **Then** the widget closes and no changes are made to my gear item.

---

### User Story 3 - Legacy Cleanup and Migration Readiness (Priority: P3)

As a developer, I want to remove the fragile Firebase Storage proxy logic and MIME-type workarounds so the codebase is cleaner, more maintainable, and ready for future migration to Supabase or other database providers.

**Why this priority**: This is technical debt cleanup that improves maintainability. While important for long-term health, it doesn't directly add user-visible features, so it follows the user-facing stories.

**Independent Test**: Can be verified by reviewing the codebase for removed Firebase Storage upload code and confirming all image operations work correctly through Cloudinary.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** I review the codebase, **Then** Firebase Storage upload logic has been removed and replaced with Cloudinary uploads.
2. **Given** the migration is complete, **When** I upload images via either pipeline, **Then** no MIME-type workarounds or proxy logic is required.
3. **Given** a gear item has an image, **When** I view or edit that item, **Then** the image loads from Cloudinary without any Firebase Storage dependencies.

---

### Edge Cases

- What happens when the user uploads an image larger than Cloudinary's free tier limits (10MB)?
  - System validates file size before upload and shows a clear error message with the size limit.
- How does the system handle network failures during upload?
  - Upload operations show appropriate error states and allow retry.
- What happens if the Cloudinary Widget fails to load (network issue)?
  - User sees a fallback message and the option to use local file upload instead.
- What happens to existing images stored in Firebase Storage?
  - Existing Firebase Storage URLs continue to work for display. New uploads go to Cloudinary.
- How does the system handle very large files during WASM background removal?
  - Large files may show extended processing times with progress indication; extremely large files show a warning before processing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support drag-and-drop upload of local image files (PNG, JPG, WebP) in the gear item editor.
- **FR-002**: System MUST provide an optional background removal toggle (enabled by default) for local file uploads; when enabled, files are processed through the existing WASM-based background removal before uploading to Cloudinary.
- **FR-003**: System MUST provide an "Import from Cloud" button that opens the Cloudinary Upload Widget.
- **FR-004**: System MUST support Cloudinary Upload Widget sources: Unsplash, URL input, and other available cloud sources.
- **FR-005**: System MUST store the Cloudinary `secure_url` in Firestore as the image reference for gear items.
- **FR-006**: System MUST display upload progress during local file processing and upload operations.
- **FR-007**: System MUST validate file types before processing (accept only PNG, JPG, WebP).
- **FR-008**: System MUST validate file size before upload (maximum 10MB per image).
- **FR-009**: System MUST handle upload errors gracefully with user-friendly error messages.
- **FR-010**: System MUST remove Firebase Storage upload logic from the codebase (cleanup).
- **FR-011**: System MUST continue to display existing Firebase Storage images for backward compatibility.
- **FR-012**: System MUST use unsigned Cloudinary uploads (no server-side signing required for MVP).

### Key Entities

- **GearItem.imageUrl**: The primary image URL for a gear item. After migration, this will be a Cloudinary `secure_url` for new uploads, while legacy items may still reference Firebase Storage URLs.
- **CloudinaryUploadResult**: The response from Cloudinary containing `secure_url`, `public_id`, and other metadata after a successful upload.
- **Cloudinary Folder Structure**: Images are organized as `gearshack/users/{userId}/{itemId}/` to enable per-user management and align with Firestore data organization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload a local image and see the processed (background-removed) result in under 30 seconds for typical product photos.
- **SC-002**: Users can import images from Unsplash or URLs via the Cloudinary Widget in under 10 seconds.
- **SC-003**: 100% of new image uploads are stored in Cloudinary, not Firebase Storage.
- **SC-004**: Existing gear items with Firebase Storage images continue to display correctly after migration.
- **SC-005**: No Cloudinary AI background removal costs are incurred (all background removal uses local WASM).
- **SC-006**: Image upload success rate is 95% or higher under normal network conditions.
- **SC-007**: The codebase has zero Firebase Storage upload dependencies for new images after cleanup.

## Clarifications

### Session 2025-12-09

- Q: Should background removal be mandatory or optional for local file uploads? → A: Optional toggle, enabled by default
- Q: How should uploaded images be organized in Cloudinary? → A: By user ID and gear item (`gearshack/users/{userId}/{itemId}/`)

## Assumptions

- Cloudinary free tier limits (10MB per file, 25,000 transformations/month) are sufficient for MVP usage.
- The existing `@imgly/background-removal` WASM library continues to work reliably in the browser.
- Users have reasonably modern browsers that support WASM and the Cloudinary Upload Widget.
- Cloudinary unsigned upload presets will be configured in the Cloudinary dashboard before implementation.
- Environment variables for Cloudinary cloud name and upload preset will be added to the project.
