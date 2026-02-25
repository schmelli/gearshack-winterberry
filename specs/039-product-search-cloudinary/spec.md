# Feature Specification: Restore Product Search with Cloudinary Integration

**Feature Branch**: `039-product-search-cloudinary`
**Created**: 2025-12-09
**Status**: Draft
**Input**: User description: "Restore Product Search with Cloudinary Integration - Users are dissatisfied with the Cloudinary Widget (Unsplash) because it lacks specific product images. Restore Serper (Google Images) search functionality but route selected images to Cloudinary storage."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search and Select Specific Product Image (Priority: P1)

A user is adding or editing a gear item and wants to find a specific product image (e.g., "Nitecore NB10000 power bank"). They enter a search term, see Google Image results displayed in a grid, and click one to have it automatically uploaded to Cloudinary and linked to their item.

**Why this priority**: This is the core functionality - users need to find specific product images that generic stock photo sources (Unsplash) don't provide. This directly addresses the user's pain point.

**Independent Test**: Open gear editor, type "MSR Hubba Hubba tent" in the search field, click Search, verify image grid appears with relevant product images, click one image, verify it uploads to Cloudinary and appears in the form.

**Acceptance Scenarios**:

1. **Given** user is editing a gear item, **When** they enter "Osprey Exos 58" in the search field and click Search, **Then** a grid of product images appears from Google Images
2. **Given** search results are displayed, **When** user clicks an image thumbnail, **Then** the system uploads the image to Cloudinary and populates the form with the Cloudinary URL
3. **Given** user has selected an image, **When** they view the image preview area, **Then** the Cloudinary-hosted image is displayed (not the original external URL)
4. **Given** upload to Cloudinary is in progress, **When** user views the UI, **Then** a loading indicator shows the upload status

---

### User Story 2 - Visual Feedback During Search and Upload (Priority: P1)

A user performs a search and sees immediate loading feedback, then selects an image and sees upload progress to Cloudinary. This ensures users know the system is working.

**Why this priority**: Essential for good UX - users need to understand the two-step process (search → upload) and see progress for each.

**Independent Test**: Click search and observe loading indicator, select an image and observe upload progress indicator until completion.

**Acceptance Scenarios**:

1. **Given** user clicks the search button, **When** the search is in progress, **Then** a loading indicator is visible
2. **Given** search results are shown and user clicks an image, **When** upload to Cloudinary begins, **Then** an upload progress indicator is visible
3. **Given** upload completes successfully, **When** the Cloudinary URL is saved, **Then** a success message appears and the image is displayed

---

### User Story 3 - Demote Cloud Import Widget to Secondary Option (Priority: P2)

The generic Cloudinary Upload Widget (Unsplash/URL) should be available as a secondary option for users who want stock photos, but the product search should be the primary/prominent image selection method.

**Why this priority**: Maintains flexibility for different use cases while prioritizing the most requested workflow (specific product images).

**Independent Test**: Verify the ImageUploadZone shows Product Search prominently and Cloud Import (Unsplash) as a secondary option.

**Acceptance Scenarios**:

1. **Given** user views the image upload area, **When** examining the UI hierarchy, **Then** Product Search is the primary action and Cloud Import is secondary
2. **Given** user wants to use Unsplash, **When** they look for Cloud Import option, **Then** it is still accessible (not removed entirely)

---

### Edge Cases

- What happens when no search results are found? (Show "No images found for '[query]'. Try different search terms.")
- What happens if the selected image URL fails to upload to Cloudinary? (Show "Failed to upload image. Please try again or select a different image." with retry button, keep search results visible)
- What happens if user searches rapidly multiple times? (Debounce searches 300ms, show latest results only)
- What happens if user clicks another image while previous is uploading? (Cancel previous upload, start new one)
- What happens if the image URL is blocked by CORS or the source server? (Show "This image couldn't be loaded. Please select a different image.")
- What happens if Serper API is unavailable? (Show "Image search is temporarily unavailable. Please try again later or upload an image directly.")

## Requirements *(mandatory)*

### Functional Requirements

**Search Interface**:
- **FR-001**: System MUST provide a search input field in the image upload area
- **FR-002**: System MUST allow users to enter custom search queries (not just brand+name)
- **FR-003**: System MUST display a search button to initiate the image search
- **FR-004**: System MUST debounce rapid search requests (300ms minimum between requests)

**Search Results**:
- **FR-005**: System MUST display up to 9 image results in a visual grid
- **FR-006**: Each result MUST show a thumbnail that users can preview
- **FR-007**: Search results MUST be fetched from the Serper.dev Google Images API via server action

**Image Selection & Upload**:
- **FR-008**: When user clicks a search result, system MUST upload the image URL to Cloudinary
- **FR-009**: System MUST use the existing Cloudinary unsigned upload preset for URL uploads
- **FR-010**: After successful upload, system MUST update the form with the Cloudinary `secure_url`
- **FR-011**: System MUST organize uploaded images in folder `gearshack/users/{userId}/{itemId}/`

**User Feedback**:
- **FR-012**: System MUST show a loading indicator during search
- **FR-013**: System MUST show an upload progress indicator while uploading to Cloudinary
- **FR-014**: System MUST display user-friendly error messages on failure
- **FR-015**: System MUST display success confirmation when upload completes

**UI Organization**:
- **FR-016**: Product Search MUST be the primary/prominent image selection method
- **FR-017**: Cloud Import Widget (Unsplash/URL) MUST remain accessible as a secondary option
- **FR-018**: Drag-and-drop local file upload MUST remain available

### Key Entities

- **Search Query**: User-entered text to search for product images
- **Search Result**: Image from Serper API (thumbnailUrl, imageUrl, title)
- **Cloudinary Upload**: The process of uploading an external URL to Cloudinary storage
- **Image Selection**: The final Cloudinary `secure_url` that populates the form

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can search and select a product image in under 15 seconds (search + upload to Cloudinary)
- **SC-002**: 95% of search requests return results within 3 seconds
- **SC-003**: 90% of selected images successfully upload to Cloudinary on first attempt
- **SC-004**: Users find specific product images (not generic stock photos) without leaving the application
- **SC-005**: Error states provide actionable guidance in 100% of failure scenarios
- **SC-006**: Existing local file upload and Cloud Import workflows continue to function correctly

## Assumptions

- Serper.dev API is configured with SERPER_API_KEY environment variable
- Cloudinary unsigned upload preset is configured and supports URL uploads
- The existing `useCloudinaryUpload` hook can be extended to accept URLs (not just Files)
- The `searchGearImages` server action from Feature 030 already exists and works correctly
- Cloudinary's URL upload method handles CORS issues server-side
- Users have reasonable internet connection (combined search + upload under 15 seconds)
