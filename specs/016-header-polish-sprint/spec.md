# Feature Specification: Final Header Polish Sprint

**Feature Branch**: `016-header-polish-sprint`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Execute Final Header Polish Sprint: Remove Loadouts Title, Fix Logo Color, and Fix Avatar Fallback."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visible Logo on Header (Priority: P1)

As a user viewing any page in the application, I want to see the logo clearly in the header so I can recognize the brand and navigate home.

**Why this priority**: The logo is currently too dark against the deep green header background, making the brand invisible. This is a critical visual/branding issue affecting every page.

**Independent Test**: Navigate to any page and verify the logo is clearly visible (white) against the deep green header background.

**Acceptance Scenarios**:

1. **Given** I am on any page, **When** I view the header, **Then** the logo is clearly visible with white coloring against the green background
2. **Given** I am on the login page, **When** I view the header, **Then** the logo maintains visibility and brand recognition

---

### User Story 2 - Visible Avatar Fallback (Priority: P1)

As a user without a profile photo, I want to see my initials clearly displayed in the header avatar so I know I am logged in.

**Why this priority**: The avatar fallback (user initials) is invisible against the dark header, making it impossible for users without profile photos to identify their account status.

**Independent Test**: Log in as a user without a profile photo and verify initials are visible in the header avatar.

**Acceptance Scenarios**:

1. **Given** I am logged in without a profile photo, **When** I view the header avatar, **Then** I see my initials clearly displayed with sufficient contrast
2. **Given** I am logged in without a profile photo, **When** I view the header, **Then** the avatar fallback has a visible background that makes the initials pop

---

### User Story 3 - Clean Loadouts Page Layout (Priority: P2)

As a user navigating to the Loadouts page, I want the page to start directly with the actionable toolbar so I can quickly create or manage loadouts without scrolling past redundant header text.

**Why this priority**: The current "Loadouts" title and description paragraph are redundant with navigation context, wasting vertical space and delaying access to the toolbar.

**Independent Test**: Navigate to the Loadouts page and verify the toolbar is the first visible element (no H1 title or description paragraph).

**Acceptance Scenarios**:

1. **Given** I navigate to the Loadouts page, **When** the page loads, **Then** the toolbar is the first visible content element
2. **Given** I am on the Loadouts page, **When** I look for the page title, **Then** I do not see a redundant H1 "Loadouts" heading
3. **Given** I am on the Loadouts page, **When** I look for introductory text, **Then** I do not see a "Plan your trips..." paragraph

---

### Edge Cases

- What if the logo image fails to load? Ensure alt text is present for accessibility.
- What if a user has a very long name for avatar initials? Use only first 1-2 characters.
- What if the avatar fallback styling affects avatars elsewhere in the app? Scope changes appropriately.

## Requirements *(mandatory)*

### Functional Requirements

#### Logo Visibility

- **FR-001**: The header logo MUST be visible (white) against the deep green header background
- **FR-002**: Logo visibility MUST be achieved via styling, not by modifying the logo image file

#### Avatar Fallback Visibility

- **FR-003**: The avatar fallback (user initials) MUST have a visible background color
- **FR-004**: The avatar fallback text MUST have sufficient contrast to be readable
- **FR-005**: Avatar styling changes MUST be scoped to header context (or global if appropriate)

#### Loadouts Page Cleanup

- **FR-006**: The Loadouts page MUST NOT display an H1 title at the top
- **FR-007**: The Loadouts page MUST NOT display an introductory paragraph
- **FR-008**: The Loadouts page MUST start directly with the toolbar

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of users can see the logo clearly on all pages
- **SC-002**: Users without profile photos can identify their initials in the header avatar at first glance
- **SC-003**: The Loadouts page displays actionable content (toolbar) without scrolling on standard desktop viewports
- **SC-004**: All visual elements in the header pass WCAG AA contrast requirements (4.5:1 for normal text)

## Assumptions

- The logo file (`/public/logos/logo-small.png`) is a black transparent PNG that can be inverted via CSS filters
- The deep green header background color is approximately `#405A3D` or similar
- The avatar component uses shadcn/ui's Avatar pattern with AvatarFallback
- The Loadouts page currently has an H1 and paragraph that need removal
