# Feature Specification: Storage Path Alignment & Loadout Crash Fix

**Feature Branch**: `015-storage-path-fix`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Fix upload permissions by aligning storage path to security rules, and fix loadout crash caused by invalid legacy IDs."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Successful Image Upload (Priority: P1)

As a user uploading images for my gear items, I want the upload to succeed without permission errors, so I can add photos to document my gear.

**Why this priority**: Image upload is broken for all users due to path mismatch with security rules. This is a critical bug blocking core functionality.

**Independent Test**: Open gear editor, upload an image file, verify it uploads successfully and the image URL is saved.

**Acceptance Scenarios**:

1. **Given** I am logged in and editing a gear item, **When** I upload an image file, **Then** the upload completes successfully without permission errors
2. **Given** I upload an image, **When** the upload completes, **Then** the image is stored in the correct location matching security rules
3. **Given** I upload an image, **When** the upload completes, **Then** I can see the uploaded image displayed in the preview

---

### User Story 2 - Stable Loadout List Display (Priority: P1)

As a user viewing my loadouts, I want the loadout list to display without crashing, so I can access and manage my saved loadouts.

**Why this priority**: The app crashes when displaying loadouts with legacy invalid IDs, making the loadouts feature unusable for affected users.

**Independent Test**: Navigate to loadouts page with legacy data containing invalid IDs, verify the page loads without crashing.

**Acceptance Scenarios**:

1. **Given** legacy data contains loadouts with invalid IDs (e.g., hex color codes), **When** I view the loadouts page, **Then** the page loads without crashing
2. **Given** a loadout has an invalid ID format, **When** the loadout list renders, **Then** that invalid loadout is silently skipped (not displayed)
3. **Given** I have valid loadouts mixed with invalid ones, **When** I view the loadouts page, **Then** only valid loadouts are displayed

---

### User Story 3 - Clear Upload Error Messages (Priority: P2)

As a user encountering upload problems, I want to see specific error messages that help me understand what went wrong, so I can take appropriate action.

**Why this priority**: Improves user experience but is secondary to fixing the core upload functionality.

**Independent Test**: Trigger various upload errors and verify specific, actionable error messages are displayed.

**Acceptance Scenarios**:

1. **Given** an upload fails due to permission issues, **When** the error occurs, **Then** a message indicating "Permission denied" is displayed
2. **Given** an upload fails due to timeout, **When** the error occurs, **Then** a message indicating "Upload timed out" is displayed
3. **Given** an upload fails for other reasons, **When** the error occurs, **Then** a generic but helpful error message is displayed

---

### Edge Cases

- What if a loadout ID is null or undefined? Skip the card, do not crash.
- What if a loadout ID starts with "#" (hex color)? Skip the card, do not crash.
- What if the upload service is unavailable? Show appropriate error message.
- What if the user loses authentication mid-upload? Show permission error message.

## Requirements *(mandatory)*

### Functional Requirements

#### Upload Path Alignment

- **FR-001**: Image uploads MUST be stored in a path matching security rules (user's authorized storage location)
- **FR-002**: Upload function MUST log the exact storage path for debugging purposes
- **FR-003**: Upload path MUST include a timestamp to ensure unique filenames

#### Loadout Crash Prevention

- **FR-004**: LoadoutCard component MUST validate loadout ID before rendering
- **FR-005**: If loadout ID is missing or invalid (null, undefined, or starts with "#"), MUST skip rendering (return null)
- **FR-006**: Valid loadouts MUST continue to render normally

#### Error Message Improvements

- **FR-007**: Permission denied errors MUST display a specific message to the user
- **FR-008**: Timeout errors MUST display a specific message to the user
- **FR-009**: All error messages MUST be user-friendly and actionable

### Key Entities

- **GearImage**: User-uploaded image file stored in cloud storage
- **Loadout**: User's collection of gear items with ID, name, and gear references
- **UploadError**: Error response containing error code and message

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of image uploads succeed for authenticated users (zero permission errors)
- **SC-002**: Loadouts page loads successfully with 0 crashes, even with legacy invalid data
- **SC-003**: Users see specific error messages within 1 second of upload failure
- **SC-004**: All invalid loadouts (with hex color IDs) are silently filtered from display

## Assumptions

- The existing storage security rules are correct and should not be modified
- Legacy data may contain invalid loadout IDs that look like hex color codes (e.g., "#4660a")
- The user is authenticated when attempting uploads (auth state is already managed)
- Toast notifications are the standard way to display error messages in this application
