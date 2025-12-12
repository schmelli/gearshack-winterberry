# Feature Specification: Grand Visual Polish Sprint

**Feature Branch**: `009-grand-visual-polish`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Execute Grand Visual Polish Sprint - Overhaul Layout, Header, Typography, and Loadout UX with Nature Vibe alignment"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Professional Typography Throughout App (Priority: P1)

As a user browsing the application, I want all page headings to use a clean, professional sans-serif font so the interface looks polished and readable, with the decorative "Rock Salt" font reserved exclusively for brand identity (the Gearshack logo).

**Why this priority**: Typography is the most visible and pervasive visual element. Inconsistent or overused decorative fonts make the app look unprofessional across every page.

**Independent Test**: Navigate to any page (Inventory, Loadouts, Settings) and verify all H1/H2 headings use the standard sans-serif font, while only the header logo uses Rock Salt.

**Acceptance Scenarios**:

1. **Given** I am on the Inventory page, **When** I view the page heading, **Then** it displays in sans-serif font (Geist/Inter), not Rock Salt
2. **Given** I am on the Loadouts page, **When** I view any section headings, **Then** they use sans-serif font
3. **Given** I am viewing the site header, **When** I look at the "Gearshack" brand text, **Then** it uses the Rock Salt font
4. **Given** I am on any page with H1 or H2 elements, **When** I inspect the typography, **Then** none use Rock Salt except the logo

---

### User Story 2 - Redesigned Site Header (Priority: P1)

As a user viewing any page, I want the site header to have a distinct, nature-inspired appearance with proper spacing so it clearly separates navigation from content and reinforces the brand identity.

**Why this priority**: The header appears on every page and sets the visual tone for the entire application. A well-designed header immediately improves perceived quality.

**Independent Test**: Load any page and verify the header has a light pastel green background, proper vertical alignment of logo and navigation, and appropriate height.

**Acceptance Scenarios**:

1. **Given** I am on any page, **When** I view the header, **Then** it displays a light pastel green background (emerald-50 tone with slight transparency)
2. **Given** I am on any page, **When** I observe the header, **Then** the logo and navigation items are vertically centered and aligned
3. **Given** I am viewing on desktop, **When** I look at the header height, **Then** it provides comfortable spacing around the logo and nav items
4. **Given** I resize the window, **When** the header responds, **Then** it maintains proper alignment and appearance

---

### User Story 3 - Loadout Editor Column Layout (Priority: P1)

As a user editing a loadout, I want the Inventory Picker on the left and my Loadout Items on the right (with sticky positioning) so I can intuitively drag items from my inventory into my pack while keeping the pack list always visible.

**Why this priority**: The loadout editor is a core workflow. The current layout (loadout left, inventory right) contradicts natural left-to-right flow and causes usability friction.

**Independent Test**: Open any loadout for editing, scroll through the inventory on the left, and verify the loadout list on the right stays visible (sticky).

**Acceptance Scenarios**:

1. **Given** I am editing a loadout on desktop, **When** I view the two-column layout, **Then** the Inventory Picker appears in the left column
2. **Given** I am editing a loadout on desktop, **When** I view the two-column layout, **Then** my Loadout Items list appears in the right column
3. **Given** I scroll down through a long inventory list, **When** I check the right column, **Then** the Loadout Items list remains fixed/sticky on screen
4. **Given** I am editing a loadout on mobile, **When** I view the layout, **Then** columns stack vertically (inventory above, loadout below)

---

### User Story 4 - Loadout Header with Inline Editing (Priority: P2)

As a user viewing a loadout, I want to see the loadout title prominently displayed with the description positioned efficiently, and be able to edit details inline without opening a modal.

**Why this priority**: Improves information hierarchy and reduces interaction friction for common editing tasks.

**Independent Test**: View a loadout, observe title and description placement, click to edit description inline without modal appearing.

**Acceptance Scenarios**:

1. **Given** I am viewing a loadout, **When** I observe the header area, **Then** the loadout title (H1) is bold, clear, and uses sans-serif font
2. **Given** I am viewing a loadout, **When** I observe the header layout, **Then** the description text appears on the right side utilizing available whitespace
3. **Given** I click on the description area or an "Edit Details" button, **When** the edit mode activates, **Then** I can edit inline (expandable textarea or in-place edit) without a modal
4. **Given** I finish editing inline, **When** I click away or save, **Then** changes persist without page reload

---

### User Story 5 - Activity Matrix Visualization (Priority: P2)

As a user selecting an activity type for my loadout, I want to see a visual breakdown of that activity's priorities (Weight, Comfort, Durability, Safety) so I can understand how different activities influence gear selection.

**Why this priority**: Provides educational context and helps users make informed decisions about activity selection.

**Independent Test**: While editing a loadout, select different activities and verify progress bars update to show the activity's focus areas.

**Acceptance Scenarios**:

1. **Given** I am editing a loadout's activity type, **When** I view the activity selector, **Then** I see a visual matrix with 4 progress bars: Weight, Comfort, Durability, Safety
2. **Given** I select "Ultralight Hiking", **When** I view the matrix, **Then** Weight shows high priority, Comfort shows low priority
3. **Given** I select "Car Camping", **When** I view the matrix, **Then** Weight shows low priority, Comfort shows high priority
4. **Given** I change activity selection, **When** the matrix updates, **Then** values transition smoothly to reflect the new activity

---

### User Story 6 - Full-Width Footer (Priority: P2)

As a user viewing any page, I want the footer to span the full screen width with appropriate sizing so it provides proper visual closure to the page.

**Why this priority**: Footer inconsistency breaks the visual frame of the application and appears unfinished.

**Independent Test**: Scroll to any page footer and verify the dark green background spans edge-to-edge while content respects container width.

**Acceptance Scenarios**:

1. **Given** I am on any page, **When** I scroll to the footer, **Then** the footer background (emerald-900) spans full screen width
2. **Given** I am viewing the footer, **When** I check the content area, **Then** footer content respects the max-w-7xl container constraint
3. **Given** I compare footer to previous version, **When** I observe vertical padding, **Then** it is reduced to appropriate size (not excessively tall)

---

### User Story 7 - Component Overlap Fixes (Priority: P2)

As a user viewing gear details in a modal, I want action buttons properly positioned without overlapping so I can interact with the interface without confusion.

**Why this priority**: Overlapping UI elements create confusion and potentially block interactions.

**Independent Test**: Open a gear detail modal and verify the Edit pencil icon does not overlap with the Close (X) icon.

**Acceptance Scenarios**:

1. **Given** I open a gear detail view/modal, **When** I observe the header area, **Then** the Edit icon and Close icon are clearly separated
2. **Given** I open a gear detail modal, **When** I try to close it, **Then** the close button is easily accessible without accidental edit clicks
3. **Given** I view a GearCard in inventory, **When** the card has an uploaded image, **Then** the image displays correctly in the card preview

---

### Edge Cases

- What happens when a loadout has no description? Display placeholder text or empty state gracefully
- What happens when activity matrix data is unavailable? Display default/neutral values
- How does the header appear on very narrow screens? Logo should remain visible, nav collapses to mobile menu
- What happens when footer content overflows on small screens? Content should wrap appropriately

## Requirements *(mandatory)*

### Functional Requirements

**Typography**
- **FR-001**: System MUST apply Rock Salt font ONLY to the "Gearshack" logo text in the site header
- **FR-002**: System MUST apply sans-serif font (Geist/Inter) to all H1 and H2 headings throughout the application
- **FR-003**: All page content MUST be centered within a max-w-7xl container with horizontal auto margins

**Header**
- **FR-004**: Site header MUST display a light pastel green background (emerald-50 with 90% opacity)
- **FR-005**: Site header MUST maintain vertical centering of logo and navigation elements
- **FR-006**: Header height MUST be minimum 96px (h-24 in Tailwind) to provide adequate spacing around logo and navigation
- **FR-007**: Header background MUST span full viewport width while content respects container width

**Loadout Editor Layout**
- **FR-008**: Loadout editor MUST display Inventory Picker in the LEFT column on desktop
- **FR-009**: Loadout editor MUST display Loadout Items list in the RIGHT column on desktop
- **FR-010**: Loadout Items column (right) MUST use sticky positioning (top offset accounting for header)
- **FR-011**: Loadout editor MUST stack columns vertically on mobile viewports (inventory above loadout)

**Loadout Header & Details**
- **FR-012**: Loadout title MUST display as bold sans-serif H1
- **FR-013**: Loadout description MUST be positioned in the right area of the header section
- **FR-014**: Description editing MUST be inline using a hybrid expandable pattern: description visible in header, click expands inline textarea with save/cancel actions (no modal)
- **FR-015**: System MUST display an Activity Matrix with 4 progress bars when editing activity type

**Activity Matrix**
- **FR-016**: Activity Matrix MUST show progress bars for: Weight, Comfort, Durability, Safety
- **FR-017**: Each activity type MUST have predefined priority values for the 4 matrix dimensions
- **FR-018**: Matrix values MUST update visually when activity selection changes

**Footer**
- **FR-019**: Footer background (emerald-900) MUST span full viewport width
- **FR-020**: Footer content MUST respect max-w-7xl container constraint
- **FR-021**: Footer vertical padding MUST be reduced from py-12 to py-8 (48px to 32px)

**Component Fixes**
- **FR-022**: Gear detail modal/view MUST separate Edit icon from Close icon (no overlap)
- **FR-023**: Edit icon SHOULD be positioned to the left of the title or in a distinct action row
- **FR-024**: GearCard component MUST display uploaded images when available

**Responsive Behavior**
- **FR-025**: All layout changes MUST maintain responsive behavior (mobile-first stacking)
- **FR-026**: Header MUST collapse navigation appropriately on mobile

### Key Entities

- **Activity Matrix Config**: Predefined values mapping activity types to priority scores (0-100) for Weight, Comfort, Durability, Safety dimensions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of H1/H2 headings use sans-serif font; only logo uses Rock Salt
- **SC-002**: Header visually distinct with pastel green background on all pages
- **SC-003**: Loadout editor shows inventory on left, loadout on right (verified on desktop viewport)
- **SC-004**: Users can scroll full inventory list while loadout panel remains visible (sticky)
- **SC-005**: Users can edit loadout description inline without modal interaction
- **SC-006**: Activity selection displays 4-bar matrix with differentiated values per activity type
- **SC-007**: Footer background spans full width on all pages
- **SC-008**: No UI element overlap in gear detail modal (Edit and Close buttons clearly separated)
- **SC-009**: All changes maintain responsive behavior across mobile, tablet, and desktop viewports

## Assumptions

- Rock Salt font is already loaded and available via CSS variable
- The application uses Tailwind CSS for styling
- shadcn/ui components are available and can be styled via className overrides
- Activity types are already defined in the system (Hiking, Car Camping, etc.)
- The loadout editor page exists at `/app/loadouts/[id]/page.tsx`
- Header and Footer components exist as reusable layout components
