# Feature Specification: Total Freedom Sprint

**Feature Branch**: `025-image-freedom-fix`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "Fix image deletion persistence and allow all external image domains"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete Primary Image Successfully (Priority: P1)

As a user editing gear in the Gear Editor, I want to remove the primary image and have that change saved to the database, so that my gear item no longer displays the old image after saving.

**Why this priority**: This is a critical bug fix. Users are currently unable to remove images - the deletion is not persisting to the database, causing confusion and data integrity issues.

**Independent Test**: Edit a gear item with an existing image, click remove, save, reload the page - verify the image is permanently removed.

**Acceptance Scenarios**:

1. **Given** a gear item has a primary image, **When** the user removes the image and saves, **Then** the database record no longer contains the image URL
2. **Given** a gear item has a primary image and associated processed images, **When** the user removes the image and saves, **Then** both the original and processed image references are removed from the database
3. **Given** a user removes an image and saves, **When** they reload the page, **Then** the gear item displays with no image (not the old image)

---

### User Story 2 - Use External Shop Images (Priority: P1)

As a user adding gear, I want to paste image URLs from any external website (such as outdoor gear shops), so that I can use product images without restrictions.

**Why this priority**: Users are blocked from using product images from retailers like fjellsport.no, REI, etc., receiving errors when trying to display these images.

**Independent Test**: Paste a product image URL from any external retailer into the image field, save, and verify the image displays without errors.

**Acceptance Scenarios**:

1. **Given** a user is editing a gear item, **When** they paste an image URL from any HTTPS domain, **Then** the image displays correctly in the preview
2. **Given** a gear item has an external image URL saved, **When** viewing the item in the inventory gallery, **Then** the image displays without errors
3. **Given** a user uses an image from an obscure retailer domain, **When** the page loads, **Then** no "Invalid src prop" or domain whitelist errors appear

---

### Edge Cases

- What happens when a user removes an image that was just uploaded but not yet saved?
  - The local preview should clear, and when saved, no image reference should be written to the database
- What happens when an external image URL becomes unavailable?
  - The system should display a fallback placeholder (existing behavior, no change needed)
- What happens with HTTP (non-HTTPS) image URLs?
  - The system should only allow HTTPS URLs for security (existing validation, no change needed)
- What happens if the user removes an image from a new gear item (never had an image)?
  - No database deletion is needed; the item is simply saved without an image field

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST permanently delete the image reference from the database when a user removes an image and saves
- **FR-002**: System MUST also delete any associated processed image references (e.g., background-removed versions) when the primary image is removed
- **FR-003**: System MUST accept and display images from any valid HTTPS domain
- **FR-004**: System MUST NOT show domain-related errors when displaying images from external websites
- **FR-005**: System MUST handle the image deletion case distinctly from the "no change" case when saving

### Key Entities

- **primaryImageUrl**: The URL of the gear item's primary image; when removed, this field should be deleted from the database record (not set to empty string or null)
- **nobgImages**: Associated processed images (background-removed versions); should be deleted when the primary image is removed

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of image deletions persist correctly after save and page reload
- **SC-002**: Users can successfully display images from any HTTPS domain without errors
- **SC-003**: All changes pass lint and build validation without errors
- **SC-004**: No regression in existing image upload functionality

## Assumptions

- The existing remove button UI from Feature 024 is functional and triggers the correct form state changes
- The form correctly sets an empty value when the image is removed
- Only HTTPS image URLs are accepted (existing security constraint)
- Firebase Storage file cleanup is out of scope (orphaned files in storage are acceptable)

## Out of Scope

- Deleting the actual image file from Firebase Storage when the reference is removed
- Supporting HTTP (non-HTTPS) image URLs
- Image URL validation for accessibility/availability before save
- Migrating existing gear items with broken image references
