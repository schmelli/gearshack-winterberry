# Feature Specification: Stabilization Sprint - i18n, Image Domains & MIME Fixes

**Feature Branch**: `036-stabilization-sprint`
**Created**: 2025-12-08
**Status**: Draft
**Input**: User description: "Execute Stabilization Sprint: Fix i18n parameters, Allow all image domains, and sanitize Upload MIME types."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Inventory Page Without Errors (Priority: P1)

A user navigates to their gear inventory page. The page loads correctly displaying the count of items shown (e.g., "Showing 5 of 12 items") without any formatting errors or application crashes.

**Why this priority**: This is a critical bug - the inventory page crashes entirely due to missing i18n parameters, preventing users from accessing their gear.

**Independent Test**: Navigate to /inventory in any locale. The page loads without errors and displays the correct item count message.

**Acceptance Scenarios**:

1. **Given** a user with 12 gear items and a filter showing 5 results, **When** they view the inventory page, **Then** the message displays "Showing 5 of 12 items" (localized appropriately)
2. **Given** a user with no filters applied, **When** they view the inventory page, **Then** the message displays the total count correctly
3. **Given** a user viewing inventory in German locale, **When** they view the page, **Then** the localized message displays with correct parameter substitution

---

### User Story 2 - Display External Product Images (Priority: P1)

A user views gear items that have images sourced from external websites (e.g., online shops like fjellsport.no, rei.com, or any arbitrary domain). The images render correctly without causing application crashes.

**Why this priority**: This is equally critical - gear cards crash when attempting to display images from domains not explicitly whitelisted, making large portions of the inventory unusable.

**Independent Test**: Add a gear item with an image from any external HTTPS URL. The image displays in the gear card without errors.

**Acceptance Scenarios**:

1. **Given** a gear item with an image URL from fjellsport.no, **When** the user views the inventory, **Then** the image renders without errors
2. **Given** a gear item with an image URL from any arbitrary HTTPS domain, **When** the user views the item, **Then** the image loads successfully
3. **Given** a gear item with an image URL from a slow server, **When** the user views the item, **Then** the system shows a placeholder while loading

---

### User Story 3 - Upload Externally-Sourced Images (Priority: P1)

A user imports an image via the image search feature and saves their gear item. The image uploads successfully to storage without being rejected due to invalid file type metadata.

**Why this priority**: This is critical for the save workflow - users cannot save items with imported images because storage rejects files with invalid MIME types.

**Independent Test**: Search for an image, select it, and save the gear item. The item saves successfully with the image stored.

**Acceptance Scenarios**:

1. **Given** a user imports an image via search that returns no MIME type, **When** they save the gear item, **Then** the image uploads successfully with a valid image format
2. **Given** a user imports an image with "application/octet-stream" content type, **When** they save, **Then** the image is converted to a valid image type and uploads
3. **Given** a user saves a gear item with an imported image, **When** the save completes, **Then** the image is stored and displays correctly when viewing the item

---

### Edge Cases

- What happens when an external image URL returns a 404?
- How does the system handle extremely slow image loading from external domains?
- What happens if the imported image is corrupted but has a valid extension?
- How does the system behave with very large images from external sources?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The inventory page MUST display item counts correctly by passing required parameters to localized messages
- **FR-002**: The inventory page MUST support filtered counts (showing X of Y items) in all supported locales
- **FR-003**: The system MUST allow images from any HTTPS domain to be displayed
- **FR-004**: The system MUST not crash when encountering images from previously unwhitelisted domains
- **FR-005**: When uploading imported images, the system MUST ensure a valid image MIME type is set
- **FR-006**: If an imported image has no MIME type or an invalid type, the system MUST default to a standard image format
- **FR-007**: File extensions MUST match the assigned MIME type to prevent format mismatches
- **FR-008**: Storage uploads MUST pass validation rules requiring image/* content types

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Inventory page loads without errors on 100% of page views across all locales
- **SC-002**: Item count messages display correctly with proper parameter substitution in all locales
- **SC-003**: Images from any external HTTPS domain display without causing crashes
- **SC-004**: Image uploads from the import feature succeed on 100% of attempts with valid source images
- **SC-005**: Zero "FORMATTING_ERROR" exceptions in the inventory page
- **SC-006**: Zero "hostname not allowed" errors when displaying external images

## Assumptions

- The application supports English (en) and German (de) locales
- The i18n message for "showingItems" expects `filtered` and `total` parameters
- Firebase Storage security rules require content type to start with "image/"
- The image proxy may return blobs without proper MIME type headers
- JPEG is a reasonable fallback format for images with unknown types
