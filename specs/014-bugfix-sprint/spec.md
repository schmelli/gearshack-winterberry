# Feature Specification: Final Polish & Bugfix Sprint

**Feature Branch**: `014-bugfix-sprint`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Final Polish & Bugfix Sprint - Fix login screen rotation and layout issues, gear editor tabs and validation, header icon visibility, and image search stub functionality."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stable Login Screen Experience (Priority: P1)

As a user visiting the login page, I want a calm, stable background image without rapid rotation or visual glitches, so I can focus on logging in without feeling dizzy or distracted.

**Why this priority**: The login screen is the first impression for users. A dizzying rotating background and visible white bars create a poor first impression and can trigger motion sensitivity issues.

**Independent Test**: Navigate to the login page and verify the background displays a single random nature image that covers the entire viewport with no rotation and no white bars on any screen size.

**Acceptance Scenarios**:

1. **Given** I navigate to the login page, **When** the page loads, **Then** ONE random background image is selected and displayed (no auto-rotation)
2. **Given** I am on the login page, **When** I wait for any duration, **Then** the background image remains static (does not change)
3. **Given** I view the login page on any screen size, **When** viewing the background, **Then** the image covers the entire viewport with no white bars or gaps on the sides
4. **Given** I refresh the login page, **When** it reloads, **Then** a new random image MAY be selected (acceptable randomization on page load)

---

### User Story 2 - Clear Gear Editor Validation Feedback (Priority: P1)

As a user editing gear items, I want clear visual feedback when form fields have errors, so I know exactly what needs to be fixed before saving.

**Why this priority**: Invisible validation errors frustrate users and prevent them from successfully saving gear items. This directly impacts core functionality.

**Independent Test**: Open the gear editor, clear the required Name field, click Save, and verify error messages appear with the required field indicator.

**Acceptance Scenarios**:

1. **Given** the gear editor is open, **When** I view required fields (Name), **Then** they display a red asterisk (*) indicating they are required
2. **Given** I have left required fields empty, **When** I click Save, **Then** validation errors appear as red text below the affected fields
3. **Given** there are validation errors, **When** I click Save, **Then** a toast notification appears saying "Please fix errors before saving"
4. **Given** I fix all validation errors, **When** I click Save, **Then** the form submits successfully

---

### User Story 3 - Reliable Image Upload in Gear Editor (Priority: P1)

As a user adding images to my gear items, I want the upload process to work reliably and show appropriate error messages if something goes wrong.

**Why this priority**: Image upload is a core feature. Users cannot properly document their gear if uploads silently fail.

**Independent Test**: Open gear editor, select an image file to upload, verify it uploads successfully and the URL is saved when the form is submitted.

**Acceptance Scenarios**:

1. **Given** I am in the gear editor media section, **When** I select an image file to upload, **Then** the file uploads to storage before the form is submitted
2. **Given** an image is uploading, **When** I click Save, **Then** the form waits for the upload to complete before submitting
3. **Given** an image upload fails, **When** the error occurs, **Then** an error toast appears with a helpful message
4. **Given** a pending image file exists, **When** I save the gear item, **Then** the image URL from storage is included in the saved data

---

### User Story 4 - Visible Header Icons on Dark Background (Priority: P1)

As a user viewing the application, I want all header icons (user avatar, bell, sync indicator) to be clearly visible against the Deep Forest Green header background.

**Why this priority**: Icons that are invisible or hard to see make the app feel broken and reduce usability. This is a visual regression from the brand color update.

**Independent Test**: Load any page and verify all header icons (bell, sync cloud, user avatar) are white and clearly visible.

**Acceptance Scenarios**:

1. **Given** I am on any page of the app, **When** I view the header, **Then** the notification bell icon is white/visible
2. **Given** I am logged in, **When** I view the header, **Then** the sync indicator icon is white/visible
3. **Given** I am logged in, **When** I view the header, **Then** the user menu avatar/icon is white/visible
4. **Given** any icon in the header, **When** I hover over it, **Then** the hover state maintains visibility

---

### User Story 5 - Polished Gear Editor Tab Design (Priority: P2)

As a user editing gear items, I want the tab navigation to look modern and polished with a pill-style design.

**Why this priority**: Visual polish improves perceived quality but is not a functional blocker.

**Independent Test**: Open the gear editor and verify tabs display with rounded pill styling and muted background.

**Acceptance Scenarios**:

1. **Given** the gear editor is open, **When** I view the tab navigation, **Then** it displays with pill-style appearance (rounded-full, muted background)
2. **Given** I click on different tabs, **When** switching tabs, **Then** the active state is clearly visible with proper styling

---

### User Story 6 - Image Search Placeholder Interaction (Priority: P3)

As a user in the gear editor, I want to know that image search functionality is planned, so I understand the button exists for future functionality.

**Why this priority**: This is a UX improvement for feature discovery, not core functionality.

**Independent Test**: Click the search icon in the media section and verify a popover appears explaining the feature is coming.

**Acceptance Scenarios**:

1. **Given** I am in the gear editor media section, **When** I click the image search icon, **Then** a popover appears with "Image Search coming in V2" message
2. **Given** the popover is displayed, **When** I click outside it or press Escape, **Then** the popover closes

---

### Edge Cases

- What if the background image fails to load on login? Show a solid Deep Forest Green fallback color.
- What if image upload times out? Show timeout error message and allow retry.
- What if the user has JavaScript disabled? Graceful degradation with server-rendered form.
- What if the Name field contains only whitespace? Treat as empty/invalid.

## Requirements *(mandatory)*

### Functional Requirements

#### Login Screen Fixes

- **FR-001**: Login page MUST select ONE random background image on mount and NOT rotate automatically
- **FR-002**: Login background container MUST use fixed positioning covering the entire viewport (inset-0, w-screen, h-screen)
- **FR-003**: Login background image MUST use object-cover to prevent white bars on any screen size
- **FR-004**: Login background container MUST have negative z-index (-z-10) to stay behind content

#### Gear Editor Validation

- **FR-005**: Required form fields MUST display a red asterisk (*) indicator
- **FR-006**: Form validation errors MUST display as red text below the affected field using FormMessage component
- **FR-007**: Save button MUST remain clickable even with validation errors
- **FR-008**: When Save is clicked with validation errors, system MUST show toast "Please fix errors before saving"
- **FR-009**: When Save is clicked with validation errors, system MUST trigger validation on all fields to display error messages

#### Image Upload

- **FR-010**: When Save is clicked, if a pending File exists in media section, system MUST await image upload BEFORE submitting to database
- **FR-011**: Failed image uploads MUST display an error toast with actionable message
- **FR-012**: Successful image uploads MUST store the Firebase Storage URL in the gear item data

#### Header Icons

- **FR-013**: All header icons (Bell, Sync, User) MUST have white/light colored styling visible on Deep Forest Green background
- **FR-014**: Header icon hover states MUST maintain visibility on the dark background

#### Gear Editor Tabs

- **FR-015**: TabsList component MUST use pill styling (bg-muted rounded-full p-1)
- **FR-016**: Active tab MUST be clearly distinguishable from inactive tabs

#### Image Search Stub

- **FR-017**: Image search icon in MediaSection MUST be clickable (not disabled)
- **FR-018**: Clicking image search icon MUST open a Popover with "Image Search coming in V2" message
- **FR-019**: Popover MUST close when clicking outside or pressing Escape

### Key Entities

- **BackgroundRotator**: Component that selects and displays login background images
- **GearEditorForm**: Main form component with tabbed sections and validation
- **MediaSection**: Section handling image upload with URL paste and file upload modes
- **SiteHeader**: Application header containing navigation and user controls

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Login page displays static background image with 0 rotation animations
- **SC-002**: 100% of login page visitors see full-bleed background with no visible gaps at any viewport size
- **SC-003**: All form validation errors are visible within 200ms of Save button click
- **SC-004**: Required field asterisks are visible on 100% of required fields
- **SC-005**: Image upload success rate improves (zero silent failures)
- **SC-006**: All 3 header icons (bell, sync, user) are visible with sufficient contrast ratio on dark green background
- **SC-007**: Tab navigation displays with updated pill styling matching design system

## Assumptions

- The existing BackgroundRotator component can be modified to remove rotation logic
- Firebase Storage upload functionality exists and works correctly
- shadcn/ui Popover component is installed or can be installed
- Form validation uses react-hook-form with Zod schema validation
- Toast notifications use Sonner or similar toast library
