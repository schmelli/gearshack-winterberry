# Feature Specification: Loadout UX & Profile Identity

**Feature Branch**: `041-loadout-ux-profile`
**Created**: 2025-12-10
**Status**: Draft
**Input**: User description: "Loadout UX & Profile Identity - Search/filter for loadouts page, profile avatar with provider fallback, and location autocomplete for future community features"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search & Filter Loadouts (Priority: P1)

As a user with multiple loadouts, I want to search my loadouts by name and filter them by Activity Type and Season so I can quickly find past trip configurations without scrolling through my entire collection.

**Why this priority**: This is the core usability improvement that directly impacts daily usage. Users with many loadouts will struggle to find specific configurations without search/filter capabilities. This brings the Loadouts page to feature parity with the existing Inventory page.

**Independent Test**: Can be fully tested by creating 5+ loadouts with different names, activity types, and seasons, then verifying that search and filter operations correctly narrow down the displayed results.

**Acceptance Scenarios**:

1. **Given** I have 10 loadouts with various names, **When** I type "Winter" in the search field, **Then** only loadouts containing "Winter" in their name are displayed
2. **Given** I have loadouts tagged with different activity types, **When** I select "Hiking" from the Activity Type filter, **Then** only loadouts with "Hiking" in their activity_types array are shown
3. **Given** I have loadouts tagged with different seasons, **When** I select "Winter" from the Season filter, **Then** only loadouts with "Winter" in their seasons array are shown
4. **Given** I have applied both search text and filters, **When** I view the results, **Then** the results match ALL criteria (intersection, not union)
5. **Given** I have applied filters, **When** I click a "Clear filters" control, **Then** all loadouts are displayed again

---

### User Story 2 - Profile Avatar Management (Priority: P2)

As a user, I want my profile picture to automatically display my Google/Provider avatar when I sign in. I also want the option to upload a custom photo that takes precedence over the provider avatar, so I can personalize my profile without losing my default identity.

**Why this priority**: Profile identity is important for user engagement and prepares the foundation for community features. However, it doesn't block core functionality, making it secondary to search/filter.

**Independent Test**: Can be fully tested by signing in with a Google account (to see provider avatar), uploading a custom avatar (to see it replace the provider avatar), and deleting the custom avatar (to see the provider avatar return).

**Acceptance Scenarios**:

1. **Given** I sign in with Google for the first time, **When** my profile loads, **Then** my Google profile picture is displayed as my avatar
2. **Given** I have a Google avatar displayed, **When** I upload a custom profile picture, **Then** the custom picture replaces the Google avatar in all profile displays
3. **Given** I have a custom avatar uploaded, **When** I remove my custom avatar, **Then** the system falls back to my Google/provider avatar
4. **Given** I have no provider avatar and no custom avatar, **When** my profile loads, **Then** my initials are displayed as a fallback avatar
5. **Given** I upload a custom avatar, **When** I reload the page or log out and back in, **Then** my custom avatar persists and is displayed

---

### User Story 3 - Profile Location Setting (Priority: P3)

As a user, I want to set my home location by typing a city name and selecting from autocomplete suggestions, so the system can store my coordinates for future proximity-based features like Gear Sharing Circles.

**Why this priority**: This is a foundational feature for future community functionality. While valuable, it doesn't provide immediate user benefit until Gear Sharing is implemented.

**Independent Test**: Can be fully tested by opening profile settings, typing a partial city name, selecting from suggestions, saving, and verifying that the location name and coordinates are stored in the database.

**Acceptance Scenarios**:

1. **Given** I am in my profile settings, **When** I start typing "Ber" in the location field, **Then** I see autocomplete suggestions including "Berlin, Germany"
2. **Given** autocomplete suggestions are displayed, **When** I select "Berlin, Germany", **Then** the location field displays "Berlin, Germany" and the system captures the associated coordinates
3. **Given** I have selected a location, **When** I save my profile, **Then** the database stores the location_name, latitude, and longitude values
4. **Given** I have a saved location, **When** I reload the profile settings page, **Then** my location "Berlin, Germany" is displayed
5. **Given** I have a saved location, **When** I clear the location field and save, **Then** my location data (name and coordinates) is removed from the database

---

### Edge Cases

- **Empty search results**: When search/filter returns no loadouts, display a friendly "No loadouts match your criteria" message with a clear filters option
- **Network failure during location autocomplete**: Display an error message and allow manual retry; do not block the profile form
- **Invalid image upload**: If avatar upload fails (wrong format, too large), display specific error message and do not change current avatar
- **Provider avatar unavailable**: If the auth provider doesn't provide an avatar URL, fall back to initials immediately
- **Special characters in search**: Search should handle special characters gracefully without breaking the query
- **Long location names**: Location display should truncate gracefully in UI while preserving full name in database

## Requirements *(mandatory)*

### Functional Requirements

**Loadout Search & Filter** *(Pre-implemented - see existing codebase)*

- **FR-001** *(DONE)*: System MUST provide a text search field that filters loadouts by name (case-insensitive partial match)
- **FR-002** *(DONE)*: System MUST provide an Activity Type filter dropdown populated with available activity types
- **FR-003** *(DONE)*: System MUST provide a Season filter dropdown populated with available seasons (Spring, Summer, Fall, Winter)
- **FR-004** *(DONE)*: System MUST support combining search text with multiple filter selections (AND logic)
- **FR-005** *(DONE)*: System MUST provide a visible "Clear filters" control to reset all search/filter criteria
- **FR-006** *(DONE)*: System MUST display a count of filtered results vs. total loadouts
- **FR-007** *(DONE)*: System MUST persist filter state during the user session (navigating away and back preserves filters)

**Profile Avatar**

- **FR-008**: System MUST display the user's auth provider avatar when no custom avatar is set
- **FR-009**: System MUST allow users to upload a custom avatar image
- **FR-010**: System MUST display custom avatar when available, taking precedence over provider avatar
- **FR-011**: System MUST allow users to remove their custom avatar, reverting to provider avatar
- **FR-012**: System MUST display user initials when neither custom nor provider avatar is available
- **FR-013**: System MUST store custom avatar URL in the profiles table (avatar_url field)
- **FR-014**: System MUST validate uploaded images (acceptable formats: JPEG, PNG, WebP; max size: 5MB)

**Profile Location**

- **FR-015**: System MUST provide a location autocomplete input field in profile settings
- **FR-016**: System MUST store selected location as location_name (text), latitude (float), and longitude (float) in the profiles table
- **FR-017**: System MUST allow users to clear their location
- **FR-018**: System MUST display the current location name in profile settings if one is saved
- **FR-019**: System MUST validate that selected locations include valid coordinates before saving

### Key Entities

- **Loadout**: Existing entity extended with filter capability. Key attributes for filtering: name (string), activity_types (array), seasons (array)
- **Profile**: User profile entity. Extended with: avatar_url (custom avatar URL), location_name (human-readable location), latitude (geographic coordinate), longitude (geographic coordinate)
- **Location Selection**: Transient entity representing autocomplete result with name and coordinates

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can locate a specific loadout within 10 seconds using search or filters (compared to scrolling)
- **SC-002**: Search returns results within 500ms of user input (perceived as instant)
- **SC-003**: Filter changes reflect immediately in the loadout list without page reload
- **SC-004**: Custom avatar uploads complete within 3 seconds for images under 2MB
- **SC-005**: Avatar changes persist across browser sessions with 100% reliability
- **SC-006**: Location autocomplete suggestions appear within 1 second of typing
- **SC-007**: 100% of saved locations include valid latitude and longitude values
- **SC-008**: Profile page correctly displays the avatar hierarchy (custom > provider > initials) in all cases

## Assumptions

- The existing Cloudinary infrastructure used for gear images will be reused for avatar uploads
- Activity types are stored as an array column in the loadouts table (activity_types)
- Seasons are stored as an array column in the loadouts table (seasons)
- The location autocomplete will use a third-party geocoding service (reasonable default: Google Places API, which is industry standard for address/location autocomplete)
- Avatar display size is standardized across the application (existing avatar component handles sizing)
- The profiles table in Supabase already has avatar_url column; new columns needed: location_name, latitude, longitude

## Scope Boundaries

**In Scope**:
- Loadout list search and filtering UI
- Profile avatar upload, display, and removal
- Profile location selection with autocomplete
- Database schema updates for new profile fields

**Out of Scope**:
- Gear Sharing Circles feature (future feature that will use location data)
- Loadout sharing or public visibility
- Avatar cropping/editing within the application
- Multiple location support per user
- Loadout sorting options (beyond filtering)
