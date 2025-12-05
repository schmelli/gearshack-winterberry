# Feature Specification: Loadouts Search, Filter, and Sort

**Feature Branch**: `017-loadouts-search-filter`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Implement Search, Filter, and Sorting for the Loadouts Dashboard"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search Loadouts by Name (Priority: P1)

A user with multiple loadouts wants to quickly find a specific loadout by typing part of its name. The search should be instant and case-insensitive.

**Why this priority**: Search is the most fundamental discovery mechanism. Users with many loadouts need quick access to specific ones without scrolling through the entire list.

**Independent Test**: Can be fully tested by typing a loadout name in the search field and verifying matching loadouts appear while non-matching ones are hidden.

**Acceptance Scenarios**:

1. **Given** a user has 10 loadouts including "Summer Day Hike" and "Winter Camping Trip", **When** they type "summer" in the search field, **Then** only "Summer Day Hike" appears in the results.
2. **Given** a user has typed a search query, **When** they clear the search field, **Then** all loadouts are displayed again.
3. **Given** a user searches for "xyz123", **When** no loadouts match, **Then** an empty state message "No matching loadouts found" appears with a "Clear Filters" button.

---

### User Story 2 - Filter Loadouts by Activity Type (Priority: P1)

A user planning a specific type of trip wants to see only loadouts tagged with that activity type (Hiking, Camping, Backpacking, Climbing, Skiing).

**Why this priority**: Activity filtering enables users to quickly narrow down their loadouts when preparing for a specific trip type, which is a core use case.

**Independent Test**: Can be fully tested by selecting an activity from the dropdown and verifying only loadouts with that activity type are displayed.

**Acceptance Scenarios**:

1. **Given** a user has loadouts tagged with different activities, **When** they select "Hiking" from the activity filter, **Then** only loadouts with "Hiking" as an activity type are shown.
2. **Given** an activity filter is active, **When** the user selects "All Activities", **Then** all loadouts are displayed regardless of activity type.
3. **Given** a user filters by "Skiing", **When** no loadouts have that activity, **Then** the empty state "No matching loadouts found" appears.

---

### User Story 3 - Sort Loadouts (Priority: P2)

A user wants to organize their loadout list by date or weight to find the most recent or lightest/heaviest loadouts.

**Why this priority**: Sorting provides organization and discovery but is secondary to search and filtering which narrow results. Users can still find loadouts without sorting.

**Independent Test**: Can be fully tested by selecting a sort option and verifying the loadout order changes accordingly.

**Acceptance Scenarios**:

1. **Given** loadouts exist with different creation dates, **When** the user selects "Date (Newest)", **Then** loadouts are ordered with most recently created/updated first.
2. **Given** loadouts exist with different creation dates, **When** the user selects "Date (Oldest)", **Then** loadouts are ordered with oldest first.
3. **Given** loadouts exist with different total weights, **When** the user selects "Weight (Lightest)", **Then** loadouts are ordered from lowest to highest total weight.
4. **Given** loadouts exist with different total weights, **When** the user selects "Weight (Heaviest)", **Then** loadouts are ordered from highest to lowest total weight.

---

### User Story 4 - Combined Filtering with Reset (Priority: P2)

A user wants to combine search, activity filter, and sort to find exactly what they need, and easily reset all filters to start over.

**Why this priority**: Combined filtering provides power users with precision discovery, but individual filters (US1, US2) deliver value independently.

**Independent Test**: Can be fully tested by applying multiple filters, verifying results narrow appropriately, then clicking "Clear Filters" to reset all.

**Acceptance Scenarios**:

1. **Given** a user has searched "camp" and filtered by "Hiking", **When** both criteria apply, **Then** only loadouts matching both conditions appear.
2. **Given** multiple filters are active, **When** the user clicks "Clear Filters", **Then** search is cleared, activity filter resets to "All Activities", and all loadouts are shown.
3. **Given** no filters are active, **Then** the "Clear Filters" button is hidden.

---

### Edge Cases

- What happens when a loadout has no activity types assigned? It should only appear when "All Activities" is selected or when it matches search/sort criteria.
- How does sorting by weight work for loadouts with no items (empty loadouts)? They should have 0 weight and appear first when "Lightest" is selected.
- What happens when search returns results but then the activity filter narrows to zero? The combined empty state should appear.
- What is the default sort order? Newest first (by updatedAt or createdAt).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a search input field that filters loadouts by name (case-insensitive, partial match)
- **FR-002**: System MUST provide an activity filter dropdown with options: All Activities, Hiking, Camping, Climbing, Skiing, Backpacking
- **FR-003**: System MUST provide a sort dropdown with options: Date (Newest), Date (Oldest), Weight (Lightest), Weight (Heaviest)
- **FR-004**: System MUST show a "Clear Filters" button only when at least one filter is active (search has text, activity is not "All", or sort is not default)
- **FR-005**: System MUST display a distinct "No matching loadouts found" message when filters return zero results (different from "No loadouts yet" empty state)
- **FR-006**: System MUST apply all filters/sort client-side on the loadouts array from the store
- **FR-007**: System MUST display the count of shown vs total loadouts when filters are active (e.g., "Showing 3 of 10 loadouts")
- **FR-008**: The toolbar MUST be placed at the top of the loadouts page, styled consistently with the Inventory GalleryToolbar
- **FR-009**: Default sort order MUST be "Date (Newest)" based on the loadout's updatedAt field

### Key Entities

- **Loadout**: Existing entity with `name`, `activityTypes[]`, `updatedAt`, `createdAt`, and computed `totalWeight` (from item weights)
- **ActivityType**: Existing type with values: 'hiking', 'camping', 'climbing', 'skiing', 'backpacking'
- **SortOption**: New type with values: 'date-newest', 'date-oldest', 'weight-lightest', 'weight-heaviest'

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find a specific loadout by name in under 3 seconds using search
- **SC-002**: Users can filter to a specific activity type with 2 interactions (click dropdown, select option)
- **SC-003**: Users can reset all filters with a single click
- **SC-004**: Empty state correctly differentiates between "no loadouts exist" and "no loadouts match filters"
- **SC-005**: Toolbar styling is visually consistent with the Inventory page GalleryToolbar

## Assumptions

- The existing `ACTIVITY_TYPE_LABELS` constant provides display labels for the activity filter dropdown
- Loadout total weight can be computed from the sum of item weights (using existing weight calculation logic)
- The sort by date uses `updatedAt` field (falling back to `createdAt` if not available)
- The "Clear Filters" button only considers search text, activity filter, and sort as "active" (sort resets to default "Newest")
