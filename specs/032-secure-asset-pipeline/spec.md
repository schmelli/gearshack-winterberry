# Feature Specification: Secure Asset Pipeline Sprint

**Feature Branch**: `032-secure-asset-pipeline`
**Created**: 2025-12-08
**Status**: Draft
**Input**: User description: "Implement Image Proxy for Persistence to prevent link rot and ensure all images are stored in our own storage"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Persistent Image Storage for Search-Selected Images (Priority: P1)

A user opens the Gear Editor, searches for a product image using the integrated search feature, selects an image from the results, and saves the gear item. The system automatically downloads the external image and stores it permanently in the application's own storage, ensuring the image remains available even if the original source becomes unavailable.

**Why this priority**: This is the core feature that prevents link rot. External image URLs can become broken over time (images get moved, deleted, or domains expire). By storing images internally, users' inventory data remains intact indefinitely.

**Independent Test**: Create a new gear item → Search for an image → Select from results → Save → Verify the saved item displays an internally-hosted image URL (not the original external URL)

**Acceptance Scenarios**:

1. **Given** a user in the Gear Editor with an external image URL from search, **When** they save the item, **Then** the image is automatically downloaded and re-uploaded to internal storage
2. **Given** a user saves a gear item with an external image, **When** the original image source becomes unavailable, **Then** the gear item still displays its image correctly (from internal storage)
3. **Given** a user is saving an item with an external image, **When** the save process begins, **Then** a loading indicator shows progress during the download and upload

---

### User Story 2 - Server-Side Image Proxy for CORS Bypass (Priority: P1)

The system provides a secure server-side endpoint that can fetch external images on behalf of the client, bypassing browser CORS restrictions that would otherwise prevent downloading images from third-party domains.

**Why this priority**: This is a technical prerequisite for User Story 1. Without server-side proxying, the browser cannot fetch images from external domains due to security restrictions.

**Independent Test**: Request an external image through the proxy endpoint → Verify the image content is returned with correct content type

**Acceptance Scenarios**:

1. **Given** a valid external image URL, **When** it is requested through the proxy, **Then** the image content is returned with the correct content type
2. **Given** a URL that does not point to an image, **When** it is requested through the proxy, **Then** the request is rejected with an appropriate error
3. **Given** an invalid or malformed URL, **When** it is requested through the proxy, **Then** the request is rejected with a validation error

---

### User Story 3 - Skip Processing for Already-Internal Images (Priority: P2)

When a user saves a gear item that already has an internally-hosted image (from a previous upload or import), the system recognizes this and skips the download/re-upload process, avoiding unnecessary processing and storage duplication.

**Why this priority**: Performance optimization. Most edits to existing items don't change images, so we shouldn't re-process them.

**Independent Test**: Edit an existing item with an internal image → Save without changing image → Verify no re-upload occurs

**Acceptance Scenarios**:

1. **Given** a gear item with an already-internal image URL, **When** the user saves the item, **Then** no image processing occurs and the existing URL is preserved
2. **Given** a gear item being edited, **When** the user changes only non-image fields, **Then** the image URL remains unchanged

---

### Edge Cases

- What happens when the external image URL returns a redirect? The system follows redirects and fetches the final image
- What happens when the external image is very large? The system applies the same size limits as direct uploads (10MB max)
- What happens when the external image URL times out? The save fails gracefully with a user-friendly error message suggesting they try again or use direct upload
- What happens when the external server returns a 404? The save fails with a message that the image could not be retrieved
- What happens when the content type indicates non-image content? The request is rejected to prevent security issues

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a server-side endpoint to proxy external image requests
- **FR-002**: System MUST validate that proxied content is an image (content-type starts with `image/`)
- **FR-003**: System MUST validate that requested URLs are valid HTTP/HTTPS URLs
- **FR-004**: System MUST automatically download and re-upload external images when saving gear items
- **FR-005**: System MUST detect and skip processing for images already stored internally
- **FR-006**: System MUST show loading feedback during the image import process
- **FR-007**: System MUST handle proxy failures gracefully with user-friendly error messages
- **FR-008**: System MUST follow HTTP redirects when proxying external images
- **FR-009**: System MUST apply the same file size limits to proxied images as direct uploads
- **FR-010**: System MUST preserve the original file extension based on content type

### Key Entities *(include if feature involves data)*

- **GearItem.primaryImageUrl**: After save, always contains an internal storage URL (never an external URL for search-selected images)
- **Image Proxy Request**: Temporary request containing the external URL to be fetched
- **Imported Image File**: The blob created from downloading an external image, converted to a file for upload

### Assumptions

- The existing image upload infrastructure handles the actual storage to internal systems
- The save process can be extended to include the proxy-fetch-upload sequence
- Internal image URLs can be distinguished from external URLs by their domain pattern

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of search-selected images are stored internally after save (no external URLs in saved data)
- **SC-002**: Users see clear loading feedback during the entire import process
- **SC-003**: Image import (proxy + upload) completes in under 10 seconds for typical product images
- **SC-004**: Zero console errors or crashes during the proxy-fetch-upload process
- **SC-005**: Previously saved items with internal images remain unchanged when edited
- **SC-006**: Invalid image requests (non-image content, invalid URLs) are rejected with helpful error messages
