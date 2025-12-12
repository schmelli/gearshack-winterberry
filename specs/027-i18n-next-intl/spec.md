# Feature Specification: Internationalization with next-intl

**Feature Branch**: `027-i18n-next-intl`
**Created**: 2025-12-07
**Status**: Draft
**Input**: Implement Internationalization (i18n) using `next-intl` with English (default) and German locales

## User Scenarios & Testing *(mandatory)*

### User Story 1 - English-Speaking User Navigates App (Priority: P1)

As an English-speaking user, I want the application to display all navigation and content in English so I can easily understand and use all features.

**Why this priority**: English is the default language and expected experience for the majority of users. Core navigation must work before adding additional languages.

**Independent Test**: Navigate to the application root URL and verify all header navigation, hero text, and UI elements display in English.

**Acceptance Scenarios**:

1. **Given** I am a new visitor, **When** I navigate to the application, **Then** I see the interface in English by default
2. **Given** I am on the homepage, **When** I view the header navigation, **Then** I see "Inventory", "Loadouts", "Community", and "Login" in English
3. **Given** I am on the homepage, **When** I view the hero section, **Then** I see "Master Your Loadout" text

---

### User Story 2 - German-Speaking User Switches Language (Priority: P2)

As a German-speaking user, I want to switch the application language to German so I can use the app in my native language.

**Why this priority**: Language switching is the core feature that enables multilingual support. Without this, German users cannot access translated content.

**Independent Test**: Click the language switcher in the header and verify the interface changes to German.

**Acceptance Scenarios**:

1. **Given** I am viewing the app in English, **When** I click the language switcher and select German, **Then** the interface displays in German
2. **Given** I switched to German, **When** I view the header navigation, **Then** I see "Inventar", "Ladungen", "Community", and "Anmelden"
3. **Given** I switched to German, **When** I navigate to other pages, **Then** they remain in German
4. **Given** I am on a German URL (/de/...), **When** I refresh the page, **Then** the language preference persists

---

### User Story 3 - Locale-Based URL Routing (Priority: P2)

As a user sharing a link, I want the URL to include the language code so recipients see the page in the same language I shared.

**Why this priority**: URL-based locale ensures shareable links maintain language context and enables SEO for different language markets.

**Independent Test**: Visit `/de/inventory` directly and verify the page loads in German without requiring manual language selection.

**Acceptance Scenarios**:

1. **Given** I visit `/en/inventory`, **When** the page loads, **Then** I see the inventory page in English
2. **Given** I visit `/de/inventory`, **When** the page loads, **Then** I see the inventory page in German
3. **Given** I visit `/` (root URL), **When** the page loads, **Then** I am redirected to `/en/` (default locale)
4. **Given** I am on `/de/loadouts`, **When** I click "Inventory" in the nav, **Then** I navigate to `/de/inventory` (locale preserved)

---

### User Story 4 - Seamless Provider Integration (Priority: P3)

As a developer, I need the i18n integration to work seamlessly with existing authentication and sync providers so existing functionality is not broken.

**Why this priority**: This is a technical requirement to ensure the migration doesn't break existing features. It's lower priority because it's a constraint rather than a user-facing feature.

**Independent Test**: Log in, create/edit gear items, and verify authentication and data sync continue to work correctly.

**Acceptance Scenarios**:

1. **Given** I am logged out, **When** I switch languages and then log in, **Then** authentication works correctly
2. **Given** I am logged in, **When** I switch languages, **Then** my session persists and data remains accessible
3. **Given** I edit a gear item, **When** I switch languages mid-edit, **Then** my unsaved changes are preserved

---

### Edge Cases

- What happens when a user visits an unsupported locale URL (e.g., `/fr/inventory`)? → Redirect to default locale (`/en/inventory`)
- What happens when the browser's preferred language is German? → Auto-detect and redirect to `/de/`
- What happens to existing bookmarks without locale prefix? → Redirect from `/inventory` to `/en/inventory`
- How does the app handle missing translation keys? → Fall back to English text

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support English (en) as the default locale
- **FR-002**: System MUST support German (de) as an additional locale
- **FR-003**: System MUST use locale-based URL routing (e.g., `/en/...`, `/de/...`)
- **FR-004**: System MUST redirect root URL (`/`) to the default locale (`/en/`)
- **FR-005**: System MUST provide a language switcher in the header for users to change language
- **FR-006**: System MUST preserve locale when navigating between pages
- **FR-007**: System MUST set the HTML `lang` attribute based on current locale
- **FR-008**: System MUST provide translated strings for: navigation items, hero text, and common UI elements
- **FR-009**: System MUST fall back to English for any missing translation keys
- **FR-010**: System MUST maintain existing authentication and data sync functionality after migration
- **FR-011**: System MUST detect browser language preference and redirect new visitors to their preferred supported locale

### Key Entities

- **Locale**: A supported language code (en, de) that determines which translations to display
- **Messages**: JSON files containing key-value pairs of translation strings organized by namespace
- **Namespace**: Logical grouping of related translation keys (e.g., Navigation, Hero, Common)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between English and German with a single click
- **SC-002**: All navigation and hero text displays correctly in both languages
- **SC-003**: Page URLs correctly reflect the active locale
- **SC-004**: Existing features (auth, data sync, gear editing) continue to work without regression
- **SC-005**: Application builds successfully with no TypeScript errors related to i18n
- **SC-006**: Language preference persists across page refreshes via URL

## Assumptions

- Translation strings will initially cover navigation and hero sections; full app translation is out of scope for this feature
- Browser language detection will only consider "en" and "de"; other languages default to English
- The language switcher will be a simple text toggle (EN/DE) in the header, not a dropdown
- Existing URL structures will be preserved under the locale prefix (e.g., `/inventory/new` → `/en/inventory/new`)
