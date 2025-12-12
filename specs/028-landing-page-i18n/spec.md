# Feature Specification: Landing Page & i18n Strings

**Feature Branch**: `028-landing-page-i18n`
**Created**: 2025-12-07
**Status**: Draft
**Input**: Marketing and Localization Sprint - Build GearGraph Landing Page and populate i18n strings for core app views

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-Time Visitor Views Landing Page (Priority: P1)

As a first-time visitor, I want to see a compelling landing page that explains the product's value so I can decide whether to sign up.

**Why this priority**: The landing page is the first impression for all new visitors. Without it, there's no conversion funnel.

**Independent Test**: Navigate to the homepage while logged out and verify all landing page sections display correctly with clear messaging and CTAs.

**Acceptance Scenarios**:

1. **Given** I am a logged-out visitor, **When** I navigate to the homepage, **Then** I see a hero section with compelling headline and "Start Free Trial" CTA
2. **Given** I am on the landing page, **When** I scroll down, **Then** I see feature highlights, social proof, and pricing information
3. **Given** I view the landing page on mobile, **When** I scroll, **Then** all sections are properly stacked and readable

---

### User Story 2 - Authenticated User Returns to Homepage (Priority: P1)

As an authenticated user, I want the homepage to direct me to my dashboard instead of showing marketing content so I can quickly access my gear.

**Why this priority**: Logged-in users shouldn't see marketing content - they need quick access to their inventory.

**Independent Test**: Log in and navigate to homepage - verify CTA changes to "Go to Dashboard".

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I visit the homepage, **Then** the hero CTA displays "Go to Dashboard" instead of "Start Free Trial"
2. **Given** I am logged in, **When** I click "Go to Dashboard", **Then** I am navigated to the inventory page

---

### User Story 3 - German-Speaking Visitor Views Landing Page (Priority: P2)

As a German-speaking visitor, I want to see the landing page in German so I can understand the product in my native language.

**Why this priority**: Supports the i18n infrastructure already in place. Expands market reach.

**Independent Test**: Switch language to German and verify all landing page text displays in German.

**Acceptance Scenarios**:

1. **Given** I am on the German version of the site (/de/), **When** I view the landing page, **Then** all text is displayed in German
2. **Given** I switch from English to German, **When** the page reloads, **Then** all landing page sections show German translations

---

### User Story 4 - User Interacts with Translated Auth Flow (Priority: P2)

As a user, I want the login and registration forms to display text in my selected language so the entire experience is consistent.

**Why this priority**: Partial translations create a fragmented user experience.

**Independent Test**: Navigate to login page in German and verify all form labels and buttons are translated.

**Acceptance Scenarios**:

1. **Given** I am on the German site, **When** I view the login form, **Then** I see German labels for email, password, and submit button
2. **Given** I am on the German site, **When** I view error messages, **Then** they display in German

---

### User Story 5 - User Browses Translated Inventory Views (Priority: P3)

As a user, I want the inventory page, gear editor, and related views to display text in my selected language for a consistent experience.

**Why this priority**: Core app functionality should match the user's language preference.

**Independent Test**: Navigate to inventory page in German and verify UI elements show German text.

**Acceptance Scenarios**:

1. **Given** I am logged in on the German site, **When** I view my inventory, **Then** I see German text for search, filters, and empty states
2. **Given** I am editing a gear item in German, **When** I view the form, **Then** labels and buttons display in German

---

### Edge Cases

- What happens when a translation key is missing? → Fall back to English text
- What happens when a user with an existing session switches language? → Session persists, UI updates to new language
- How does the landing page display if images fail to load? → Text remains readable with appropriate fallback styling

## Requirements *(mandatory)*

### Functional Requirements

#### Landing Page

- **FR-001**: System MUST display a hero section with headline, subtitle, and primary CTA button
- **FR-002**: System MUST display a feature grid showing 3 key product benefits with icons
- **FR-003**: System MUST display a social proof section with trust indicators
- **FR-004**: System MUST display a pricing preview section with tier comparison
- **FR-005**: System MUST show "Go to Dashboard" CTA for authenticated users
- **FR-006**: System MUST show "Start Free Trial" CTA for unauthenticated users
- **FR-007**: Landing page MUST be fully responsive (mobile-first design)

#### i18n Translation Strings

- **FR-008**: System MUST provide translations for landing page content (Landing namespace)
- **FR-009**: System MUST provide translations for authentication forms (Auth namespace)
- **FR-010**: System MUST provide translations for inventory page (Inventory namespace)
- **FR-011**: System MUST provide translations for gear editor (GearEditor namespace)
- **FR-012**: All translated components MUST fall back to English for missing keys

#### Visual Design

- **FR-013**: Landing page MUST use the "Deep Forest" color theme (#405A3D) for backgrounds
- **FR-014**: Landing page MUST use emerald accent colors for interactive elements
- **FR-015**: Landing page MUST support dark mode as the default theme

### Key Entities

- **Translation Namespace**: Logical grouping of related translation keys (Landing, Auth, Inventory, GearEditor)
- **Landing Section**: Discrete visual component of the landing page (Hero, Features, Social Proof, Pricing)
- **Pricing Tier**: Product offering level (Basecamp/Free, Trailblazer/Pro)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Landing page loads and displays all sections within 3 seconds on 4G LTE connection (~10Mbps)
- **SC-002**: All landing page sections display correctly on mobile (320px width and up)
- **SC-003**: 100% of landing page text displays in both English and German
- **SC-004**: Auth forms display with fully translated labels in both languages
- **SC-005**: Inventory and gear editor views display with translated UI text
- **SC-006**: Application builds successfully with no missing translation key warnings
- **SC-007**: Users can complete the sign-up flow entirely in their chosen language

## Assumptions

- The "Deep Forest" theme color (#405A3D) is already defined in the application
- Feature icons will use lucide-react icons from the existing design system
- Pricing tiers are placeholders - actual pricing details can be updated later
- Social proof section will use placeholder content (testimonials, logos) initially
- The translation structure uses namespaced JSON (Landing.heroTitle, Auth.emailLabel, etc.)
- Hero section uses the existing brand font (Rock Salt) for the tagline
