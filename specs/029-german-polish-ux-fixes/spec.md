# Feature Specification: German Polish, Routing Repair & UX Fixes

**Feature Branch**: `029-german-polish-ux-fixes`
**Created**: 2025-12-07
**Status**: Draft
**Input**: User description: "German Polish, Routing Repair & UX Fixes - Translation improvements (Ladungen→Packlisten, untranslated Footer), locale-aware routing fixes (404s on loadout creation/edit), loadout metadata UX (description instead of date), logo visibility (white on dark header), and image search functionality (magnifying glass button)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Loadout Creation Without 404 Errors (Priority: P1)

A user creates or edits a loadout and expects to be redirected to the loadout detail page or list page after saving. Currently, they receive a 404 error because the redirect path is missing the locale prefix (e.g., `/loadouts/123` instead of `/de/loadouts/123`).

**Why this priority**: This is a critical bug that completely breaks core functionality. Users cannot create or edit loadouts without encountering errors, making the loadout feature unusable.

**Independent Test**: Create a new loadout while viewing the app in German (`/de/loadouts`), save it, and verify successful redirect to `/de/loadouts/{id}` without 404.

**Acceptance Scenarios**:

1. **Given** user is on `/de/loadouts/new`, **When** they complete and save a new loadout, **Then** they are redirected to `/de/loadouts/{id}` (with locale prefix)
2. **Given** user is on `/en/loadouts/{id}`, **When** they edit and save the loadout, **Then** they remain on `/en/loadouts/{id}` without 404
3. **Given** user clicks a loadout card on `/de/loadouts`, **When** the card link is clicked, **Then** they navigate to `/de/loadouts/{id}` (locale-aware link)

---

### User Story 2 - Correct German Translation for Navigation (Priority: P1)

A German-speaking user sees "Ladungen" (meaning "loads/charges") in the navigation instead of "Packlisten" (meaning "packing lists"), which is the correct outdoor terminology. The footer also shows untranslated English text.

**Why this priority**: Poor translations damage user trust and app credibility. German users immediately recognize incorrect terminology, making the app feel unprofessional.

**Independent Test**: Switch to German locale and verify navigation shows "Packlisten" and footer shows German text for all legal links.

**Acceptance Scenarios**:

1. **Given** user views the app in German, **When** they look at the main navigation, **Then** they see "Packlisten" (not "Ladungen")
2. **Given** user views the app in German, **When** they scroll to the footer, **Then** they see German translations for Privacy, Terms, and Imprint links
3. **Given** user views the app in English, **When** they look at navigation, **Then** they see "Loadouts" (unchanged)

---

### User Story 3 - Visible Logo on Dark Header (Priority: P2)

Users cannot see the logo in the header because it's dark/black on a dark green background (`#405A3D`). The logo should appear white for proper contrast and visibility.

**Why this priority**: Brand visibility is important but not blocking functionality. Users can still use the app, but the header looks incomplete/broken.

**Independent Test**: View any page and verify the logo is clearly visible (white) against the Deep Forest Green header.

**Acceptance Scenarios**:

1. **Given** user views any page with the site header, **When** they look at the logo, **Then** the logo appears white with high contrast against the green background
2. **Given** user views the app in dark mode, **When** they look at the header logo, **Then** it remains visible and properly contrasted

---

### User Story 4 - Loadout Description Instead of Trip Date (Priority: P2)

When creating or editing a loadout, users see a "Trip Date" date picker that provides little value. Users want a description field to add notes about the loadout's purpose (e.g., "Summer weekend backpacking", "Winter day hike essentials").

**Why this priority**: Improves UX and utility of loadouts, but existing functionality still works without it.

**Independent Test**: Create a new loadout and verify the modal shows a description textarea instead of date picker. View the loadout detail and see the description displayed.

**Acceptance Scenarios**:

1. **Given** user opens the loadout create/edit dialog, **When** they view the form fields, **Then** they see a "Description" multiline text area (not a date picker)
2. **Given** user enters a description and saves the loadout, **When** they view the loadout detail page, **Then** the description is prominently displayed in the header area
3. **Given** user edits an existing loadout with a description, **When** they open the edit dialog, **Then** the description field shows the existing text

---

### User Story 5 - Functional Image Search Button (Priority: P3)

The gear editor has a magnifying glass button in the Media section that currently does nothing. Users expect clicking it to help them find product images.

**Why this priority**: Nice-to-have feature that enhances workflow but isn't critical to core functionality.

**Independent Test**: Open gear editor, click the image search button, and verify a Google Image search opens in a new tab with the gear's brand and name as the query.

**Acceptance Scenarios**:

1. **Given** user is editing gear with brand "MSR" and name "Hubba Hubba", **When** they click the image search button, **Then** a new browser tab opens with Google Image search for "MSR Hubba Hubba"
2. **Given** user is editing gear with only a name (no brand), **When** they click the image search button, **Then** the search uses just the gear name
3. **Given** user is editing gear with no name or brand filled in, **When** they click the image search button, **Then** nothing happens or a helpful message appears

---

### Edge Cases

- What happens when a loadout is created with an empty description? (Accept as valid - description is optional)
- How does the logo appear on print/high-contrast accessibility modes? (Should remain visible)
- What if the gear name contains special characters? (URL-encode the search query)
- What if the user has pop-up blockers enabled? (Search may be blocked - standard browser behavior)

## Requirements *(mandatory)*

### Functional Requirements

**Routing & Navigation**:
- **FR-001**: System MUST use locale-aware navigation for all loadout redirects after create/save operations
- **FR-002**: System MUST use locale-aware links for loadout card navigation
- **FR-003**: All internal links within the loadout feature MUST preserve the current locale prefix

**Translations**:
- **FR-004**: German translations MUST use "Packlisten" for the loadouts navigation item
- **FR-005**: System MUST provide German translations for footer links (Privacy, Terms, Imprint)
- **FR-006**: English translations MUST remain unchanged ("Loadouts")

**Logo Visibility**:
- **FR-007**: Site header logo MUST display in white/light color for visibility against the dark green header background

**Loadout Metadata UX**:
- **FR-008**: Loadout create/edit dialog MUST include a description textarea field
- **FR-009**: Loadout create/edit dialog MUST NOT include a trip date picker
- **FR-010**: Loadout detail page MUST display the description prominently in the header section

**Image Search**:
- **FR-011**: Gear editor Media section MUST have a functional image search button
- **FR-012**: Image search MUST open Google Image search in a new browser tab
- **FR-013**: Image search query MUST include the gear's brand and name fields

### Key Entities

- **Loadout**: Existing entity - updated to prioritize `description` field over `tripDate` in UI
- **Translation Messages**: JSON files containing localized strings for EN and DE locales
- **Footer Links**: Privacy Policy, Terms of Service, Imprint (legal pages common in German apps)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create and edit loadouts in German locale without encountering 404 errors (100% success rate)
- **SC-002**: German-speaking users see correct outdoor terminology "Packlisten" in navigation
- **SC-003**: Logo is visible on the header with sufficient contrast ratio (WCAG AA minimum 4.5:1)
- **SC-004**: Users can add and view loadout descriptions in under 30 seconds
- **SC-005**: Image search button opens relevant Google search results within 2 seconds of clicking
- **SC-006**: All footer links display in the user's selected language

## Assumptions

- The existing `description` field exists on the Loadout data model (or can be added without migration)
- The locale-aware navigation utilities from next-intl/i18n are already configured in the project
- Google Image Search is accessible without API keys via direct URL construction
- The logo image file supports CSS filter transformations (PNG or SVG)
- Footer component exists and accepts translation keys
