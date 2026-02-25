# Feature Specification: UI/UX Makeover

**Feature Branch**: `006-ui-makeover`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Perform a major UI/UX Overhaul of the Loadout Editor and App Header to elevate the design to a premium, consumer-facing standard"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Improved Loadout Editor Layout (Priority: P1)

Users editing a loadout need a more intuitive flow where they browse their inventory on the left and see their curated loadout list on the right. The current backwards layout forces users to mentally flip between source and destination, causing friction.

**Why this priority**: The layout reversal is the core UX fix that addresses the "clunky" feeling. All other improvements build on top of a properly structured editing experience.

**Independent Test**: Open a loadout in the editor, verify inventory picker is on the left, loadout list is on the right with sticky behavior, and the layout feels natural for adding items.

**Acceptance Scenarios**:

1. **Given** a user on the loadout editor page on desktop, **When** they view the layout, **Then** they see inventory picker on the left (source) and loadout list on the right (destination)
2. **Given** a user scrolling through a long inventory list, **When** they scroll down, **Then** the loadout list panel remains visible with sticky positioning
3. **Given** a user on mobile viewport, **When** they view the loadout editor, **Then** they see loadout list at top and an "Add Items" button at bottom that opens a sheet/drawer
4. **Given** any viewport size, **When** the user views the editor, **Then** content has proper padding and doesn't touch screen edges

---

### User Story 2 - Enhanced Header and Metadata Display (Priority: P1)

Users need clear visual hierarchy in the loadout header with a prominent title, activity/season tags for context, and weight progress tracking at a glance. This transforms the editor from a data entry form into a trip planning experience.

**Why this priority**: The header is the first thing users see and sets the tone for the entire editing experience. A polished header communicates premium quality.

**Independent Test**: Create a loadout, verify the header displays with styled title, interactive badges, and weight progress bar.

**Acceptance Scenarios**:

1. **Given** a user viewing a loadout editor, **When** they look at the header, **Then** they see the loadout name in a large, distinctive font
2. **Given** a user viewing the header, **When** they see the metadata badges, **Then** they can toggle activity types (Hiking, Camping) and seasons (Summer, Winter)
3. **Given** a user with items in their loadout, **When** they view the header, **Then** they see a weight progress bar showing current base weight
4. **Given** a loadout with trip date set, **When** viewing the header, **Then** the date is displayed prominently near the title

---

### User Story 3 - Interactive Donut Chart (Priority: P2)

Users analyzing their loadout weight distribution need an interactive chart that reveals detailed category information on hover and allows filtering the item list by clicking segments.

**Why this priority**: While valuable for analysis, the enhanced chart builds on the core editing functionality. Users can effectively plan loadouts without interactivity.

**Independent Test**: Add items from multiple categories, hover over chart segments to see tooltips, click segments to filter the loadout list.

**Acceptance Scenarios**:

1. **Given** a loadout with items from multiple categories, **When** a user hovers over a donut segment, **Then** a tooltip displays category name and weight
2. **Given** a donut chart with segments, **When** a user clicks a segment, **Then** the loadout list filters to show only items from that category
3. **Given** the donut chart, **When** rendered, **Then** the total weight is displayed in the center of the donut
4. **Given** the donut chart, **When** rendered, **Then** it uses explicit theme colors (Forest, Clay, Stone, Sky, Amber) - no random colors

---

### User Story 4 - Gear Card Image and Detail View (Priority: P2)

Users browsing gear items need visually rich cards that showcase item images and provide quick access to detailed information. This elevates the picker from a simple list to a visual catalog.

**Why this priority**: Visual enhancements improve the browsing experience but are not essential for the core add/remove functionality.

**Independent Test**: View gear cards in the picker, verify image display with fallback, click card body to open detail modal.

**Acceptance Scenarios**:

1. **Given** a gear item with an image URL, **When** displayed in a card, **Then** the image renders in a properly sized aspect-ratio container
2. **Given** a gear item without an image, **When** displayed in a card, **Then** a high-quality placeholder icon appears on a subtle background
3. **Given** a user clicks the card body (not the add button), **When** the click registers, **Then** a modal opens showing large image, description, and specifications
4. **Given** a gear card with an add button, **When** the user clicks the "+" button, **Then** the item is added without opening the detail modal

---

### User Story 5 - Polished Header Navigation (Priority: P2)

Users need a professionally aligned site header where all elements (logo, navigation, actions) sit on a consistent baseline with adequate spacing. The current cramped header undermines the premium feel.

**Why this priority**: Header polish is important for overall impression but doesn't affect core functionality.

**Independent Test**: View the site header, verify vertical alignment is correct, height provides breathing room, and all elements align to baseline.

**Acceptance Scenarios**:

1. **Given** a user viewing the site header, **When** they look at the layout, **Then** all elements (logo, nav links, actions) are vertically centered
2. **Given** the header component, **When** rendered, **Then** it has minimum height of 72px (h-18) to give elements room to breathe
3. **Given** the logo and navigation, **When** displayed together, **Then** they share a consistent visual baseline

---

### User Story 6 - Feedback and Empty States (Priority: P3)

Users need immediate feedback when actions succeed (toast notifications) and helpful guidance when the loadout is empty. These "polish" touches complete the premium experience.

**Why this priority**: Feedback and empty states are finishing touches that enhance but don't define the core experience.

**Independent Test**: Add an item and verify toast appears, view empty loadout and verify placeholder UI displays.

**Acceptance Scenarios**:

1. **Given** a user adds an item to a loadout, **When** the item is added, **Then** a toast notification confirms the action
2. **Given** a loadout with no items, **When** displayed, **Then** a friendly empty state message appears (e.g., "Your pack is empty")
3. **Given** an empty state, **When** displayed, **Then** it includes helpful guidance on how to add items

---

### Edge Cases

- What happens when the donut chart has only one category? (Single segment fills entire donut, still displays tooltip on hover)
- What happens when a gear item image URL returns 404? (Display fallback placeholder icon gracefully)
- What happens when user clicks filtered chart segment again? (Clears the filter, shows all items)
- How does the sticky loadout list behave when the list is very long? (Internal scroll within the sticky container)
- What happens on mobile when opening the item sheet while keyboard is open? (Sheet respects safe areas, keyboard dismisses)

## Requirements *(mandatory)*

### Functional Requirements

**Layout & Container**
- **FR-001**: System MUST wrap main editor content in a max-width container with proper horizontal padding
- **FR-002**: System MUST display inventory picker on the left column on desktop viewports
- **FR-003**: System MUST display loadout list on the right column with sticky positioning on desktop
- **FR-004**: System MUST stack loadout list above picker on mobile viewports
- **FR-005**: System MUST provide a bottom sheet/drawer for adding items on mobile

**Header & Metadata**
- **FR-006**: System MUST display loadout title in a large, distinctive font (Rock Salt)
- **FR-007**: System MUST display interactive activity badges (Hiking, Camping) that users can toggle
- **FR-008**: System MUST display interactive season badges (Summer, Winter) that users can toggle
- **FR-009**: System MUST display a weight progress bar showing current base weight
- **FR-010**: System MUST persist badge selections with the loadout

**Donut Chart**
- **FR-011**: System MUST display tooltips on chart segment hover showing category name and weight
- **FR-012**: System MUST filter loadout list when user clicks a chart segment
- **FR-013**: System MUST display total weight in the center of the donut
- **FR-014**: System MUST use explicit theme colors for chart segments (no random colors)

**Gear Cards**
- **FR-015**: System MUST render gear item images in aspect-ratio containers
- **FR-016**: System MUST display placeholder icons for items without images
- **FR-017**: System MUST open a detail modal when user clicks the card body
- **FR-018**: System MUST add item to loadout when user clicks the "+" button (without opening modal)

**Site Header**
- **FR-019**: System MUST vertically center all header elements
- **FR-020**: System MUST increase header height to minimum 72px (h-18 in Tailwind) to provide adequate spacing
- **FR-021**: System MUST align logo and navigation to a consistent visual baseline

**Feedback**
- **FR-022**: System MUST display toast notification when item is added to loadout
- **FR-023**: System MUST display empty state UI when loadout has no items

### Key Entities

- **Loadout Metadata**: Activity type (hiking, camping, etc.), Season (summer, winter, etc.) - extends existing Loadout entity with optional classification fields
- **Gear Item Display**: Image URL with fallback behavior, detail view data (description, specs)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify source (inventory) and destination (loadout) columns within 2 seconds of viewing the editor
- **SC-002**: Loadout list remains visible while scrolling through 50+ inventory items on desktop
- **SC-003**: Toast notifications appear within 300ms of adding an item
- **SC-004**: Chart segment click filters the loadout list within 100ms
- **SC-005**: Mobile sheet/drawer opens smoothly within 200ms of tapping "Add Items"
- **SC-006**: All header elements align to within 2px of vertical center
- **SC-007**: Users can toggle activity/season badges with single tap/click
- **SC-008**: Empty state is immediately visible (no scroll required) when loadout has zero items

## Assumptions

- The "Rock Salt" font is already available in the project's font configuration
- Toast notifications will use the existing Sonner library (standard for shadcn/ui projects)
- Badge toggle state will be stored in the Loadout entity as optional arrays (activityTypes, seasons)
- The detail modal will reuse existing Dialog component from shadcn/ui
- Image aspect ratio will be 4:3 for gear cards
- Weight progress bar will show progress toward a configurable weight goal (default 4.5kg for ultralight)
- Mobile breakpoint follows existing Tailwind configuration (768px)
