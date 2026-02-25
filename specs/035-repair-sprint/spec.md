# Feature Specification: Repair Sprint - Proxy Route & Navigation Fixes

**Feature Branch**: `035-repair-sprint`
**Created**: 2025-12-08
**Status**: Draft
**Input**: User description: "Execute Repair Sprint: Force-create Proxy Route and Fix Navigation Links. Critical bugs: 1) Save fails due to missing proxy-image route, 2) Edit links return 404 due to missing locale prefix, 3) Invalid language tag errors from undefined locale."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save Gear Item with External Image (Priority: P1)

A user searches for an image via the integrated image search feature and selects an external image URL. When the user saves the gear item, the system should successfully proxy and store the image, completing the save operation without errors.

**Why this priority**: This is the most critical bug - users cannot save gear items that use external images from the search feature, which is core functionality.

**Independent Test**: Can be fully tested by creating/editing a gear item, selecting an external image from search, and clicking Save. Success is measured by the item being saved and appearing in inventory.

**Acceptance Scenarios**:

1. **Given** a user is editing a gear item with an external image URL from search, **When** the user clicks Save, **Then** the item saves successfully and the user sees a success confirmation
2. **Given** a user is creating a new gear item with an external image, **When** the user completes the form and saves, **Then** the gear item appears in their inventory with the image displayed
3. **Given** an external image URL that fails to load (404, timeout, etc.), **When** the user attempts to save, **Then** the system displays a descriptive error message indicating the image could not be fetched

---

### User Story 2 - Navigate to Edit Gear Item (Priority: P1)

A user viewing their gear inventory clicks the "Edit" button on any gear item card. The system navigates them to the edit page for that specific item, regardless of which locale they are using.

**Why this priority**: This is equally critical - users cannot edit existing items, which is core functionality.

**Independent Test**: Can be fully tested by navigating to inventory in any locale (e.g., /de/inventory), clicking Edit on an item, and verifying the edit page loads correctly.

**Acceptance Scenarios**:

1. **Given** a user on the inventory page in English (en locale), **When** the user clicks Edit on a gear item, **Then** the browser navigates to /en/inventory/edit/{itemId} and the edit form loads
2. **Given** a user on the inventory page in German (de locale), **When** the user clicks Edit on a gear item, **Then** the browser navigates to /de/inventory/edit/{itemId} and the edit form loads
3. **Given** a user on the inventory page in any supported locale, **When** the user clicks Edit, **Then** the current locale is preserved in the navigation URL

---

### User Story 3 - Save and Return to Inventory (Priority: P2)

A user edits a gear item and clicks Save. After successful save, the system redirects them back to the inventory page, preserving their current locale setting.

**Why this priority**: While the save function itself works, the redirect after save needs to preserve locale context for a seamless user experience.

**Independent Test**: Can be fully tested by editing an item in any locale, saving it, and verifying the redirect goes to the correct localized inventory URL.

**Acceptance Scenarios**:

1. **Given** a user on the edit page in German locale, **When** the user saves the gear item, **Then** the browser redirects to /de/inventory (not /inventory)
2. **Given** a user on the edit page in English locale, **When** the user saves the gear item, **Then** the browser redirects to /en/inventory
3. **Given** a user saves an item, **When** the redirect occurs, **Then** the inventory page loads without "invalid language tag" errors

---

### User Story 4 - Application Loads Without i18n Errors (Priority: P2)

A user navigates to any page in the application. The page loads without console errors related to "invalid language tag" and all translated content displays correctly.

**Why this priority**: While the app may function, i18n errors indicate underlying issues that could cause unpredictable behavior and degrade user experience.

**Independent Test**: Can be tested by opening the browser console and navigating through the app - no "invalid language tag" errors should appear.

**Acceptance Scenarios**:

1. **Given** a user navigates to the root URL, **When** the page loads, **Then** the middleware correctly redirects to a locale-prefixed URL (e.g., /en/)
2. **Given** a user is on any localized page, **When** they navigate to another page, **Then** no "invalid language tag" errors appear in the console
3. **Given** the application layout renders, **When** the locale parameter is processed, **Then** the locale value is always a valid, defined string

---

### Edge Cases

- What happens when the external image URL returns a non-image content type?
- How does the system handle extremely large images that may timeout during proxy?
- What happens if the user's session expires during the save operation?
- How does the system behave when navigating directly to a URL without locale prefix?
- What happens if the external image server blocks the proxy request (CORS/403)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an endpoint that proxies external image URLs, fetching the image and returning it with appropriate content-type headers
- **FR-002**: System MUST validate that the proxied URL returns image content before processing
- **FR-003**: System MUST display descriptive error messages when image proxy fails, distinguishing between different failure modes (404, timeout, invalid content type)
- **FR-004**: All navigation links to edit pages MUST include the current user's locale prefix in the URL path
- **FR-005**: Navigation links MUST use locale-aware routing components rather than hardcoded paths
- **FR-006**: Post-save redirects MUST preserve the current locale context
- **FR-007**: System MUST pass valid locale parameters to the layout component at all times
- **FR-008**: System MUST gracefully handle undefined locale values by defaulting to the primary locale

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can save gear items with external images on 100% of attempts (assuming valid image URL)
- **SC-002**: Users can navigate to edit any gear item from inventory in any locale on 100% of attempts
- **SC-003**: Zero "invalid language tag" errors appear in browser console during normal application usage
- **SC-004**: All navigation between pages preserves the user's locale selection
- **SC-005**: Error messages for failed saves clearly indicate the nature of the failure (proxy error, network timeout, etc.)

## Assumptions

- The project already has next-intl configured for i18n
- A locale-aware Link component or navigation wrapper exists at `@/i18n/navigation` or similar
- The default/fallback locale is English (en)
- External image URLs from search are HTTPS URLs to public image resources
- The middleware is configured to handle locale routing
