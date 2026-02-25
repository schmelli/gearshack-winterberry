# Feature Specification: App Shell & Branding

**Feature Branch**: `003-app-shell-branding`
**Created**: 2025-12-04
**Status**: Draft
**Input**: User description: "App Shell & Branding - Implement professional global layout with branded header, navigation, and footer"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Branded Header on All Pages (Priority: P1)

As a user visiting any page on Gearshack, I see a professional branded header that establishes the application's identity and provides easy access to main navigation.

**Why this priority**: The header is the primary branding touchpoint and navigation hub. It appears on every page and establishes the professional, production-ready feel of the application.

**Independent Test**: Navigate to any page → see sticky header with Gearshack logo + branded title, navigation links, and user menu. Resize browser to verify responsive behavior.

**Acceptance Scenarios**:

1. **Given** a user opens any page, **When** the page loads, **Then** they see a sticky header at the top with the Gearshack logo, "Gearshack" title in branded font, and navigation links.
2. **Given** a user is on desktop viewport, **When** they view the header, **Then** they see centered navigation links for "Inventory" (active), "Loadouts" (disabled), and "Community" (disabled).
3. **Given** a user scrolls down the page, **When** content scrolls, **Then** the header remains fixed at the top of the viewport.
4. **Given** a user clicks the logo or brand name, **When** clicked, **Then** they navigate to the home page (/).

---

### User Story 2 - Access User Menu and Notifications (Priority: P1)

As a user, I can access account-related actions through a user menu and see notification indicators in the header.

**Why this priority**: User menu provides essential navigation for account management and is a core expectation for web applications. Combined with notifications, it completes the header functionality.

**Independent Test**: Click user avatar → dropdown menu opens with Profile, Settings, Sign out options. Observe notification bell with badge indicator.

**Acceptance Scenarios**:

1. **Given** a user views the header, **When** they look at the right side, **Then** they see a notification bell icon with a red badge dot and a user avatar.
2. **Given** a user clicks the avatar, **When** clicked, **Then** a dropdown menu opens with "Profile", "Settings", and "Sign out" options.
3. **Given** a user clicks a menu option, **When** clicked, **Then** the dropdown closes (navigation is mocked for now).

---

### User Story 3 - Navigate on Mobile Devices (Priority: P2)

As a mobile user, I can access navigation through a responsive mobile menu that adapts to smaller screens.

**Why this priority**: Mobile support is essential for production readiness but can be implemented after desktop layout is complete.

**Independent Test**: View page on mobile viewport → see hamburger menu icon → tap to open slide-out menu with vertical navigation.

**Acceptance Scenarios**:

1. **Given** a user views the site on mobile (< 768px), **When** the page loads, **Then** the center navigation links are hidden and a hamburger menu icon appears.
2. **Given** a user taps the hamburger menu, **When** tapped, **Then** a slide-out sheet opens with vertical navigation links including "Inventory", "Loadouts", and "Community".
3. **Given** a user taps a navigation link in the mobile menu, **When** tapped, **Then** the menu closes and they navigate to the selected page.

---

### User Story 4 - View Professional Footer (Priority: P2)

As a user reaching the bottom of any page, I see a professional footer with branding, legal links, and social media presence.

**Why this priority**: Footer completes the professional appearance and provides important legal/contact information. Less critical than header but still essential for production readiness.

**Independent Test**: Scroll to bottom of any page → see dark footer with logo, tagline, legal links, and social icons.

**Acceptance Scenarios**:

1. **Given** a user scrolls to the page bottom, **When** they view the footer, **Then** they see a dark-themed footer with three content columns.
2. **Given** a user views the footer, **When** they look at the brand column, **Then** they see the Gearshack logo and tagline "Gear management for the obsessed."
3. **Given** a user views the footer, **When** they look at the legal column, **Then** they see links for "Impressum", "Privacy", and "Terms".
4. **Given** a user views the footer, **When** they look at the social column, **Then** they see icons for Instagram and Twitter/X.
5. **Given** a user views the footer bottom, **When** they look at the copyright area, **Then** they see "© 2025 Gearshack. Built with Vibe."

---

### User Story 5 - Experience Branded Typography (Priority: P3)

As a user, I experience distinctive branded typography that sets Gearshack apart from generic applications.

**Why this priority**: Typography enhancement adds polish but the app is functional without it. Can be implemented last.

**Independent Test**: View header and headings → observe "Rock Salt" font on brand name and key headings.

**Acceptance Scenarios**:

1. **Given** a user views the header, **When** they look at the "Gearshack" brand name, **Then** it displays in the "Rock Salt" handwritten font.
2. **Given** a user views page content, **When** they look at UI text (buttons, labels, body), **Then** it displays in the standard sans-serif font (Inter/Geist).

---

### Edge Cases

- What happens when logo images fail to load? Display fallback text "Gearshack" in branded font.
- How does the header behave with very long page titles? Header height remains fixed at 64px; content area handles overflow.
- What happens on very narrow viewports (< 320px)? Logo scales down, text may wrap, hamburger menu remains accessible.
- How does the footer behave when content is shorter than viewport? Footer stays at bottom of viewport (sticky footer pattern).

## Requirements *(mandatory)*

### Functional Requirements

**Header Requirements**:
- **FR-001**: System MUST display a sticky header fixed to the top of the viewport on all pages.
- **FR-002**: Header MUST have a white/translucent background with a subtle bottom border.
- **FR-003**: Header MUST display the small Gearshack logo (`small_gearshack_logo.png`) at approximately 40px height.
- **FR-004**: Header MUST display "Gearshack" text in Rock Salt font next to the logo.
- **FR-005**: Logo and brand name MUST link to the home page (/).
- **FR-006**: Header MUST display centered navigation links on desktop: "Inventory" (active), "Loadouts" (disabled/grayed), "Community" (disabled/grayed).
- **FR-007**: Header MUST display a notification bell icon with a red badge dot on the right side.
- **FR-008**: Header MUST display a user avatar that opens a dropdown menu with "Profile", "Settings", "Sign out" options.
- **FR-009**: Header height MUST be 64px.

**Mobile Header Requirements**:
- **FR-010**: On mobile viewports (< 768px), header MUST hide desktop navigation and show a hamburger menu icon.
- **FR-011**: Hamburger menu MUST open a slide-out sheet containing vertical navigation links.
- **FR-012**: Mobile menu MUST include the same navigation items as desktop (Inventory, Loadouts, Community).

**Footer Requirements**:
- **FR-013**: System MUST display a footer at the bottom of all pages.
- **FR-014**: Footer MUST have a dark background (slate-900) with light text.
- **FR-015**: Footer MUST display the large Gearshack logo (`big_gearshack_logo.png`) in the brand column.
- **FR-016**: Footer MUST display the tagline "Gear management for the obsessed."
- **FR-017**: Footer MUST include legal links: "Impressum", "Privacy", "Terms".
- **FR-018**: Footer MUST include social media icons for Instagram and Twitter/X.
- **FR-019**: Footer MUST display copyright text "© 2025 Gearshack. Built with Vibe." at the bottom.

**Layout Requirements**:
- **FR-020**: Root layout MUST use a flex column layout with minimum viewport height.
- **FR-021**: Main content area MUST expand to fill available space (flex-1), pushing footer to bottom.

**Typography Requirements**:
- **FR-022**: System MUST load "Rock Salt" font from Google Fonts.
- **FR-023**: Rock Salt font MUST be applied to the header brand name.
- **FR-024**: Standard sans-serif font (Inter/Geist) MUST be used for all other UI text.

### Key Entities

- **Navigation Item**: Represents a menu entry with label, href, and enabled/disabled state.
- **User Menu Item**: Represents a dropdown action with label and onClick handler.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Header loads and displays correctly on all pages within 500ms of page load.
- **SC-002**: Navigation is accessible on all viewport sizes from 320px to 1920px+.
- **SC-003**: All interactive elements (logo link, nav links, user menu, mobile menu) respond to user input.
- **SC-004**: Footer remains at viewport bottom even on pages with minimal content.
- **SC-005**: Rock Salt font renders correctly in the header brand name.
- **SC-006**: Mobile menu sheet opens and closes smoothly without layout shifts.
- **SC-007**: Application passes basic visual review for professional, production-ready appearance.

## Assumptions

- Logo files are available at `public/logos/small_gearshack_logo.png` and `public/logos/big_gearshack_logo.png`.
- User authentication is mocked - user menu actions don't need to function beyond closing the menu.
- Notification badge is purely decorative for now - no actual notification system.
- Legal pages (Impressum, Privacy, Terms) don't exist yet - links can be placeholder hrefs.
- Social media links are external and can use placeholder URLs or # hrefs.
