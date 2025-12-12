# Feature Specification: Intelligence Integration (Categories & Autocomplete)

**Feature Branch**: `044-intelligence-integration`
**Created**: 2025-12-11
**Status**: Draft
**Input**: User description: "Intelligence Integration - Integrating the Supabase categories table and catalog_brands for cascading category selection and brand autocomplete"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cascading Category Selection (Priority: P1)

As a user editing a gear item, I want to select categories from a cascading dropdown that guides me through Main Category → Sub-Category → Type, so I can accurately classify my gear using the standardized ontology.

**Why this priority**: Category classification is fundamental to gear organization. Without proper categorization, users cannot effectively filter, search, or organize their inventory. This is the core data enrichment feature.

**Independent Test**: Can be fully tested by opening the gear editor, clicking the category selector, and navigating through all three levels. Delivers immediate value by enabling proper gear classification.

**Acceptance Scenarios**:

1. **Given** a user is on the gear edit form, **When** they click the category selector, **Then** they see a list of main categories (e.g., "Shelter", "Sleep System", "Cooking")
2. **Given** a user has selected a main category "Shelter", **When** the selection is made, **Then** they see sub-categories (e.g., "Tents", "Tarps", "Bivys")
3. **Given** a user has selected sub-category "Tents", **When** the selection is made, **Then** they see types (e.g., "Ultralight Tents", "3-Season Tents", "4-Season Tents")
4. **Given** a user has completed all three levels of selection, **When** they save the form, **Then** the category slug (e.g., "shelter-tents-ultralight") is stored with the gear item
5. **Given** a user selects only a main category (e.g., "Shelter") without drilling deeper, **When** they save the form, **Then** the partial category slug (e.g., "shelter") is stored with the gear item
6. **Given** a user is editing an existing gear item with a saved category, **When** the edit form loads, **Then** all applicable dropdown levels are pre-populated with the correct selections

---

### User Story 2 - Brand Autocomplete (Priority: P2)

As a user entering a brand name for my gear item, I want to see suggestions from a curated list of outdoor brands as I type, so I can ensure consistency and discover brands I may have misspelled.

**Why this priority**: Brand autocomplete improves data quality and reduces entry errors, but the gear item can be saved without a brand. This enhances the experience but isn't blocking.

**Independent Test**: Can be fully tested by typing partial brand names in the brand field and verifying suggestions appear. Delivers value by improving data consistency across user inventories.

**Acceptance Scenarios**:

1. **Given** a user is typing in the brand field, **When** they type at least 2 characters (e.g., "Hi"), **Then** they see matching brand suggestions (e.g., "Hilleberg", "Hiking Hansen")
2. **Given** a user mistypes a brand name (e.g., "Hillberg" instead of "Hilleberg"), **When** fuzzy search runs, **Then** the correct brand "Hilleberg" appears in suggestions
3. **Given** suggestions are displayed, **When** the user clicks a suggestion, **Then** the brand field is populated with the selected brand name
4. **Given** suggestions are displayed, **When** the user continues typing a non-matching string, **Then** the suggestions list updates or shows "No matches found"
5. **Given** the user types a brand not in the database, **When** they leave the field, **Then** the custom value is accepted (not restricted to suggestions only)
6. **Given** the user clears the brand field, **When** the field is empty, **Then** no suggestions are displayed

---

### User Story 3 - Developer Category Hook (Priority: P2)

As a developer, I want a `useCategories` hook that fetches and transforms the flat categories table into a hierarchical tree, so UI components can efficiently render cascading menus without repeated transformations.

**Why this priority**: This is a technical enabler for User Story 1. It must be built before the UI component but is development-focused rather than user-facing.

**Independent Test**: Can be tested by calling the hook in isolation and verifying the returned tree structure matches expectations. Delivers value by providing a reusable, cached data source.

**Acceptance Scenarios**:

1. **Given** the hook is called, **When** categories are fetched from Supabase, **Then** the data is cached to prevent redundant network requests
2. **Given** the categories are fetched, **When** the transformation completes, **Then** a nested tree structure is returned with main categories containing sub-categories containing types
3. **Given** a category slug is provided, **When** the hook is queried, **Then** it can resolve the full path (main → sub → type) from the slug
4. **Given** the network request fails, **When** the error occurs, **Then** the hook returns an error state that the UI can handle gracefully

---

### User Story 4 - Brand Data Seeding (Priority: P3)

As a developer, I want a seed script that populates the catalog_brands table with common outdoor brands, so the autocomplete feature can be tested immediately without manual data entry.

**Why this priority**: This is a development utility that enables testing. It doesn't provide direct user value but unblocks development of the autocomplete feature.

**Independent Test**: Can be tested by running the seed script and querying the catalog_brands table. Delivers value by providing test data for development.

**Acceptance Scenarios**:

1. **Given** the seed script is executed, **When** it completes successfully, **Then** at least 20 common outdoor brands exist in catalog_brands
2. **Given** the script is run multiple times, **When** brands already exist, **Then** the script handles duplicates gracefully (upsert or skip)
3. **Given** a developer needs test data, **When** they run the script, **Then** brands like "Hilleberg", "MSR", "Big Agnes", "Zpacks", "Gossamer Gear" are available

---

### Edge Cases

- What happens when the categories table is empty or fails to load? The selector should display an error state with retry option.
- What happens when a saved category slug no longer exists in the ontology? The UI should display the raw slug value and allow re-selection.
- What happens when the user has slow network connectivity? Category and brand fetches should show loading states and gracefully timeout.
- What happens when typing very quickly in brand autocomplete? The system should debounce requests to prevent excessive API calls.
- What happens when the categories table has circular parent references? The tree builder should detect and handle this gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch categories from the categories table and transform them into a hierarchical tree structure
- **FR-002**: System MUST cache fetched categories to minimize database queries (cache invalidation on page refresh is acceptable)
- **FR-003**: System MUST provide a cascading dropdown UI for category selection (Main → Sub → Type) where users can finalize selection at any level
- **FR-004**: System MUST persist the selected category as a slug (e.g., "shelter-tents-ultralight") to the gear item
- **FR-005**: System MUST pre-populate the category selector with existing values when editing a gear item
- **FR-006**: System MUST provide brand autocomplete suggestions using fuzzy/typo-tolerant search when the user types at least 2 characters
- **FR-007**: System MUST debounce brand search queries to prevent excessive database calls (300ms debounce)
- **FR-008**: System MUST allow users to enter custom brand names not in the suggestions list
- **FR-009**: System MUST display localized category names based on the user's locale (using name_i18n JSONB column)
- **FR-010**: System MUST handle loading and error states gracefully in both category and brand components

### Key Entities

- **Category**: Represents a single node in the gear taxonomy with id, slug, parent_id, name_i18n (JSONB for translations), and depth (0=main, 1=sub, 2=type)
- **CategoryTree**: A nested structure where each main category contains its sub-categories, which contain their types - derived from flat Category data
- **CatalogBrand**: Represents a brand entry with id, name, country, website_url, and logo_url for autocomplete suggestions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate through all three category levels and complete a selection in under 10 seconds
- **SC-002**: Category selections are preserved correctly when editing existing gear items (100% accuracy)
- **SC-003**: Brand autocomplete suggestions appear within 500ms of the user pausing typing
- **SC-004**: 95% of common outdoor brand names are suggested when the user types the first 3 characters
- **SC-005**: The category selector displays localized names for users with German (de) or English (en) locales
- **SC-006**: Category and brand components gracefully display error states rather than crashing when data fails to load
- **SC-007**: Initial category data loads in under 1 second on standard network connections

## Clarifications

### Session 2025-12-11

- Q: Can users select at any category level or must they complete all three levels? → A: Allow selection at any level (user can stop at Main, Sub, or Type)
- Q: What search matching strategy for brand autocomplete? → A: Fuzzy/typo-tolerant search (finds "Hileberg" when user types "Hillberg")

## Assumptions

- The `categories` table is already populated with the full gear ontology (from Feature 043)
- The `catalog_brands` table schema exists but may be empty (seed script will populate test data)
- The `name_i18n` JSONB column in categories contains at minimum `en` and `de` keys
- The existing gear editor form uses react-hook-form and can integrate new controlled components
- Supabase client is already configured and available via existing hooks/utilities
