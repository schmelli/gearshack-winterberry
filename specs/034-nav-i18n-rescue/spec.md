# Feature Specification: Navigation & Translation Rescue Sprint

**Feature Branch**: `034-nav-i18n-rescue`
**Created**: 2025-12-08
**Status**: Draft
**Input**: User description: "Navigation & Translation Rescue Sprint: Fix routing bugs and translation keys"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Locale-Aware Navigation After Save (Priority: P1)

A user editing a gear item in German locale (/de/inventory/abc/edit) saves the item and is correctly redirected back to the inventory page in their current locale (/de/inventory), not the root locale or a 404 page.

**Why this priority**: This is a critical user flow bug. Users currently get lost after saving due to incorrect redirects that don't preserve locale.

**Independent Test**: Navigate to /de/inventory → Click Edit on any item → Save → Verify redirect goes to /de/inventory (not /inventory or 404)

**Acceptance Scenarios**:

1. **Given** a user on the German locale edit page (/de/inventory/[id]/edit), **When** they save a gear item, **Then** they are redirected to /de/inventory
2. **Given** a user on the English locale edit page (/en/inventory/[id]/edit), **When** they save a gear item, **Then** they are redirected to /en/inventory
3. **Given** a user creating a new item on any locale, **When** they save, **Then** they are redirected to the inventory page with the same locale prefix

---

### User Story 2 - Working Edit Links in Gallery (Priority: P1)

A user browsing the inventory gallery in German locale clicks the Edit button on a gear card and is taken to the correct edit page with locale preserved (/de/inventory/abc/edit), not a 404 or home redirect.

**Why this priority**: Broken edit links prevent users from modifying their gear items, blocking a core feature.

**Independent Test**: Navigate to /de/inventory → Hover over a gear card → Click Edit icon → Verify URL is /de/inventory/[id]/edit and page loads correctly

**Acceptance Scenarios**:

1. **Given** a user on the German inventory page, **When** they click the Edit button on a gear card, **Then** they navigate to /de/inventory/[id]/edit
2. **Given** a user on the English inventory page, **When** they click the Edit button on a gear card, **Then** they navigate to /en/inventory/[id]/edit
3. **Given** a user on any locale, **When** they click any navigation link, **Then** the locale prefix is preserved in the destination URL

---

### User Story 3 - Complete Translation Coverage (Priority: P2)

All text displayed to users in the German locale appears in German without any error messages or missing translation placeholders. The translation system correctly resolves all keys.

**Why this priority**: Missing translations create a broken user experience and make the app appear unfinished.

**Independent Test**: Browse all main pages in German locale → Verify no "MISSING_MESSAGE" errors appear → Verify no English text appears where German is expected

**Acceptance Scenarios**:

1. **Given** a user viewing the inventory page in German, **When** the page renders, **Then** all text displays in German with correct ICU formatting
2. **Given** a user saving a gear item in German locale, **When** the save succeeds or fails, **Then** feedback messages display in German
3. **Given** a user viewing any page in German locale, **When** viewing the browser console, **Then** no "INVALID_MESSAGE" or "MISSING_MESSAGE" errors appear

---

### Edge Cases

- What happens when a user directly navigates to a URL without locale prefix? The middleware redirects to the default locale
- What happens when a user switches locale while on an edit page? The URL updates with new locale prefix and content reloads
- What happens when a translation key exists in English but not German? The system should show English as fallback (not an error)
- What happens when ICU message format has invalid parameters? The system should show a formatted error, not crash

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All internal navigation links MUST use the locale-aware Link component to preserve locale prefix
- **FR-002**: All programmatic navigation (router.push) MUST use the locale-aware router to preserve locale prefix
- **FR-003**: After saving a gear item, the user MUST be redirected to the inventory page with their current locale
- **FR-004**: All translation keys used in code MUST exist in all supported language files (EN and DE)
- **FR-005**: Translation keys MUST be case-sensitive matched (e.g., 'Inventory' not 'inventory')
- **FR-006**: ICU message format placeholders MUST match between code usage and translation files
- **FR-007**: The middleware MUST redirect root URL (/) to the default locale (/en/)
- **FR-008**: The middleware MUST preserve locale when navigating between pages

### Key Entities

- **Translation Keys**: Namespaced keys (Inventory.itemCount, GearEditor.saveSuccess) with ICU message format support
- **Locale-Aware Components**: Link and useRouter that automatically handle locale prefixes
- **Middleware**: Request interceptor that ensures all URLs have locale prefix

### Assumptions

- The locale-aware navigation utilities already exist and are exported from the i18n module
- The middleware is correctly configured for locale detection and routing
- All translation files follow the same structure and namespace conventions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of navigation actions preserve the current locale in the URL
- **SC-002**: Zero 404 errors when clicking Edit buttons on gear cards in any locale
- **SC-003**: Zero "MISSING_MESSAGE" or "INVALID_MESSAGE" console errors during normal app usage
- **SC-004**: All user-facing text displays in the selected locale (no untranslated strings visible)
- **SC-005**: Build and lint pass without errors
- **SC-006**: Users can complete the full edit flow (navigate to edit, make changes, save, return to list) without encountering routing errors
