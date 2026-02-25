# Feature Specification: Login Repair & Layout Architecture Sprint

**Feature Branch**: `023-login-layout-repair`
**Created**: 2025-12-06
**Status**: Draft
**Input**: User description: "Fix Login page layout (shows unwanted header/footer), fix button interaction (blocked by z-index), fix background (black screen on timeout)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Click Login/Register Buttons Successfully (Priority: P1)

As a user on the login page, I want to be able to click the login and register buttons, so that I can access my account or create a new one.

**Why this priority**: This is a critical blocking bug. Users cannot authenticate at all if buttons are non-functional. This completely blocks application access.

**Independent Test**: Navigate to /login, click the login button with valid credentials or click register - verify the button responds and the action is triggered.

**Acceptance Scenarios**:

1. **Given** a user is on the login page, **When** they click the "Sign In" button, **Then** the login form submission is triggered (console confirms click registered)
2. **Given** a user is on the login page, **When** they click the "Register" link, **Then** the registration view is displayed
3. **Given** a user is on the login page, **When** they click the Google Sign-In button, **Then** the OAuth flow begins
4. **Given** any overlay or background element exists, **When** user clicks form elements, **Then** clicks are not blocked by lower z-index elements

---

### User Story 2 - View Immersive Login Page Without Header/Footer (Priority: P1)

As a user visiting the login page, I want to see only the login card with a full-screen background (no site header or footer), so that I have a focused, immersive authentication experience.

**Why this priority**: The header/footer on the login page breaks the intended design and may contribute to visual clutter. This is a core design requirement for the authentication flow.

**Independent Test**: Navigate to /login and verify that the SiteHeader and SiteFooter are not visible, only the glassmorphism login card over the background.

**Acceptance Scenarios**:

1. **Given** a user navigates to /login, **When** the page loads, **Then** the SiteHeader is not visible
2. **Given** a user navigates to /login, **When** the page loads, **Then** the SiteFooter is not visible
3. **Given** a user navigates to /login, **When** the page loads, **Then** only the background and login card are displayed
4. **Given** a user navigates to /inventory (or any other protected page), **When** the page loads, **Then** both SiteHeader and SiteFooter are visible as normal

---

### User Story 3 - View Background Image Instead of Black Screen (Priority: P2)

As a user on the login page, I want to see a visually appealing background even if the image service is slow or unavailable, so that I never see an empty black screen.

**Why this priority**: A black background looks broken and unprofessional. While not blocking functionality, it significantly impacts user perception and trust.

**Independent Test**: Disable network or simulate slow connection, navigate to /login, verify a fallback image or gradient appears instead of black.

**Acceptance Scenarios**:

1. **Given** Firebase Storage is unavailable, **When** a user visits /login, **Then** a fallback background image is displayed (not black)
2. **Given** Firebase Storage takes longer than 1.5 seconds to respond, **When** a user visits /login, **Then** the fallback background appears immediately
3. **Given** the fallback is triggered, **When** viewing the login page, **Then** the background is visually consistent with the brand (nature/outdoor theme)
4. **Given** Firebase Storage returns images successfully, **When** a user visits /login, **Then** the fetched images are used as the background

---

### User Story 4 - Debug Visibility for Click Events (Priority: P3)

As a developer debugging the login page, I want to see console logs when form submission handlers are triggered, so that I can verify if clicks are being registered properly.

**Why this priority**: This is a diagnostic tool to help identify the root cause of button interaction issues. Lower priority as it's for debugging, not end-user functionality.

**Independent Test**: Open browser console, click login/register buttons, verify console.log messages appear confirming handler execution.

**Acceptance Scenarios**:

1. **Given** a developer has browser console open, **When** they click the Login form submit button, **Then** a console.log message indicates the submit handler was called
2. **Given** a developer has browser console open, **When** they click the Register form submit button, **Then** a console.log message indicates the submit handler was called

---

### Edge Cases

- What happens when a user manually types /login while already authenticated?
  - Redirect to /inventory (existing behavior should be preserved)
- What happens on the /register route (if it exists)?
  - The conditional shell should also hide header/footer for /register
- What happens if JavaScript fails to load?
  - Out of scope (application requires JavaScript)
- What happens if the fallback image URL is also unavailable?
  - Display the gradient fallback (existing FALLBACK_GRADIENT constant)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST hide SiteHeader and SiteFooter when the current route is /login
- **FR-002**: System MUST hide SiteHeader and SiteFooter when the current route is /register (if exists)
- **FR-003**: System MUST show SiteHeader and SiteFooter for all other routes
- **FR-004**: System MUST ensure the login form container has a higher z-index than the background container
- **FR-005**: System MUST ensure all form elements (inputs, buttons, links) receive click events
- **FR-006**: System MUST provide a fallback background image URL when Firebase Storage is unavailable or times out
- **FR-007**: System MUST timeout image fetching after 1.5 seconds and use fallback
- **FR-008**: System MUST log form submission attempts to the console for debugging purposes
- **FR-009**: System MUST use a visually appropriate fallback image (nature/outdoor theme matching brand)

### Key Entities

- **Shell Component**: Conditional layout wrapper that determines whether to show SiteHeader/SiteFooter based on route
- **Background Container**: Fixed-position element behind the login form with z-index lower than form
- **Form Container**: Positioned element containing the login card with z-index higher than background

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of login/register button clicks are registered (verified via console logs)
- **SC-002**: Login page displays without SiteHeader and SiteFooter in 100% of visits
- **SC-003**: All other pages display with SiteHeader and SiteFooter
- **SC-004**: Background is never black - fallback appears within 1.5 seconds when images unavailable
- **SC-005**: All form elements (inputs, buttons, links) are clickable without obstruction
- **SC-006**: All visual changes pass lint and build validation without errors

## Assumptions

- The Unsplash Source URL (or similar public image service) is acceptable as a fallback image source
- The /register route follows the same layout requirements as /login (if it exists)
- Debug logging (console.log) is acceptable in production for this sprint (can be removed later)
- The current gradient fallback (FALLBACK_GRADIENT) remains as a secondary fallback if the fallback image also fails
- Route matching should be exact (/login, /register) not partial (/login/*)

## Out of Scope

- Creating a dedicated Route Group for auth pages (using conditional Shell approach instead)
- Moving files or restructuring the application directory
- Performance optimization beyond the 1.5s timeout
- Removing debug logs (can be addressed in a future cleanup sprint)
- Adding new authentication methods or changing auth logic
