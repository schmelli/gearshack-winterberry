# Feature Specification: Unified Gear Detail Modal with External Intelligence

**Feature Branch**: `045-gear-detail-modal`
**Created**: 2025-12-11
**Status**: Clarified
**Input**: User description: "Unified Gear Detail Modal with External Intelligence - A centralized detail view for gear items that displays comprehensive specs, GearGraph insights, and YouTube reviews"

## Clarifications

### Session 2025-12-11

- Q: Where should YouTube API results be cached? → A: Database table (shared across all users, persists across deployments)
- Q: GearGraph implementation strategy? → A: Full implementation now (connect to GearGraph API, handle all edge cases)
- Q: How to handle YouTube API quota exhaustion? → A: Fail silently (show "Unable to load reviews" like service unavailable)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Gear Details from Inventory (Priority: P1)

As a user browsing my gear inventory, I want to click on any gear card to immediately see all stored specifications in a modal dialog, so I can quickly review item details without navigating away from my inventory view.

**Why this priority**: This is the core functionality that provides immediate value. Users need to see their own data first before any external enrichment. This story alone delivers a complete, usable feature.

**Independent Test**: Can be fully tested by clicking any gear card in the inventory grid and verifying all stored data displays correctly. Delivers the ability to quickly review gear details without page navigation.

**Acceptance Scenarios**:

1. **Given** I am viewing my inventory grid, **When** I click on a gear card, **Then** a modal opens displaying all stored specifications for that item within 100ms
2. **Given** I have a gear item with a primary image, **When** I open its detail modal, **Then** the image displays prominently at the top of the modal
3. **Given** I have a gear item with gallery images, **When** I open its detail modal, **Then** I can browse through all gallery images
4. **Given** I have a gear item with weight data, **When** I open its detail modal, **Then** the weight displays in my preferred unit (g/oz/lb)
5. **Given** I have a gear item with purchase information, **When** I open its detail modal, **Then** I see price, date, and retailer information
6. **Given** the modal is open, **When** I click outside the modal or press Escape, **Then** the modal closes and I return to my previous view

---

### User Story 2 - View Gear Details from Loadouts (Priority: P1)

As a user planning a loadout, I want to click on any gear item in my loadout to see its full details, so I can verify specifications while building my pack list.

**Why this priority**: Loadout planning is a core use case. Users need to reference gear specs while building loadouts without losing their planning context.

**Independent Test**: Can be fully tested by opening a loadout, clicking any item in the loadout list, and verifying the detail modal displays with all item specifications.

**Acceptance Scenarios**:

1. **Given** I am viewing a loadout detail page, **When** I click on a gear item in the list, **Then** the detail modal opens with that item's specifications
2. **Given** the detail modal is open from a loadout, **When** I close the modal, **Then** I return to the loadout view at my previous scroll position

---

### User Story 3 - YouTube Review Discovery (Priority: P2)

As a user researching my gear, I want to see relevant YouTube reviews for a product directly in the detail modal, so I can validate my gear choice and learn from others' experiences without leaving the app.

**Why this priority**: External social proof adds significant value but requires external integrations. Users can still access gear details without this feature, making it a meaningful enhancement rather than core functionality.

**Independent Test**: Can be tested by opening a gear item with brand and name populated, and verifying that relevant YouTube videos appear in a carousel section after a brief loading period.

**Acceptance Scenarios**:

1. **Given** I open a detail modal for a gear item with brand and name, **When** the modal loads, **Then** I see a "Reviews" section with a loading indicator while videos are fetched
2. **Given** the system has fetched YouTube reviews, **When** the loading completes, **Then** I see up to 5 relevant video thumbnails in a horizontal carousel
3. **Given** I see video thumbnails, **When** I click on a thumbnail, **Then** the video opens in a new browser tab on YouTube
4. **Given** I open the same gear item modal again within 7 days, **When** the modal loads, **Then** the same videos appear immediately without visible loading (cache hit)
5. **Given** a gear item has no brand or name specified, **When** I open its detail modal, **Then** the Reviews section shows a message explaining that product details are needed to find reviews

---

### User Story 4 - Gear Insights from Knowledge Graph (Priority: P3)

As a user exploring my gear, I want to see intelligent insights about a product (compatibility, seasonality, related items), so I can make better decisions about when and how to use my equipment.

**Why this priority**: Graph-based insights provide differentiated value but depend on the GearGraph data being populated. This is a future-facing feature that enhances the experience once the knowledge base is mature.

**Independent Test**: Can be tested by opening a gear item that has been indexed in the knowledge graph and verifying that insights (tags, compatibility, seasonality) display in a dedicated section.

**Acceptance Scenarios**:

1. **Given** I open a detail modal for a gear item, **When** the modal loads, **Then** I see a "Gear Insights" section with a loading indicator
2. **Given** the knowledge graph has insights for this item, **When** loading completes, **Then** I see relevant tags such as "Winter Suitable", "Ultralight", or "Compatible with X"
3. **Given** no insights are available for an item, **When** loading completes, **Then** the Insights section shows a friendly message that insights are not yet available for this product

---

### User Story 5 - Edit Navigation from Detail Modal (Priority: P2)

As a user viewing gear details, I want to quickly navigate to edit the item, so I can update information without multiple clicks.

**Why this priority**: Streamlines the user workflow between viewing and editing, reducing friction for data management tasks.

**Independent Test**: Can be tested by opening a detail modal and clicking an "Edit" button, verifying navigation to the edit page for that item.

**Acceptance Scenarios**:

1. **Given** I am viewing a gear detail modal, **When** I click the "Edit" button, **Then** I am navigated to the gear editor page for that item
2. **Given** I click Edit from the modal, **When** the editor page loads, **Then** the item's existing data is pre-populated in the form

---

### Edge Cases

- What happens when a gear item has no images? The modal displays a placeholder image area with a prompt to add an image.
- What happens when the YouTube search returns no results? The Reviews section displays "No reviews found for this product" with a suggestion to try a manual YouTube search.
- What happens when the YouTube service is unavailable? The Reviews section displays "Unable to load reviews" with a retry button.
- What happens when the GearGraph service is unavailable? The Insights section displays "Insights temporarily unavailable" without blocking other content.
- What happens when opening a modal for a deleted item (race condition)? The system detects the missing item and shows an error message, closing the modal.
- How does the modal handle very long item names or descriptions? Text truncates with ellipsis, with full content available via expansion or tooltip.
- What happens on mobile devices with limited screen space? The modal adapts to full-screen sheet layout with touch-friendly scrolling.

## Requirements *(mandatory)*

### Functional Requirements

**Core Modal Behavior:**
- **FR-001**: System MUST open a detail modal when users click on any gear card in the inventory grid
- **FR-002**: System MUST open a detail modal when users click on any gear item in a loadout view
- **FR-003**: Modal MUST display all stored gear item data (name, brand, description, weight, dimensions, purchase info, condition, status, notes)
- **FR-004**: Modal MUST display the primary image and gallery images with browsing capability
- **FR-005**: Modal MUST close when user clicks outside, presses Escape, or clicks a close button
- **FR-006**: Modal MUST include an "Edit" action that navigates to the gear editor for that item
- **FR-007**: Modal MUST display loading skeletons for external data sections while local data renders immediately

**YouTube Integration:**
- **FR-008**: System MUST fetch YouTube videos based on gear item brand and product name
- **FR-009**: System MUST search using the query format: "{Brand} {Model} review outdoor gear"
- **FR-010**: System MUST display up to 5 video results in a horizontal carousel
- **FR-011**: System MUST cache YouTube search results in a shared database table with a 7-day time-to-live (cache shared across all users)
- **FR-012**: System MUST serve cached results without making new external requests when cache is valid
- **FR-013**: Clicking a video thumbnail MUST open the YouTube video in a new browser tab
- **FR-014**: System MUST handle missing brand/name gracefully with an explanatory message
- **FR-014a**: System MUST handle YouTube API quota exhaustion by showing "Unable to load reviews" (same as service unavailable)

**GearGraph Integration (Full Implementation):**
- **FR-015**: System MUST fetch insights from the GearGraph knowledge base via API
- **FR-016**: System MUST display insights as visual tags or badges (e.g., seasonality, weight class, compatibility)
- **FR-017**: System MUST gracefully handle unavailable insights with a non-blocking message
- **FR-017a**: System MUST handle GearGraph API errors, timeouts, and empty responses gracefully

**Performance & UX:**
- **FR-018**: Modal MUST open and display local data within 100 milliseconds of user click
- **FR-019**: System MUST use skeleton loaders for YouTube and Insights sections during data fetch
- **FR-020**: Modal MUST be responsive and adapt to mobile screen sizes as a full-screen sheet

### Key Entities

- **GearItem**: The existing gear item entity with all stored specifications (name, brand, weight, dimensions, images, etc.)
- **YouTubeVideo**: Represents a YouTube video result (video ID, title, thumbnail URL, channel name)
- **GearInsight**: Represents a knowledge graph insight (type: seasonality/compatibility/category, label, confidence score)
- **ApiCache**: Cached external data (cache key, response data, expiration timestamp, created timestamp)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view complete gear details within 100ms of clicking a gear card (modal opens with local data instantly)
- **SC-002**: YouTube video carousel loads and displays within 3 seconds of modal opening (first request) or instantly (cache hit)
- **SC-003**: Repeated views of the same gear item within 7 days do not trigger new YouTube searches (100% cache hit rate for repeated views)
- **SC-004**: Modal is accessible from all contexts where gear items appear (inventory, loadouts, search results)
- **SC-005**: Users can navigate from detail view to edit view in a single click
- **SC-006**: Mobile users can view and interact with the detail modal without horizontal scrolling
- **SC-007**: External service failures (YouTube, GearGraph) do not prevent users from viewing their local gear data

## Assumptions

- YouTube Data API v3 credentials will be configured in the application environment
- The GearGraph knowledge base may not be fully populated initially; the feature should degrade gracefully
- Users have authenticated before accessing inventory/loadout views where the modal is accessible
- Gear items will have at minimum a name field populated; brand is optional but recommended for better search results
- The existing gear item data model provides all necessary fields for display
