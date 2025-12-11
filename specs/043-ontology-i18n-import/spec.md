# Feature Specification: Ontology Import & Category Internationalization

**Feature Branch**: `043-ontology-i18n-import`
**Created**: 2025-12-10
**Status**: Draft
**Input**: User description: "Feature: Ontology Import & Category Internationalization - Populate the categories table with master data from Hiking_Gear_Ontology_i18n.json with schema updates for i18n support (EN/DE) and stable slugs for mapping."

## Clarifications

### Session 2025-12-10

- Q: What should happen to existing categories when the new ontology is imported? → A: Replace - Delete existing categories, import fresh from ontology
- Q: How should gear items with existing category assignments be handled? → A: Allow nullification - Gear items lose category refs, users re-categorize manually

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Categories in Preferred Language (Priority: P1)

As a frontend user browsing or selecting gear categories, I want to see category names displayed in my preferred language (German or English) so that I can navigate and understand the gear taxonomy in my native language.

**Why this priority**: This is the core user-facing value of the feature. Without localized category names, users cannot benefit from the internationalization effort. All other technical work enables this user experience.

**Independent Test**: Can be fully tested by switching the app locale between English and German, then verifying that all category dropdown menus and labels display translated text. Delivers immediate value to German-speaking users.

**Acceptance Scenarios**:

1. **Given** a user with locale set to German, **When** they view the category selector in the gear editor, **Then** they see category names in German (e.g., "Regenjacken" instead of "Rain Jackets")
2. **Given** a user with locale set to English, **When** they view category labels anywhere in the app, **Then** they see English category names as before
3. **Given** a category with i18n translations, **When** the frontend queries that category, **Then** it can retrieve the appropriate label based on the current locale

---

### User Story 2 - Import Complete Gear Ontology (Priority: P2)

As a developer, I want to import the entire 3-level hiking gear taxonomy (Categories > Subcategories > Product Types) from a JSON source file into the database so that users have a comprehensive and standardized category hierarchy available.

**Why this priority**: The ontology data is essential for the feature to provide value, but it's a one-time operation that enables User Story 1. It must be completed before users can see localized categories.

**Independent Test**: Can be fully tested by running the seed script against an empty categories table and verifying all 3 levels are correctly imported with proper parent-child relationships.

**Acceptance Scenarios**:

1. **Given** an empty categories table, **When** the seed script runs with the ontology JSON, **Then** all Level 1 categories (main categories) are created
2. **Given** Level 1 categories exist, **When** the seed script processes Level 2, **Then** subcategories are created with correct parent_id references via slug matching
3. **Given** Level 2 subcategories exist, **When** the seed script processes Level 3, **Then** product types are created with correct parent_id references via slug matching
4. **Given** the ontology JSON contains 10 main categories, 50 subcategories, and 200 product types, **When** the import completes, **Then** the database contains all 260 categories

---

### User Story 3 - Idempotent Ontology Updates (Priority: P3)

As a developer, I want to re-run the import script without creating duplicates so that I can safely update the taxonomy as the ontology evolves or add new translations.

**Why this priority**: This is a developer experience improvement that prevents data corruption. While important, it's only needed after the initial import and during maintenance operations.

**Independent Test**: Can be fully tested by running the seed script twice and verifying the category count remains the same, while any updated fields reflect the new values.

**Acceptance Scenarios**:

1. **Given** categories already exist from a previous import, **When** the seed script runs again with unchanged data, **Then** no duplicate entries are created
2. **Given** a category exists with a German translation "Zelte", **When** the seed script runs with an updated German translation "Zelthütten", **Then** the existing category's i18n is updated (not duplicated)
3. **Given** the seed script runs twice consecutively, **When** checking the categories table, **Then** the row count equals the number of unique categories in the JSON source

---

### Edge Cases

- What happens when a parent slug is referenced but doesn't exist? The script should fail gracefully with an error message identifying the missing parent.
- What happens when the JSON file is missing or malformed? The script should abort with a clear error message before making any database changes.
- What happens when a slug contains special characters? Slugs should be normalized (lowercase, underscores) during import.
- What happens when a category has no translation for a requested locale? Fall back to English as the default language.
- What happens to gear items referencing deleted categories? Foreign keys are set to NULL (via CASCADE rules); users must re-categorize items using the new ontology.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add a `slug` column (TEXT, UNIQUE, NOT NULL) to the categories table to store stable identifiers like 'rain_jackets'
- **FR-002**: System MUST add an `i18n` column (JSONB) to the categories table to store translations in format `{"en": "Rain Jackets", "de": "Regenjacken"}`
- **FR-003**: System MUST provide a seed script that reads category data from a JSON source file
- **FR-004**: Seed script MUST process 3 hierarchy levels: categories (L1), subcategories (L2), and product types (L3)
- **FR-005**: Seed script MUST link child categories to parents using slug-based matching
- **FR-006**: Seed script MUST perform upsert operations based on slug to enable idempotent updates
- **FR-007**: System MUST support querying categories and retrieving localized labels for English (en) and German (de)
- **FR-008**: System MUST fall back to English when a translation is not available for the requested locale
- **FR-009**: Seed script MUST delete all existing category data before importing fresh from the ontology (replace strategy, not merge)
- **FR-010**: System MUST allow gear items to have NULL category references after import (users re-categorize manually)

### Key Entities

- **Category**: Represents a gear classification at any level (1-3). Key attributes: id (UUID), parent_id (UUID nullable), level (1-3), label (legacy, TEXT), slug (unique identifier), i18n (JSONB with locale translations). Relationships: self-referential parent-child hierarchy.
- **Ontology JSON**: External data source containing the complete hiking gear taxonomy with translations. Structure: nested objects with categories containing subcategories containing product types, each with locale-specific labels.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All categories in the ontology JSON (estimated 200-300 entries across 3 levels) are successfully imported into the database
- **SC-002**: Users viewing categories in German locale see German labels for 100% of categories that have German translations
- **SC-003**: Re-running the import script produces zero duplicate entries (idempotent operation)
- **SC-004**: Category lookup by slug completes without errors for any valid slug in the ontology
- **SC-005**: Frontend category selectors display localized names within existing page load times (no noticeable delay)

## Assumptions

- The `Hiking_Gear_Ontology_i18n.json` file will be provided by the user and placed in a location accessible to the seed script (e.g., `scripts/data/` or project root)
- The JSON structure follows a nested format where each level contains a `slug`, `en` label, `de` label, and optional children
- English is the default/fallback language when a translation is missing
- The existing `label` column will be retained for backward compatibility but may be deprecated in future
- The seed script will be run manually by developers, not automatically during deployment
- Supabase service role credentials will be used to bypass RLS during seeding operations
