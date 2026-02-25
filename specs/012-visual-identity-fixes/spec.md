# Feature Specification: Visual Identity Overhaul & Data Fixes

**Feature Branch**: `012-visual-identity-fixes`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Visual Identity Overhaul & Data Fixes - Update brand colors to Deep Forest Green (#405A3D) and Pale Mist background (#FCFDF7), enhance header/footer styling, improve GearCard density sizing, polish modals/dialogs, and fix Untitled Item bug in legacy data adapter."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Brand Identity (Priority: P1)

As a user of Gearshack, I want the application to have a cohesive, professional visual identity with the brand's Deep Forest Green color scheme, so the experience feels polished and trustworthy.

**Why this priority**: Visual identity is the first impression. The current pastel header is inconsistent with the brand vision. A cohesive color scheme builds trust and brand recognition.

**Independent Test**: Load any page in the application. Verify header and footer display Deep Forest Green (#405A3D) background with white text. Verify main app background is Pale Mist (#FCFDF7).

**Acceptance Scenarios**:

1. **Given** I load the application, **When** I view the header, **Then** it displays a solid Deep Forest Green background (#405A3D) with white text and icons
2. **Given** I load the application, **When** I view the footer, **Then** it matches the header styling (Deep Forest Green background, white text)
3. **Given** I load any page, **When** I view the main content area, **Then** the background is Pale Mist (#FCFDF7)
4. **Given** I view the header, **When** I look at the logo, **Then** "Gearshack" appears in Rock Salt font, white color, at large size (text-3xl)
5. **Given** I view the header navigation, **When** I look at nav items, **Then** they are displayed in larger, bold font with clear active page indication

---

### User Story 2 - Accurate Gear Item Names (Priority: P1)

As a user with existing gear in the database, I want to see my actual gear names instead of "Untitled Item", so I can identify and manage my equipment correctly.

**Why this priority**: Users seeing incorrect data ("Untitled Item") undermines trust and makes the app unusable. This is a critical data integrity fix.

**Independent Test**: Log in with an account that has legacy gear data. Verify all gear items show their actual names from the database. Check console for debug output showing raw legacy document structure.

**Acceptance Scenarios**:

1. **Given** a gear item has `name: "Osprey Atmos 65"` in the database, **When** displayed in inventory, **Then** it shows "Osprey Atmos 65"
2. **Given** a gear item has `title: "My Tent"` instead of `name`, **When** displayed, **Then** it shows "My Tent"
3. **Given** a gear item has `productName: "UltraLite Stove"`, **When** displayed, **Then** it shows "UltraLite Stove"
4. **Given** a gear item has `brand: "Black Diamond"` but no name field, **When** displayed, **Then** it shows "Black Diamond Item"
5. **Given** a gear item has `model: "Spot" and brand: "Black Diamond"`, **When** displayed, **Then** it shows "Black Diamond Spot"
6. **Given** a gear item has no identifiable name or brand, **When** displayed, **Then** it shows "Unnamed Gear" with a console warning

---

### User Story 3 - Responsive Gear Card Sizing (Priority: P2)

As a user browsing my gear inventory, I want card sizes to visually change based on the selected density (compact/standard/detailed), so I can choose the view that best suits my browsing needs.

**Why this priority**: The density toggle exists but doesn't visibly change card sizes, confusing users. This improves usability and makes the feature actually work.

**Independent Test**: Open the inventory gallery. Toggle between compact, standard, and detailed views. Verify card dimensions and image sizes change noticeably.

**Acceptance Scenarios**:

1. **Given** I select "Compact" density, **When** viewing gear cards, **Then** cards are small with small thumbnails (approx. h-32) using object-contain
2. **Given** I select "Standard" density, **When** viewing gear cards, **Then** cards are medium-sized with square images (aspect-square)
3. **Given** I select "Detailed" density, **When** viewing gear cards, **Then** cards are large with prominent images and full description text visible
4. **Given** I switch between densities, **When** the view updates, **Then** the change is immediate and visually obvious

---

### User Story 4 - Polished Modal Experience (Priority: P2)

As a user editing gear or loadouts, I want modals to have a proper backdrop overlay and consistent styling, so the interface feels professional and focused.

**Why this priority**: Modals without proper backdrop feel "lost" and unprofessional. Consistent modal styling improves perceived quality.

**Independent Test**: Open the Edit Gear modal. Verify it has a dark semi-transparent backdrop with blur. Open Edit Loadout and verify it appears as a centered Dialog (not Sheet).

**Acceptance Scenarios**:

1. **Given** I open the Edit Gear modal, **When** viewing the overlay, **Then** the backdrop shows with 60% black opacity and blur effect
2. **Given** I open the Edit Loadout modal, **When** viewing the interface, **Then** it appears as a centered Dialog (not a side Sheet)
3. **Given** the Edit Loadout Dialog is open, **When** viewing the form, **Then** it shows Name, Description, and Trip Date fields with clean white styling
4. **Given** the Edit Loadout Dialog is open, **When** selecting a season, **Then** I see visual icon cards instead of a dropdown menu
5. **Given** any modal is open, **When** I click the backdrop or press Escape, **Then** the modal closes

---

### Edge Cases

- What happens when a gear item has multiple potential name fields (name, title, productName)? → Use priority order, first non-empty wins
- What happens when database contains only `label` or `model` fields? → Check these fields in the fallback chain
- How does the system handle very long gear names in compact view? → Truncate with ellipsis
- What if Deep Forest Green text appears on Dark Mode? → Ensure proper contrast for both modes

## Requirements *(mandatory)*

### Functional Requirements

#### Brand Colors & Theme

- **FR-001**: App MUST use Deep Forest Green (#405A3D / rgb(64, 90, 61)) as the primary brand color
- **FR-002**: App MUST use Pale Mist (#FCFDF7 / rgb(252, 253, 247)) as the main background color
- **FR-003**: Header MUST display solid Deep Forest Green background with white text/icons
- **FR-004**: Footer MUST match header styling (Deep Forest Green background, white text)
- **FR-005**: Header logo MUST display "Gearshack" in Rock Salt font, white, at text-3xl size
- **FR-006**: Header navigation MUST use larger font (text-lg or text-xl), bold weight
- **FR-007**: Header navigation MUST show a visual indicator (underline or pill) for the active page
- **FR-008**: All text on Deep Forest Green background MUST be white for accessibility contrast

#### Gear Card Density

- **FR-009**: GearCard MUST support three density modes: compact, standard, detailed
- **FR-010**: Compact mode MUST display small card with small thumbnail (h-32, object-contain)
- **FR-011**: Standard mode MUST display medium card with square image (aspect-square)
- **FR-012**: Detailed mode MUST display large card with prominent image and full description

#### Modal/Dialog Polish

- **FR-013**: Edit Gear modal MUST display with dark overlay (bg-black/60) and backdrop blur (backdrop-blur-sm)
- **FR-014**: Edit Loadout MUST use Dialog component (centered modal), not Sheet (side panel)
- **FR-015**: Edit Loadout Dialog MUST display Name, Description, and Trip Date fields
- **FR-016**: Season selection in Edit Loadout MUST use visual icon cards instead of dropdown

#### Data Fix (Untitled Items)

- **FR-017**: Legacy data adapter MUST log raw document data for debugging (console.log with id and data)
- **FR-018**: Adapter MUST check name fields in order: name, title, productName, label, model (combined with brand)
- **FR-019**: If brand exists but name is missing, adapter MUST use "{brand} Item" as fallback
- **FR-020**: If brand and model both exist, adapter MUST use "{brand} {model}" as name
- **FR-021**: Final fallback for items with no identifiable name MUST be "Unnamed Gear"

### Key Entities

- **BrandColors**: Primary (Deep Forest Green), Background (Pale Mist), Text (white on green, dark on mist)
- **GearCardDensity**: Compact, Standard, Detailed - each with specific dimension and image settings
- **GearItem**: Extended name resolution from multiple legacy field sources

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All header and footer backgrounds display Deep Forest Green (#405A3D) consistently across all pages
- **SC-002**: Text on Deep Forest Green backgrounds passes WCAG AA contrast requirements (white text achieves 7.2:1 ratio)
- **SC-003**: 100% of gear items display actual names (zero "Untitled Item" entries for valid data)
- **SC-004**: Gear card size visibly changes when toggling between density modes (at least 50% size difference between compact and detailed)
- **SC-005**: All modals display with proper backdrop overlay within 100ms of opening
- **SC-006**: Users can identify the current active page in navigation at a glance (visual indicator visible)

## Assumptions

- Rock Salt font is already loaded and available in the application
- The Dialog component from shadcn/ui is already installed
- Legacy Firestore data uses snake_case field naming conventions
- Dark mode will maintain proper contrast with adjusted color values
