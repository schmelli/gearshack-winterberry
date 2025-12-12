# Feature Specification: Image Management Sprint

**Feature Branch**: `024-image-management`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "Execute Image Management Sprint: Allow users to remove/replace gear images in the Gear Editor Media Section"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove Primary Image (Priority: P1)

As a user editing gear in the Gear Editor, I want to remove the current primary image so that I can clear it completely or replace it with a different image.

**Why this priority**: This is the core bug fix. Users currently cannot remove an image once set, which blocks their ability to correct mistakes or update their gear photos.

**Independent Test**: Open an existing gear item with a primary image, click the remove button, and verify the image is cleared and the upload interface returns.

**Acceptance Scenarios**:

1. **Given** a gear item has a primary image displayed, **When** the user clicks the remove button on the image, **Then** the image preview disappears and the upload/URL input interface is shown
2. **Given** a user removes the primary image and saves the form, **When** viewing the gear item later, **Then** no primary image is displayed
3. **Given** a user removes an image, **When** clicking the remove button, **Then** no file selection dialog opens (event propagation is prevented)

---

### User Story 2 - Replace Primary Image (Priority: P1)

As a user editing gear in the Gear Editor, I want to replace the current primary image with a new one so that I can update my gear photos without manually clearing first.

**Why this priority**: Natural workflow extension of removing images - users expect to simply upload/paste a new image to replace the existing one.

**Independent Test**: Open an existing gear item with a primary image, switch to upload mode and select a new file, verify the new image replaces the old one.

**Acceptance Scenarios**:

1. **Given** a gear item has a primary image, **When** the user pastes a new URL in URL mode, **Then** the new image replaces the old one in the preview
2. **Given** a gear item has a primary image, **When** the user uploads a new file in upload mode, **Then** the new image replaces the old one after upload completes
3. **Given** a user replaces the image and saves the form, **When** viewing the gear item later, **Then** the new image is displayed

---

### User Story 3 - Persist Image Removal to Database (Priority: P2)

As a user who removes an image, I want my change to be saved to the database so that the image removal persists across sessions.

**Why this priority**: Essential for data integrity, but slightly lower priority as the UI fix enables the core user action.

**Independent Test**: Remove an image, save the form, reload the page, and verify the image remains removed.

**Acceptance Scenarios**:

1. **Given** a user removes the primary image and saves, **When** the data is written to the database, **Then** the image URL field is cleared (empty string or null)
2. **Given** a user reloads the gear editor after saving a removed image, **When** viewing the gear item, **Then** no image is displayed and the upload interface is shown

---

### Edge Cases

- What happens when user clicks remove while an upload is in progress?
  - The remove action should cancel or wait for the upload to complete, then clear the result
- What happens if the remove button is accidentally clicked?
  - No confirmation is needed for remove (standard UI pattern); user can simply re-upload or paste URL
- What happens when removing an image that was just uploaded but not yet saved?
  - The local preview and pending upload should be cleared; the database is unaffected until save

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a remove button on the primary image preview when an image exists
- **FR-002**: The remove button MUST be positioned in the top-right corner of the image preview
- **FR-003**: The remove button MUST use a destructive visual style (red hover state)
- **FR-004**: Clicking the remove button MUST clear the image URL form field
- **FR-005**: Clicking the remove button MUST clear any pending upload file and local preview
- **FR-006**: Clicking the remove button MUST NOT trigger the file selection dialog (event propagation prevented)
- **FR-007**: After removal, the UI MUST show the upload/URL input interface allowing new image selection
- **FR-008**: When saving a gear item with an empty/cleared image URL, the database MUST update to reflect the removal
- **FR-009**: The remove button MUST be accessible via keyboard (focusable, activatable with Enter/Space)

### Key Entities

- **primaryImageUrl**: String field on the gear item representing the Firebase Storage URL of the primary image; can be empty string to indicate no image
- **LocalImageState**: UI-only state tracking pending file uploads and local preview URLs before Firebase upload completes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can remove a primary image in under 2 seconds (single click action)
- **SC-002**: 100% of remove actions correctly clear the image preview immediately
- **SC-003**: 100% of saved removals persist correctly to the database and display correctly on reload
- **SC-004**: Remove button is discoverable - positioned consistently in image preview corner
- **SC-005**: All changes pass lint and build validation without errors

## Assumptions

- The existing form and save logic in `useGearEditor.ts` correctly handles empty string values for `primaryImageUrl`
- Firebase Storage does not automatically delete orphaned images (image file cleanup is out of scope for this feature)
- The existing shadcn/ui Button component supports the required `size="icon"` and destructive styling
- No confirmation dialog is needed for image removal (standard UI pattern for reversible actions)

## Out of Scope

- Deleting the actual image file from Firebase Storage when removed (orphan cleanup)
- Undo/redo functionality for image removal
- Batch image removal
- Gallery image removal (already has remove buttons per the existing implementation)
- Image cropping or editing before upload
