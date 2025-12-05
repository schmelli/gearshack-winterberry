# Feature Specification: Loadout Management

**Feature Branch**: `005-loadout-management`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Build the Loadout Manager & Global Store feature with zustand state management for combining gear items into trip loadouts"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Manage Loadouts (Priority: P1)

Users need to create trip loadouts by combining gear items from their inventory. A loadout represents a packing list for a specific trip or activity, allowing users to plan what gear to bring and see the total weight.

**Why this priority**: This is the core value proposition - without the ability to create loadouts, the entire feature has no purpose. Users must be able to create, name, and save loadouts to plan their trips.

**Independent Test**: Navigate to /loadouts, create a new loadout with a name and date, verify it appears in the dashboard with correct details.

**Acceptance Scenarios**:

1. **Given** a user on the Loadouts dashboard, **When** they click "Create New Loadout", **Then** they are taken to the loadout editor with an empty loadout
2. **Given** a user creating a new loadout, **When** they enter a name and trip date, **Then** the loadout is saved with those details
3. **Given** a user viewing the Loadouts dashboard, **When** loadouts exist, **Then** they see a grid of cards showing name, date, total weight, and item count
4. **Given** a user on the Loadouts dashboard, **When** they click on an existing loadout card, **Then** they are taken to the loadout editor to modify it
5. **Given** a user editing a loadout, **When** they make changes, **Then** changes are persisted and survive page refresh

---

### User Story 2 - Add Gear Items to Loadouts (Priority: P1)

Users need to browse their inventory and add specific gear items to a loadout. The editor provides a two-column layout where users can see current loadout contents and pick items from inventory.

**Why this priority**: Adding items is essential for loadouts to have any content. Without this, loadouts would be empty shells with no utility.

**Independent Test**: Open a loadout in the editor, search for an item in the picker, click to add it, verify it appears in the loadout list grouped by category.

**Acceptance Scenarios**:

1. **Given** a user in the loadout editor, **When** they view the Picker panel, **Then** they see a searchable list of all their inventory items
2. **Given** a user searching in the Picker, **When** they type a search term, **Then** the list filters to show matching items by name or brand
3. **Given** a user viewing an item in the Picker, **When** they click on it, **Then** the item is instantly added to the loadout with visual feedback
4. **Given** a user viewing the loadout List panel, **When** items are in the loadout, **Then** items are grouped by category with clear section headers
5. **Given** an item already in the loadout, **When** the user clicks on it in the List panel, **Then** the item is removed from the loadout

---

### User Story 3 - Track Real-Time Weight Totals (Priority: P1)

Users need to see the total weight of their loadout update in real-time as they add or remove items. A sticky weight bar provides constant visibility of the pack weight with color-coded feedback.

**Why this priority**: Weight tracking is a primary motivation for using loadout software - ultralight backpackers obsess over every gram. Immediate feedback is essential for the planning experience.

**Independent Test**: Add items to a loadout, observe the sticky weight bar updating in real-time with appropriate color coding.

**Acceptance Scenarios**:

1. **Given** a user editing a loadout, **When** they view the sticky weight bar, **Then** it displays the current total weight in a clearly visible format
2. **Given** a loadout with items, **When** an item is added, **Then** the total weight updates immediately without page refresh
3. **Given** a loadout with items, **When** an item is removed, **Then** the total weight decreases immediately
4. **Given** a loadout total weight under 4.5kg (10 lbs), **When** the user views the weight bar, **Then** it displays in green (ultralight)
5. **Given** a loadout total weight between 4.5kg and 9kg, **When** the user views the weight bar, **Then** it displays in the accent color (moderate)
6. **Given** a loadout total weight over 9kg (20 lbs), **When** the user views the weight bar, **Then** it displays in a warning color (heavy)

---

### User Story 4 - Visualize Weight Distribution (Priority: P2)

Users need to understand how weight is distributed across gear categories through a donut chart visualization. This helps identify which categories contribute most to pack weight.

**Why this priority**: While valuable for analysis, the donut chart is supplementary to core functionality. Users can effectively plan loadouts without it.

**Independent Test**: Add items from multiple categories to a loadout, verify the donut chart shows weight breakdown by category using theme colors.

**Acceptance Scenarios**:

1. **Given** a loadout with items from multiple categories, **When** the user views the donut chart, **Then** it displays weight breakdown by category
2. **Given** the donut chart, **When** a user hovers over a segment, **Then** they see the category name and weight value
3. **Given** the donut chart, **When** rendered, **Then** it uses the app's nature theme colors (forest green, terracotta, stone variants)
4. **Given** the Loadouts dashboard, **When** viewing a loadout card, **Then** a mini donut preview shows the weight distribution

---

### User Story 5 - Persistent Data Storage (Priority: P1)

All gear items and loadouts persist across browser sessions. Users should never lose their inventory or loadout data when they close the browser or refresh the page.

**Why this priority**: Data persistence is foundational - without it, users lose all their work. This underpins every other user story.

**Independent Test**: Create gear items and loadouts, refresh the browser, verify all data remains intact.

**Acceptance Scenarios**:

1. **Given** a user who has created gear items, **When** they refresh the page, **Then** all gear items are preserved
2. **Given** a user who has created loadouts, **When** they close and reopen the browser, **Then** all loadouts and their contents are preserved
3. **Given** a user editing a loadout, **When** they add/remove items, **Then** changes persist automatically without explicit save action
4. **Given** existing mock data, **When** the store is first initialized, **Then** mock data is migrated to the persistent store

---

### User Story 6 - Delete Loadouts (Priority: P2)

Users need to delete loadouts they no longer need. This keeps the dashboard clean and manageable.

**Why this priority**: While important for housekeeping, deletion is secondary to creating and managing active loadouts.

**Independent Test**: Create a loadout, delete it from the dashboard, verify it no longer appears.

**Acceptance Scenarios**:

1. **Given** a user on the Loadouts dashboard, **When** they select delete on a loadout card, **Then** a confirmation dialog appears
2. **Given** a confirmation dialog for deletion, **When** the user confirms, **Then** the loadout is permanently removed
3. **Given** a confirmation dialog for deletion, **When** the user cancels, **Then** the loadout remains unchanged

---

### Edge Cases

- What happens when a user tries to add the same item twice to a loadout? (Assumption: Item can only appear once per loadout - duplicate additions are ignored)
- How does the system handle items with no weight value? (Assumption: Items without weight contribute 0g to total, displayed as "-- g" in the list)
- What happens when all items in a category are removed from a loadout? (Assumption: The category section header disappears)
- How does the system handle very long loadout names? (Assumption: Names are truncated with ellipsis in card view, shown in full in editor)
- What happens if localStorage is unavailable or full? (Assumption: Graceful degradation with in-memory storage and user warning)

## Requirements *(mandatory)*

### Functional Requirements

**Data Store**
- **FR-001**: System MUST provide a centralized client-side store for gear items and loadouts
- **FR-002**: System MUST persist store data to browser localStorage
- **FR-003**: System MUST automatically save changes without explicit user action
- **FR-004**: System MUST migrate existing mock data to the persistent store on first load

**Loadout Dashboard**
- **FR-005**: System MUST display loadouts in a responsive card grid at /loadouts
- **FR-006**: System MUST show loadout name, trip date, total weight, and item count on each card
- **FR-007**: System MUST display a mini donut chart preview on each loadout card
- **FR-008**: System MUST provide a "Create New Loadout" action button
- **FR-009**: System MUST enable navigation to the loadout editor when clicking a card

**Loadout Editor**
- **FR-010**: System MUST display a two-column layout on desktop (List + Picker)
- **FR-011**: System MUST stack panels vertically on mobile viewports
- **FR-012**: System MUST group loadout items by category in the List panel
- **FR-013**: System MUST provide a searchable item picker from inventory
- **FR-014**: System MUST add items to loadout on single click/tap
- **FR-015**: System MUST remove items from loadout on single click/tap in List panel
- **FR-016**: System MUST display visual feedback when items are added/removed

**Weight Tracking**
- **FR-017**: System MUST display a sticky weight bar that remains visible during scroll
- **FR-018**: System MUST update total weight in real-time as items change
- **FR-019**: System MUST color-code the weight bar based on total weight thresholds
- **FR-020**: System MUST format weight display in grams with thousands separator (e.g., "1,483 g")

**Visualization**
- **FR-021**: System MUST render a donut chart showing weight by category
- **FR-022**: System MUST use app theme colors (CSS variables) for chart segments
- **FR-023**: System MUST show tooltips on chart segment hover

**Loadout Management**
- **FR-024**: System MUST allow users to set loadout name and trip date
- **FR-025**: System MUST allow users to delete loadouts with confirmation
- **FR-026**: System MUST prevent duplicate items within a single loadout

### Key Entities

- **Loadout**: A collection of gear items for a specific trip. Contains: id, name, tripDate, itemIds (references to GearItems), createdAt, updatedAt
- **GearItem**: An individual piece of gear (already exists). Used within loadouts by reference (itemId)
- **LoadoutItem**: The association between a loadout and a gear item, potentially with loadout-specific attributes in future (quantity, packed status)
- **CategoryWeight**: Computed aggregation of weight by category for visualization

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new loadout and add items in under 60 seconds
- **SC-002**: Weight total updates within 100ms of adding/removing items (perceived instant)
- **SC-003**: All data persists across browser refresh with 100% reliability
- **SC-004**: Loadout dashboard displays up to 50 loadouts without noticeable performance degradation
- **SC-005**: Search in item picker returns results within 200ms of typing
- **SC-006**: Donut chart renders correctly on all supported browsers (Chrome, Safari, Firefox)
- **SC-007**: Two-column layout correctly adapts to mobile viewport (< 768px)
- **SC-008**: Users can identify loadout weight category (ultralight/moderate/heavy) at a glance via color coding

## Assumptions

- Weight thresholds for color coding: Ultralight < 4.5kg, Moderate 4.5-9kg, Heavy > 9kg (industry standard backpacking ranges)
- Chart colors derive from existing CSS variables (--primary, --accent, --muted, --chart-* series)
- Items are unique per loadout (no quantity field in v1 - can be added later)
- Trip date is optional but recommended for loadout organization
- All existing hooks (useInventory, useGearEditor) will be migrated to use the new store
- ScrollArea component from shadcn/ui will be used for the picker panel
- recharts library will be used for donut chart visualization
