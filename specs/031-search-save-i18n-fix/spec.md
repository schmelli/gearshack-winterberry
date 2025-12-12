# Feature Specification: Search Save Fix & i18n Repair Sprint

**Feature Branch**: `031-search-save-i18n-fix`
**Created**: 2025-12-08
**Status**: Draft
**Input**: User description: "Search Save Fix & i18n Repair Sprint - Fix save error when selecting images via Search (Serper) and fix i18n FORMATTING_ERROR on Inventory page"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save Gear Item with Search-Selected Image (Priority: P1)

A user opens the Gear Editor, enters brand and name, clicks the Search button to find a product image, selects an image from the 3x3 grid, and saves the gear item. The item should save successfully with the external image URL stored in Firestore.

**Why this priority**: This is a critical bug that prevents users from completing the core workflow introduced in Feature 030 (Integrated Image Search). Without this fix, the search feature is unusable for its intended purpose.

**Independent Test**: Create a new gear item, enter "MSR" as brand and "Hubba Hubba" as name, click Search, select any image from results, fill required fields, click Save. Verify item saves successfully and appears in inventory with the selected image.

**Acceptance Scenarios**:

1. **Given** a user in the Gear Editor with brand "MSR" and name "Hubba Hubba" entered, **When** they click Search, select an image from results, and click Save, **Then** the item is saved to Firestore with the external image URL and redirects to inventory
2. **Given** a user has selected a search image (external URL), **When** they save the form, **Then** no file upload is attempted and the URL string is saved directly to `primary_image` in Firestore
3. **Given** a user selects a search image after previously uploading a file, **When** they save, **Then** the external URL is saved (not the previous file) and no upload errors occur

---

### User Story 2 - View Inventory Page Without i18n Crash (Priority: P1)

A user navigates to the Inventory page in German locale. The page should load without crashing and display the correct localized text including the item count message.

**Why this priority**: This is a critical crash bug that completely breaks the Inventory page for German users. The FORMATTING_ERROR prevents the page from rendering at all.

**Independent Test**: Switch locale to German (/de/inventory), verify page loads without error and displays "Zeige X von Y Gegenständen" when filters are active.

**Acceptance Scenarios**:

1. **Given** a user on the German locale Inventory page with filters applied, **When** the page renders, **Then** the correct message "Zeige {filtered} von {total} Gegenständen" displays without FORMATTING_ERROR
2. **Given** a user on the English locale Inventory page with filters applied, **When** the page renders, **Then** the correct message "Showing {filtered} of {total} items" displays
3. **Given** a user viewing the Inventory page with no filters, **When** the page renders, **Then** the simple item count "{count} items" displays correctly in both locales

---

### User Story 3 - Visual Feedback on Image Selection (Priority: P2)

A user selects an image from search results and sees a Toast notification confirming the selection, providing immediate feedback that the action was successful.

**Why this priority**: This is a polish improvement that enhances UX but doesn't block core functionality. Users can still complete tasks without this feedback.

**Independent Test**: In Gear Editor, search for images and click one. Verify a Toast appears saying "Image selected" before the grid closes.

**Acceptance Scenarios**:

1. **Given** a user viewing search results, **When** they click an image, **Then** a Toast notification "Image selected" appears briefly before the grid closes

---

### Edge Cases

- What happens when a user selects a search image, then switches to Upload mode and uploads a file? The uploaded file should replace the search URL
- What happens when a search image URL is invalid or broken? The image preview shows fallback/error state, but save still succeeds with the URL
- What happens when the `nobgImages` field is accessed for an external URL? It should be null/undefined (no background removal processing for external URLs)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST save gear items with external image URLs directly to Firestore without attempting file upload
- **FR-002**: System MUST NOT attempt to fetch, blob, or process external URLs as file uploads
- **FR-003**: System MUST clear any pending local file state when a search image is selected
- **FR-004**: System MUST pass `{filtered}` and `{total}` variables to the `showingItems` translation call
- **FR-005**: System MUST ensure `de.json` and `en.json` have matching variable placeholders for `showingItems`
- **FR-006**: System MUST display Toast notification "Image selected" when user clicks a search result
- **FR-007**: System MUST preserve `nobgImages` as null/undefined for items with external image URLs (no Cloud Functions processing)

### Key Entities *(include if feature involves data)*

- **GearItem.primaryImageUrl**: String field that can contain either a Firebase Storage URL (uploaded) or an external URL (search-selected). Both are valid and should be saved directly.
- **Translation Messages**: `showingItems` key in `messages/de.json` and `messages/en.json` with `{filtered}` and `{total}` placeholders

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can save gear items with search-selected images 100% of the time without errors
- **SC-002**: Inventory page loads without crashes in both English and German locales
- **SC-003**: Item count text displays correctly with filter variables interpolated
- **SC-004**: Toast feedback appears within 100ms of image selection click
- **SC-005**: No console errors related to image upload or i18n formatting when using search images or German locale
