# Feature Specification: Grand Polish Sprint ("Nano Banana")

**Feature Branch**: `007-grand-polish-sprint`
**Created**: 2025-12-05
**Status**: Draft
**Input**: Execute the "Nano Banana" Grand Polish Sprint to elevate UI/UX to premium standards with global layout centering, header/footer redesign, advanced weight calculations (worn/consumable tracking), universal card interactions, and page-specific polish.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Global Layout Centering (Priority: P1)

As a user browsing the application, I want content to be properly centered on wide screens so the interface feels balanced and professional rather than cramped against the left edge.

**Why this priority**: This is the most visible issue affecting every page. Users immediately notice when content hugs the left edge on large monitors, creating an unpolished first impression.

**Independent Test**: Open any page on a 1920px+ wide screen and verify content is horizontally centered with consistent padding.

**Acceptance Scenarios**:

1. **Given** the user opens the app on a wide screen (>1280px), **When** any page loads, **Then** the main content is centered with visible margins on both sides
2. **Given** the user resizes the browser to mobile width, **When** the viewport shrinks below breakpoint, **Then** content fills the available width with appropriate padding
3. **Given** the user navigates between pages, **When** transitioning from one page to another, **Then** the content container width remains consistent

---

### User Story 2 - Site Header Redesign (Priority: P1)

As a user navigating the app, I want a taller, more prominent header with larger branding and right-aligned navigation so the interface feels premium and spacious.

**Why this priority**: The header is visible on every page and sets the tone for the entire application. A cramped header creates a budget-app impression.

**Independent Test**: View the header on desktop and verify the logo is 2x larger, height is increased, and navigation links are on the right side.

**Acceptance Scenarios**:

1. **Given** the user views the header on desktop, **When** the page loads, **Then** the header height is visually taller (approximately 96px) with the logo and title displayed at 2x current size
2. **Given** the user views the navigation links, **When** looking at the header, **Then** navigation items (Inventory, Loadouts, Community) appear on the right side of the header
3. **Given** the logo PNG has a background, **When** the header renders, **Then** the logo blends seamlessly (either by matching header background to logo background or using transparent logo)
4. **Given** the user scrolls the page, **When** header remains sticky, **Then** the glassmorphism/blur effect continues to work if transparent backgrounds are used

---

### User Story 3 - Footer Redesign (Priority: P2)

As a user scrolling to the bottom of any page, I want a professional 4-column footer with organized links so the application feels complete and trustworthy.

**Why this priority**: The footer provides closure to pages and houses important links. A minimal footer suggests an incomplete product.

**Independent Test**: Scroll to the bottom of any page and verify a 4-column footer appears with Logo/About, Features, Resources, and Connect sections.

**Acceptance Scenarios**:

1. **Given** the user scrolls to the page bottom, **When** the footer comes into view, **Then** a dark "stone" colored background with 4 distinct columns is displayed
2. **Given** the footer is visible, **When** examining the columns, **Then** they contain: Logo/About (brand summary), Features (app features), Resources (help links), Connect (social/contact)
3. **Given** the user views on mobile, **When** the viewport is narrow, **Then** columns stack vertically in a readable layout

---

### User Story 4 - Advanced Weight Calculations (Priority: P1)

As a backpacker building a loadout, I want to track which items are worn on my body and which are consumables so I can see my true "Base Weight" (the weight I carry on my back minus worn items and consumables).

**Why this priority**: Base Weight is the standard metric in the ultralight backpacking community. Without this distinction, the app's weight calculations are too simplistic for serious outdoor users.

**Independent Test**: Add items to a loadout, mark some as worn and others as consumable, and verify both Total Weight and Base Weight are displayed correctly.

**Acceptance Scenarios**:

1. **Given** the user has items in a loadout, **When** viewing the loadout summary, **Then** both "Total Weight" (all items) and "Base Weight" (Total minus worn minus consumables) are displayed
2. **Given** an item in the loadout list, **When** the user clicks a "worn" toggle (shirt icon), **Then** the item is marked as worn and Base Weight recalculates immediately
3. **Given** an item in the loadout list, **When** the user clicks a "consumable" toggle (apple/food icon), **Then** the item is marked as consumable and Base Weight recalculates immediately
4. **Given** an item marked as both worn and consumable, **When** viewing weights, **Then** the item is excluded from Base Weight (only counted once in exclusion)

---

### User Story 5 - Loadout Metadata Editing (Priority: P2)

As a user managing loadouts, I want to edit a loadout's name, description, season, and trip date after creation so I can keep my loadouts organized and up-to-date.

**Why this priority**: Users frequently need to update loadout details as trip plans change. Currently there's no easy way to edit metadata.

**Independent Test**: Open a loadout, click an edit button next to the title, modify the fields in a dialog, and verify changes persist.

**Acceptance Scenarios**:

1. **Given** the user is viewing a loadout, **When** they click the edit icon (pencil) next to the loadout title, **Then** a modal/sheet opens with editable fields for name, description, season, and trip date
2. **Given** the edit modal is open, **When** the user modifies fields and saves, **Then** changes are persisted and reflected immediately in the header
3. **Given** the edit modal is open, **When** the user cancels without saving, **Then** no changes are made to the loadout

---

### User Story 6 - Universal Card Interactions (Priority: P2)

As a user browsing gear items anywhere in the app, I want clicking on a gear card to always open a detail view so I can quickly inspect item details regardless of context (Inventory, Loadout Picker, or Loadout List).

**Why this priority**: Consistent interaction patterns reduce cognitive load. Users expect cards to behave the same way everywhere.

**Independent Test**: Click on a gear card in the Inventory page, in the Loadout Picker, and in the Loadout List - all three should open the detail modal.

**Acceptance Scenarios**:

1. **Given** the user is on the Inventory page, **When** they click anywhere on a gear card body, **Then** the GearDetailDialog opens showing full item details
2. **Given** the user is in the Loadout Picker, **When** they click on a gear card body (not the Add button), **Then** the GearDetailDialog opens
3. **Given** the user is viewing items in a Loadout List, **When** they click on a gear card body, **Then** the GearDetailDialog opens
4. **Given** the GearDetailDialog is open, **When** looking at the dialog header, **Then** an edit icon (pencil) is present to navigate to edit mode

---

### User Story 7 - Smooth Animations (Priority: P3)

As a user interacting with modals and drawers, I want smooth entrance and exit animations so the app feels polished and responsive.

**Why this priority**: Animations add perceived polish but don't affect core functionality. Good to have but lower priority.

**Independent Test**: Open and close any Dialog or Sheet and observe smooth fade/slide animations.

**Acceptance Scenarios**:

1. **Given** the user triggers a Dialog to open, **When** the dialog appears, **Then** it animates in with a smooth fade and/or scale effect
2. **Given** the user closes a Dialog, **When** the dialog dismisses, **Then** it animates out smoothly rather than disappearing instantly
3. **Given** the user opens a bottom Sheet on mobile, **When** the sheet appears, **Then** it slides up smoothly from the bottom

---

### User Story 8 - Loadouts Dashboard Search (Priority: P2)

As a user with many loadouts, I want to search and filter my loadouts by name and season so I can quickly find the loadout I need.

**Why this priority**: As users accumulate loadouts, finding specific ones becomes tedious. Search improves usability at scale.

**Independent Test**: Navigate to /loadouts, use the search bar to filter by name, and use season filters to narrow results.

**Acceptance Scenarios**:

1. **Given** the user is on the Loadouts dashboard, **When** the page loads, **Then** a search/filter toolbar is displayed (no generic "Loadouts" title)
2. **Given** multiple loadouts exist, **When** the user types in the search field, **Then** loadouts are filtered in real-time by name match
3. **Given** multiple loadouts with different seasons, **When** the user selects a season filter, **Then** only loadouts matching that season are displayed

---

### User Story 9 - Loadout Editor Polish (Priority: P3)

As a user editing a loadout with many items, I want category headings to stay visible while scrolling and add buttons to provide micro-feedback so the editing experience feels responsive.

**Why this priority**: These are refinements that enhance the editing experience but aren't blocking core functionality.

**Independent Test**: Scroll through a loadout with multiple categories and verify headers stay sticky. Click Add buttons and observe brief visual feedback.

**Acceptance Scenarios**:

1. **Given** a loadout has multiple categories with many items, **When** the user scrolls within the list, **Then** category headings stick to the top of the scroll area until the next category is reached
2. **Given** the user is in the loadout picker, **When** they click the "+" Add button, **Then** the button displays brief visual feedback (e.g., turns green for 200ms or shows a checkmark flash)

---

### Edge Cases

- What happens when a loadout has zero items? The weight displays should show "0g" for both Total and Base Weight.
- What happens when all items are marked as worn? Base Weight should be 0g (all weight is on body, not in pack).
- What happens when search returns no results on Loadouts dashboard? Display an empty state message.
- What happens if the logo PNG has neither transparent nor white background? Fall back to placing logo on a solid background color that complements the theme.

## Requirements *(mandatory)*

### Functional Requirements

**Global Layout**
- **FR-001**: System MUST wrap all page content in a centered container with maximum width of 1280px (7xl) and horizontal padding
- **FR-002**: System MUST maintain consistent content width across all pages

**Site Header**
- **FR-003**: Site header MUST display at minimum height of 96px (h-24 in Tailwind)
- **FR-004**: Logo and brand title MUST be displayed at 2x current size (logo ~80px, title ~2.5xl or larger)
- **FR-005**: Navigation links MUST be positioned on the right side of the header using auto margin
- **FR-006**: Logo MUST blend seamlessly with header background (either by using white background to match logo, or using transparent logo with glassmorphism effect)

**Site Footer**
- **FR-007**: Footer MUST display a 4-column layout with sections: Logo/About, Features, Resources, Connect
- **FR-008**: Footer MUST use a dark stone-colored background
- **FR-009**: Footer columns MUST stack on mobile viewports

**Weight Calculations**
- **FR-010**: Each loadout item MUST have an `isWorn` boolean flag (default: false)
- **FR-011**: Each loadout item MUST have an `isConsumable` boolean flag (default: false)
- **FR-012**: System MUST calculate Total Weight as sum of all item weights
- **FR-013**: System MUST calculate Base Weight as Total Weight minus (Worn items weight + Consumable items weight)
- **FR-014**: Both Total Weight and Base Weight MUST be displayed in the Loadout Header summary
- **FR-015**: Weight values MUST update immediately when worn/consumable toggles change

**Loadout Metadata**
- **FR-016**: System MUST display an edit icon (pencil) next to the loadout title
- **FR-017**: Clicking the edit icon MUST open a Sheet/Dialog with fields for: Name, Description, Season, Trip Date
- **FR-018**: System MUST persist metadata changes and update the display immediately

**Card Interactions**
- **FR-019**: Clicking anywhere on a gear card body (Inventory, Picker, or Loadout List) MUST open the GearDetailDialog
- **FR-020**: The GearDetailDialog header MUST contain an edit icon (pencil) for navigation to edit mode
- **FR-021**: Add/Remove buttons on cards MUST NOT trigger the detail dialog (use event.stopPropagation)

**Animations**
- **FR-022**: All Dialogs MUST animate with smooth entrance (fade in + optional scale)
- **FR-023**: All Dialogs MUST animate with smooth exit (fade out)
- **FR-024**: All Sheets MUST animate with smooth slide entrance/exit

**Loadout Item Actions**
- **FR-025**: Items in the Loadout List MUST display a "Worn" toggle with a shirt/clothing icon
- **FR-026**: Items in the Loadout List MUST display a "Consumable" toggle with a food/apple icon
- **FR-027**: Toggle state changes MUST persist with the loadout data

**Loadouts Dashboard**
- **FR-028**: Loadouts dashboard MUST NOT display a generic "Loadouts" title
- **FR-029**: Loadouts dashboard MUST display a search/filter toolbar
- **FR-030**: Search MUST filter loadouts by name in real-time
- **FR-031**: System MUST support filtering loadouts by season

**Loadout Editor Polish**
- **FR-032**: Category headings in scrollable lists MUST be sticky during scroll
- **FR-033**: Add button in picker MUST display micro-interaction feedback (e.g., brief color change or animation)

### Key Entities

- **LoadoutItemState** (NEW): Per-item state within a loadout containing `itemId`, `isWorn` (boolean), and `isConsumable` (boolean) flags
- **Loadout** (EXTENDED): Add `description: string | null` and `itemStates: LoadoutItemState[]` fields
- **WeightSummary** (NEW): Computed values for totalWeight, baseWeight, wornWeight, consumableWeight

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All pages display content centered with consistent margins on viewports 1280px and wider
- **SC-002**: Site header displays at increased height with 2x larger logo and right-aligned navigation on all pages
- **SC-003**: Footer displays 4-column layout on desktop, stacked layout on mobile, across all pages
- **SC-004**: Users can mark any loadout item as worn or consumable with a single click/tap
- **SC-005**: Both Total Weight and Base Weight are visible simultaneously in loadout summary
- **SC-006**: Base Weight calculation is accurate: Total - Worn - Consumables
- **SC-007**: Clicking any gear card (regardless of location) opens the detail dialog within 300ms
- **SC-008**: Dialog/Sheet animations complete within 200-300ms and feel smooth
- **SC-009**: Users can search/filter loadouts by name with results updating within 100ms of keystroke
- **SC-010**: Category headers remain visible during scroll in loadout editor

## Assumptions

- The existing logo PNG has either a transparent background or a white background. If neither, a design decision will be made during implementation.
- "Stone" color for footer refers to a dark gray/slate color (e.g., zinc-900 or slate-900 in Tailwind).
- The 4-column footer structure follows a standard pattern (About, Features, Resources, Connect) but placeholder text is acceptable for initial implementation.
- Animation library choice (CSS transitions vs framer-motion) is an implementation detail left to the developer.
- "2x larger" for logo means approximately doubling the current dimensions (from ~40px to ~80px).
- Season values for filtering reuse the existing Season type from the loadout system.
