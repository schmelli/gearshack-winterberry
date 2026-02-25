# Feature Specification: GearCard Hierarchy & Polish Sprint

**Feature Branch**: `018-gearcard-hierarchy-polish`
**Created**: 2025-12-06
**Status**: Draft
**Input**: User description: "Card Hierarchy & Polish Sprint - Redesign card density views for clear visual hierarchy and premium feel"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compact View Redesign (Priority: P1)

A user browsing their inventory in compact view wants to quickly scan many items with essential information visible at a glance. The new horizontal layout shows brand, name, and weight in a space-efficient format that allows more items per row.

**Why this priority**: Compact view is used for quick scanning and is visually broken with the current mislabeled vertical layout. Fixing this establishes the foundation for the density hierarchy.

**Independent Test**: Can be fully tested by switching to compact view in the inventory gallery and verifying the horizontal layout displays correctly.

**Acceptance Scenarios**:

1. **Given** the user is viewing inventory in compact mode, **When** the page loads, **Then** each card displays in a horizontal layout with image on the left and text on the right.
2. **Given** a compact card is displayed, **When** the user views it, **Then** the image appears on a pure white background without the gray container.
3. **Given** a compact card is displayed, **When** the user views it, **Then** the card shows Brand (small text), Name (bold), and Weight (small text) in the text area.
4. **Given** multiple compact cards, **When** displayed in a grid, **Then** each card appears roughly twice as wide as it is high.

---

### User Story 2 - Standard View Swap (Priority: P1)

A user viewing inventory in standard mode wants a balanced view with a prominent image and key details. The new standard view (formerly "detailed") shows a large square image with brand, name, category, weight, and status badge.

**Why this priority**: Standard is the default view mode and must present items clearly with the most common information visible.

**Independent Test**: Can be fully tested by switching to standard view and verifying the vertical layout with square image and complete metadata.

**Acceptance Scenarios**:

1. **Given** the user is viewing inventory in standard mode, **When** the page loads, **Then** each card displays in a vertical layout with a large square image.
2. **Given** a standard card is displayed, **When** the user views it, **Then** the card shows Brand, Name, Category, Weight, and Status Badge.
3. **Given** a standard card with no category or weight, **When** displayed, **Then** the layout adjusts gracefully without empty gaps.

---

### User Story 3 - Detailed View Swap (Priority: P2)

A user wanting maximum information per item uses detailed view to see everything including the description snippet. The new detailed view (formerly "standard") shows an extra-large image area with all standard information plus the description.

**Why this priority**: Detailed view is for power users who want all information visible; fewer users need this level of detail.

**Independent Test**: Can be fully tested by switching to detailed view and verifying extra-large image and description snippet visibility.

**Acceptance Scenarios**:

1. **Given** the user is viewing inventory in detailed mode, **When** the page loads, **Then** each card displays with an extra-large image area (4:3 aspect ratio).
2. **Given** a detailed card is displayed, **When** the user views it, **Then** the card shows all standard view information PLUS a description snippet.
3. **Given** a detailed card with no description, **When** displayed, **Then** the card still looks complete without placeholder text.

---

### User Story 4 - Visual Polish (Priority: P2)

A user viewing the inventory gallery notices that cards have a polished, premium appearance with subtle shadows and defined borders that provide depth against the pale mist background.

**Why this priority**: Visual polish is enhancement that improves perceived quality but doesn't change functionality.

**Independent Test**: Can be fully tested by viewing any density mode and verifying shadow and border styling.

**Acceptance Scenarios**:

1. **Given** cards are displayed in any view mode, **When** the user views them, **Then** each card has a subtle drop shadow providing depth.
2. **Given** cards are displayed in any view mode, **When** the user views them, **Then** each card has a stone-colored border for definition.
3. **Given** cards are displayed, **When** the user hovers over a card, **Then** the shadow effect increases slightly for interactive feedback.

---

### Edge Cases

- What happens when a compact card has no brand? The name should be displayed prominently without extra spacing.
- What happens when an image fails to load? The category placeholder should display with correct sizing for each density.
- What happens on very narrow screens? Compact cards should stack vertically on mobile while maintaining the horizontal internal layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Compact view MUST display cards in horizontal layout with image on left and text on right
- **FR-002**: Compact view image MUST be displayed on a pure white background without gray container
- **FR-003**: Compact view MUST show only Brand, Name, and Weight (no category or status)
- **FR-004**: Compact card aspect ratio MUST be approximately 2:1 (twice as wide as high)
- **FR-005**: Standard view MUST display what was previously the detailed layout (large square image)
- **FR-006**: Standard view MUST show Brand, Name, Category, Weight, and Status Badge
- **FR-007**: Detailed view MUST display what was previously the standard layout (extra-large image area)
- **FR-008**: Detailed view MUST show all Standard view information PLUS description snippet
- **FR-009**: All card variants MUST have a subtle drop shadow for depth
- **FR-010**: All card variants MUST maintain stone-colored border for definition
- **FR-011**: Card hover state MUST show enhanced shadow effect

### Key Entities

- **GearCard**: Display component with three density variants (compact, standard, detailed)
- **ViewDensity**: Type defining the three view modes and their visual characteristics

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can distinguish between compact, standard, and detailed views within 2 seconds of switching
- **SC-002**: Compact view displays 50% more items visible on screen compared to standard view
- **SC-003**: All three view modes render correctly with no layout breaks on screens 320px to 1920px wide
- **SC-004**: Card shadow and border styling is visually consistent across all density modes
- **SC-005**: Image placeholders display correctly when no image is available for all density modes

## Assumptions

- The existing `density` prop correctly passes the selected view mode to GearCard
- The current card container (Card component) supports shadow and border customization
- Pure white background for compact images can be achieved with standard styling
- The aspect ratio component is available for consistent image sizing in vertical layouts
- Mobile responsive behavior maintains horizontal compact layout even on narrow screens
