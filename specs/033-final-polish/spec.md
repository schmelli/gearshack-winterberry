# Feature Specification: Final Polish Sprint

**Feature Branch**: `033-final-polish`
**Created**: 2025-12-08
**Status**: Draft
**Input**: User description: "Final Polish Sprint: Fix i18n Missing Keys and Verify Proxy Route"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verify i18n Keys are Complete (Priority: P1)

A user navigates to the Inventory page in German locale and sees the item count display correctly without any MISSING_MESSAGE errors. The translation system resolves all keys properly and displays localized text.

**Why this priority**: Runtime errors from missing translation keys crash the user experience and make the app appear broken.

**Independent Test**: Visit `/de/inventory` with items in inventory → Verify item count displays as "X Gegenstände" without console errors

**Acceptance Scenarios**:

1. **Given** a user on the German locale inventory page with items, **When** the page renders, **Then** the item count displays properly in German (e.g., "5 Gegenstände")
2. **Given** a user filtering items on the German inventory page, **When** results are filtered, **Then** the "Zeige X von Y Gegenständen" text displays correctly
3. **Given** a user on the English locale inventory page, **When** the page renders, **Then** the item count displays as "X items" without errors

---

### User Story 2 - Verify Image Proxy Route Functions Correctly (Priority: P1)

The server-side image proxy endpoint correctly fetches external images, validates content types, and returns the image data to the client. This enables the image search feature to import external images into Firebase Storage.

**Why this priority**: The proxy route is essential for the image import feature that prevents link rot.

**Independent Test**: Call `/api/proxy-image?url=<valid-external-image-url>` → Verify binary image data is returned with correct Content-Type header

**Acceptance Scenarios**:

1. **Given** a valid external image URL, **When** requested through the proxy, **Then** the image content is returned with correct content-type header
2. **Given** a URL pointing to non-image content, **When** requested through the proxy, **Then** a 403 error with "NOT_IMAGE" code is returned
3. **Given** an invalid or malformed URL, **When** requested through the proxy, **Then** a 400 error with appropriate error code is returned
4. **Given** a localhost or private IP URL, **When** requested through the proxy, **Then** a 400 error with "BLOCKED_URL" code is returned (SSRF protection)

---

### User Story 3 - Verify Image Import During Save (Priority: P1)

When a user saves a gear item with an external image URL (from image search), the system automatically imports the image through the proxy and uploads it to Firebase Storage, saving the Firebase URL instead of the external URL.

**Why this priority**: This completes the secure asset pipeline and prevents link rot for search-selected images.

**Independent Test**: Create new gear item → Select image from search → Save → Verify saved item has Firebase Storage URL (not external URL)

**Acceptance Scenarios**:

1. **Given** a user saving a gear item with an external image URL, **When** the save completes, **Then** the stored primaryImageUrl is a Firebase Storage URL
2. **Given** a user saving a gear item with an existing Firebase image, **When** the save completes, **Then** no re-upload occurs and the URL remains unchanged
3. **Given** a network error during image import, **When** the save is attempted, **Then** an error toast is displayed and the save is aborted gracefully

---

### Edge Cases

- What happens when the proxy request times out? A 504 TIMEOUT error is returned after 30 seconds
- What happens when the external image exceeds 10MB? A 413 TOO_LARGE error is returned
- What happens when translations use ICU format incorrectly? The translation library shows a formatting error
- What happens when the user is not authenticated during save? The import fails with auth error (existing auth check)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST have translation keys for all item count displays in both English and German
- **FR-002**: System MUST correctly use ICU message format for parameterized translations (e.g., `{count}` placeholders)
- **FR-003**: System MUST provide a server-side image proxy endpoint at `/api/proxy-image`
- **FR-004**: Proxy endpoint MUST validate that requested URLs are valid HTTP/HTTPS URLs
- **FR-005**: Proxy endpoint MUST validate that response content-type starts with `image/`
- **FR-006**: Proxy endpoint MUST return appropriate error codes for different failure scenarios
- **FR-007**: Save logic MUST check proxy response status and handle errors gracefully
- **FR-008**: Save logic MUST display user-friendly toast messages during import process

### Key Entities

- **Translation Keys**: `Inventory.itemCount` and `Inventory.showingItems` with ICU format placeholders
- **Proxy Endpoint**: `/api/proxy-image?url=<encoded-url>` returning binary image data
- **GearItem.primaryImageUrl**: Always contains Firebase Storage URL after save (never external URL)

### Assumptions

- The existing translation infrastructure (next-intl) is properly configured
- Firebase Storage upload functionality is working correctly
- The proxy endpoint is accessible from the client-side fetch

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero MISSING_MESSAGE console errors when navigating inventory pages in all supported locales
- **SC-002**: 100% of search-selected images result in Firebase Storage URLs after save (no external URLs in persisted data)
- **SC-003**: Proxy endpoint returns correct HTTP status codes for all error scenarios (400, 403, 404, 413, 500, 504)
- **SC-004**: Users see informative toast messages during image import (not generic errors)
- **SC-005**: Build and lint pass without errors related to i18n or proxy functionality
