# Feature Specification: Loadout Creation - Step 1 Form

**Feature Branch**: `047-loadout-creation-form`
**Created**: 2025-12-13
**Status**: Draft
**Input**: User description: "Enhanced loadout creation form with name, description, season, and activity type fields for thoughtful trip planning before item selection"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Trip Definition Form (Priority: P1)

A user starting to create a new loadout sees a focused form with four fields that help them think through their trip basics. They fill in the loadout name, description, select a season, and choose an activity type. This mental exercise takes about 60 seconds and prepares them for purposeful item selection in Step 2.

**Why this priority**: This is the core value proposition - helping users think through their trip before jumping into item selection. Without this form, the entire feature has no purpose.

**Independent Test**: Can be fully tested by navigating to the new loadout creation page, filling out all four fields, and verifying data is captured. Delivers immediate value by forcing intentional trip planning.

**Acceptance Scenarios**:

1. **Given** a user is on the loadouts page, **When** they click to create a new loadout, **Then** they see a form with fields for: Loadout Name, Description, Season, and Activity Type
2. **Given** the form is displayed, **When** the user views all fields, **Then** all four fields are visible without scrolling on standard desktop/tablet screens
3. **Given** all fields are visible, **When** the user fills out the form, **Then** they can complete it in under 60 seconds
4. **Given** the user has filled all required fields, **When** they click "Weiter zu Packliste", **Then** all entered data is preserved and passed to Step 2

---

### User Story 2 - Season Selection (Priority: P1)

A user needs to specify when their trip is happening by selecting one or more seasons. The available options match the existing codebase: Spring, Summer, Fall, Winter. This helps contextualize gear choices in Step 2.

**Why this priority**: Season directly impacts gear selection (winter gear vs summer gear). Critical for the form's purpose of providing context.

**Independent Test**: Can be tested by selecting each season option and verifying the selection persists through form submission.

**Acceptance Scenarios**:

1. **Given** the form is displayed, **When** the user views the Season field, **Then** they see toggle options for: Spring, Summer, Fall, Winter (using existing `Season` type)
2. **Given** the Season selector is displayed, **When** the user selects "Winter", **Then** the selection is visually confirmed and stored
3. **Given** a season is selected, **When** the user proceeds to Step 2, **Then** the selected season is available for context

---

### User Story 3 - Activity Type Selection (Priority: P1)

A user needs to specify what kind of trip they're planning by selecting one or more activity types. The available options match the existing codebase: Hiking, Camping, Climbing, Skiing, Backpacking. This categorization helps frame the gear selection process and enables the priority matrix display in Step 2.

**Why this priority**: Activity type is essential context that determines what gear categories are relevant. Each activity has predefined priority scores for Weight, Comfort, Durability, and Safety that guide gear selection.

**Independent Test**: Can be tested by selecting each activity type option and verifying the selection persists through form submission.

**Acceptance Scenarios**:

1. **Given** the form is displayed, **When** the user views the Activity Type field, **Then** they see toggle options for: Hiking, Camping, Climbing, Skiing, Backpacking (using existing `ActivityType` type)
2. **Given** the Activity Type selector is displayed, **When** the user selects "Backpacking", **Then** the selection is visually confirmed and stored
3. **Given** an activity type is selected, **When** the user proceeds to Step 2, **Then** the selected activity type is available for context and priority matrix

---

### User Story 4 - Cancel Creation Flow (Priority: P2)

A user who decides not to create a loadout can cancel the process and return to the loadouts list without saving any data.

**Why this priority**: Important for user control and navigation, but secondary to the core form functionality.

**Independent Test**: Can be tested by starting the form, entering some data, clicking "Abbrechen", and verifying return to loadouts list without data being saved.

**Acceptance Scenarios**:

1. **Given** the form is displayed, **When** the user clicks "Abbrechen", **Then** they are returned to the Loadouts list
2. **Given** the user has partially filled the form, **When** they click "Abbrechen", **Then** no loadout data is saved

---

### User Story 5 - German Language Display (Priority: P2)

All form labels, placeholders, buttons, and options are displayed in German, following the existing i18n setup in the application.

**Why this priority**: Required for the German-speaking target audience, but the form works functionally without localization.

**Independent Test**: Can be tested by viewing the form and verifying all visible text is in German.

**Acceptance Scenarios**:

1. **Given** the user is viewing the form in German locale, **When** they see all labels and buttons, **Then** all text is displayed in proper German
2. **Given** the Season options are displayed, **When** the user views them, **Then** options are localized (Frühling, Sommer, Herbst, Winter)
3. **Given** the Activity Type options are displayed, **When** the user views them, **Then** options are localized (Wandern, Camping, Klettern, Skifahren, Trekking)

---

### Edge Cases

- What happens when the user submits with an empty loadout name? → Form validation prevents submission and shows error message
- What happens when the user refreshes the page mid-form? → Form data is lost; user starts fresh (acceptable for this quick form)
- What happens when the user navigates away without saving? → No data is persisted; this is expected behavior
- How does the form handle very long loadout names? → Reasonable character limit (100 characters) with visual feedback
- How does the form handle very long descriptions? → Description field allows multi-line text with reasonable limit (500 characters)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a form with four fields: Loadout Name (text input), Description (textarea), Season (selector), and Activity Type (selector)
- **FR-002**: System MUST provide Season options using existing `Season` type: spring, summer, fall, winter
- **FR-003**: System MUST provide Activity Type options using existing `ActivityType` type: hiking, camping, climbing, skiing, backpacking
- **FR-004**: System MUST display a primary "Weiter zu Packliste" button that proceeds to Step 2 with form data
- **FR-005**: System MUST display a secondary "Abbrechen" button that returns to the Loadouts list
- **FR-006**: System MUST validate that Loadout Name is not empty before allowing progression
- **FR-007**: System MUST pass all form data (name, description, season, activity type) to Step 2
- **FR-008**: System MUST display all form labels, buttons, and options in German using i18n
- **FR-009**: Loadout Name field MUST have a maximum length of 100 characters
- **FR-010**: Description field MUST have a maximum length of 500 characters
- **FR-011**: Description field SHOULD be optional (empty description is allowed)
- **FR-012**: Season field SHOULD have a default selection or placeholder prompting selection
- **FR-013**: Activity Type field SHOULD have a default selection or placeholder prompting selection

### Key Entities

- **Loadout Draft**: Represents the in-progress loadout being created. Contains: name (string, required), description (string, optional), seasons (array of Season), activityTypes (array of ActivityType)
- **Season**: Existing enumeration from `types/loadout.ts`: spring, summer, fall, winter
- **ActivityType**: Existing enumeration from `types/loadout.ts`: hiking, camping, climbing, skiing, backpacking

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the form (all four fields) in under 60 seconds
- **SC-002**: All four form fields are visible on one screen without scrolling on screens 768px height or larger
- **SC-003**: 100% of form submissions successfully pass data to Step 2 without data loss
- **SC-004**: All visible text displays correctly in German for German locale users
- **SC-005**: Users can identify what each field is for within 5 seconds of viewing the form (clear labeling)
- **SC-006**: Form validation prevents empty loadout names with clear error feedback

## Assumptions

- The existing loadout creation flow at `/loadouts/new` will be enhanced (not replaced)
- The application already has i18n infrastructure (next-intl) configured
- Season and ActivityType values use existing types from `types/loadout.ts`
- The existing `createLoadout` action in `useSupabaseStore` will be extended to accept additional fields
- Standard form components from shadcn/ui are available (react-hook-form + zod validation)
- The loadout entity already supports `seasons`, `activityTypes`, and `description` fields
