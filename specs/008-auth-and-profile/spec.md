# Feature Specification: Identity & Access with Profile Management

**Feature Branch**: `008-auth-and-profile`
**Created**: 2025-12-05
**Status**: Draft
**Input**: Implement Identity & Access with deeply integrated Profile Management using existing Firestore data from legacy 'gearshack-springbreak' Firebase project.

## Overview

Enable users to authenticate via Google or Email/Password and immediately access their extended profile stored in Firestore. The system connects to an existing Firebase project with pre-existing user data, providing an immersive login experience with nature-themed backgrounds and a profile management modal accessible from the site header.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Google Sign-In (Priority: P1)

A returning user wants to quickly sign in using their Google account to access their existing gear inventory and loadouts.

**Why this priority**: Google Sign-In provides the fastest path to authentication with minimal friction. Most outdoor enthusiasts already have Google accounts, and this leverages existing trust.

**Independent Test**: Can be fully tested by clicking "Sign in with Google", completing OAuth flow, and verifying redirect to protected content with user avatar visible in header.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user on the login page, **When** they click "Sign in with Google" and complete the OAuth flow, **Then** they are redirected to the inventory page with their profile information loaded
2. **Given** a user with existing Firestore profile data, **When** they sign in with Google, **Then** their display name, avatar, and trail name are immediately visible in the header
3. **Given** a new user signing in with Google for the first time, **When** authentication succeeds, **Then** a new Firestore document is created with their basic info (email, display name from Google)

---

### User Story 2 - Email/Password Authentication (Priority: P1)

A user prefers to create an account using their email address and a password rather than social login.

**Why this priority**: Essential alternative for users who don't want to use Google or don't have a Google account. Required for feature parity.

**Independent Test**: Can be fully tested by completing registration form, verifying email (if required), then logging in with credentials.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user on the login page, **When** they enter valid email and password and click "Sign In", **Then** they are authenticated and redirected to protected content
2. **Given** a new user on the login page, **When** they click "Create Account" and complete registration, **Then** their account is created and they are logged in
3. **Given** a user with an incorrect password, **When** they attempt to sign in, **Then** they see a clear error message without revealing if the email exists

---

### User Story 3 - View Profile Modal (Priority: P1)

An authenticated user wants to view their profile information including avatar, display name, trail name, bio, and location.

**Why this priority**: Profile visibility is essential for user identity and community features. Users need to verify their identity is correct after login.

**Independent Test**: Can be fully tested by signing in, clicking profile in header menu, and verifying all profile fields display correctly.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they click "Profile" in the user menu, **Then** a modal opens showing their avatar, display name, trail name, bio, and location
2. **Given** a user with social links configured, **When** they view their profile modal, **Then** they see icons for their connected social platforms (Instagram, Facebook, YouTube, website)
3. **Given** a user with VIP status, **When** they view their profile, **Then** a VIP indicator is displayed

---

### User Story 4 - Edit Profile (Priority: P2)

An authenticated user wants to update their profile information including display name, trail name, bio, location, avatar, and social links.

**Why this priority**: While viewing is essential, editing is a secondary action that users perform less frequently. Still important for personalization.

**Independent Test**: Can be fully tested by opening profile modal, clicking edit, modifying fields, saving, and verifying changes persist after refresh.

**Acceptance Scenarios**:

1. **Given** a user viewing their profile modal, **When** they click "Edit", **Then** the modal switches to edit mode with editable form fields
2. **Given** a user in edit mode, **When** they modify their display name and click "Save", **Then** the changes are persisted to Firestore and reflected immediately
3. **Given** a user editing their profile, **When** they click "Cancel", **Then** unsaved changes are discarded and the modal returns to view mode
4. **Given** a user updating their avatar URL, **When** they save, **Then** the new avatar displays throughout the application

---

### User Story 5 - Immersive Login Experience (Priority: P2)

A user visiting the login page experiences an immersive, nature-themed interface with rotating background images from Firebase Storage.

**Why this priority**: Enhances brand identity and user experience but is not essential for core authentication functionality.

**Independent Test**: Can be fully tested by navigating to login page and observing background rotation with glassmorphism card overlay.

**Acceptance Scenarios**:

1. **Given** a user on the login page, **When** the page loads, **Then** they see a nature-themed background image with a glassmorphism login card
2. **Given** a user remaining on the login page, **When** 5-10 seconds pass, **Then** the background smoothly transitions to another nature image
3. **Given** the background images load from storage, **When** images are unavailable, **Then** a fallback gradient or static image is displayed

---

### User Story 6 - Route Protection (Priority: P1)

Unauthenticated users attempting to access protected routes are redirected to the login page.

**Why this priority**: Security fundamental. Users must not access private data without authentication.

**Independent Test**: Can be fully tested by navigating directly to /inventory, /loadouts, or /settings while logged out and verifying redirect to /login.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they navigate to /inventory, **Then** they are redirected to /login
2. **Given** an unauthenticated user, **When** they navigate to /loadouts, **Then** they are redirected to /login
3. **Given** an unauthenticated user, **When** they navigate to /settings, **Then** they are redirected to /login
4. **Given** an authenticated user, **When** they navigate to protected routes, **Then** they access the content normally
5. **Given** a user who was redirected to login, **When** they successfully authenticate, **Then** they are returned to their originally requested page

---

### User Story 7 - Sign Out (Priority: P2)

An authenticated user wants to sign out of their account securely.

**Why this priority**: Important for security and shared device scenarios, but secondary to core authentication flows.

**Independent Test**: Can be fully tested by signing in, clicking sign out in user menu, and verifying redirect to login with cleared session.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they click "Sign Out" in the user menu, **Then** they are signed out and redirected to the login page
2. **Given** a signed-out user, **When** they navigate to protected routes, **Then** they are redirected to login

---

### Edge Cases

- What happens when a user's Firestore profile document doesn't exist yet? (Create with defaults from Auth data)
- How does the system handle network errors during profile fetch? (Show Auth data only, retry on next page load)
- What happens when a user's avatar URL is invalid or broken? (Display initials fallback)
- How does the system handle simultaneous edits from multiple devices? (Last write wins, no conflict resolution for MVP)
- What happens when Firebase Auth session expires? (Re-authenticate on next protected route access)
- How does the system handle existing fields like `first_launch` or `isVIP` during profile updates? (Preserve them, never overwrite)

## Requirements *(mandatory)*

### Functional Requirements

**Authentication**
- **FR-001**: System MUST support Google OAuth sign-in
- **FR-002**: System MUST support email/password authentication (sign-in and registration)
- **FR-003**: System MUST persist authentication state across page refreshes
- **FR-004**: System MUST provide a sign-out mechanism that clears the session
- **FR-005**: System MUST display appropriate error messages for failed authentication attempts
- **FR-005a**: System MUST provide a "Forgot Password" link that sends a password reset email via Firebase Auth

**Route Protection**
- **FR-006**: System MUST redirect unauthenticated users from /inventory and /inventory/* routes to /login
- **FR-007**: System MUST redirect unauthenticated users from /loadouts and /loadouts/* routes to /login
- **FR-007a**: System MUST redirect unauthenticated users from /settings to /login
- **FR-007b**: System MUST keep "/" (home page) publicly accessible without authentication
- **FR-008**: System MUST allow authenticated users to access protected routes
- **FR-009**: System SHOULD preserve the originally requested URL and redirect back after successful login

**Profile Data Integration**
- **FR-010**: System MUST fetch user profile from Firestore path `userBase/{uid}` upon successful authentication
- **FR-011**: System MUST merge Firebase Auth data (email, uid, photoURL) with Firestore profile data
- **FR-012**: System MUST prioritize Firestore `avatarUrl` over Auth `photoURL` when both exist
- **FR-013**: System MUST preserve existing Firestore fields (first_launch, isVIP) during profile updates
- **FR-014**: System MUST create a new Firestore document for first-time users with defaults

**Profile Display (Modal)**
- **FR-015**: Profile modal MUST display user avatar (with initials fallback)
- **FR-016**: Profile modal MUST display display name and trail name
- **FR-017**: Profile modal MUST display bio and location when available
- **FR-018**: Profile modal MUST display social links (Instagram, Facebook, YouTube, website) as icons when configured
- **FR-019**: Profile modal MUST indicate VIP status when `isVIP` is true

**Profile Editing**
- **FR-020**: Users MUST be able to edit: displayName, trailName, bio, location, avatarUrl
- **FR-020a**: displayName MUST be 2-50 characters and is required
- **FR-020b**: trailName MUST be 2-30 characters when provided (optional)
- **FR-020c**: bio MUST be max 500 characters (optional)
- **FR-020d**: avatarUrl and social link URLs MUST be validated for proper URL format
- **FR-021**: Users MUST be able to edit social links: instagram, facebook, youtube, website
- **FR-022**: Profile edits MUST persist to Firestore at `userBase/{uid}`
- **FR-023**: Cancel action MUST discard unsaved changes without modifying Firestore
- **FR-024**: Save action MUST provide feedback via toast notification (success or error)

**Login Page UI**
- **FR-025**: Login page MUST display a glassmorphism card over a full-bleed background image
- **FR-026**: Login page MUST rotate background images fetched from Firebase Storage `backgrounds/hd` folder
- **FR-027**: Login page MUST display both Google sign-in and email/password form options
- **FR-028**: Login page MUST gracefully handle background image loading failures

**Image Configuration**
- **FR-029**: System MUST allow images from `firebasestorage.googleapis.com` domain
- **FR-030**: System MUST allow images from `lh3.googleusercontent.com` domain (Google avatars)

### Key Entities

- **UserProfile**: Represents the extended user profile stored in Firestore
  - Core fields: avatarUrl, displayName, trailName, bio, location
  - Social fields: instagram, facebook, youtube, website
  - System fields: isVIP (boolean), first_launch (timestamp)
  - Relationship: One-to-one with Firebase Auth user via uid

- **AuthUser**: Represents the authenticated user from Firebase Auth
  - Fields: uid, email, displayName, photoURL
  - Relationship: Source of truth for authentication state

- **MergedUser**: Represents the combined Auth + Profile data presented to the UI
  - Priority resolution: Firestore avatarUrl > Auth photoURL
  - Combines email/uid from Auth with profile fields from Firestore

- **BackgroundImage**: Represents HD background images for login page
  - Source: Firebase Storage `backgrounds/hd` folder
  - Used for: Immersive login experience with rotation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete Google sign-in in under 10 seconds from clicking the button to seeing protected content
- **SC-002**: Users can complete email/password registration in under 30 seconds
- **SC-003**: Profile modal opens within 500ms of clicking the menu item
- **SC-004**: Profile data loads and merges within 2 seconds of successful authentication
- **SC-005**: Background image rotation transitions smoothly without visible flicker or layout shift
- **SC-006**: 100% of protected route access attempts by unauthenticated users result in redirect to login
- **SC-007**: Profile updates reflect immediately in the UI without requiring page refresh
- **SC-008**: Existing Firestore fields (isVIP, first_launch) are preserved through all profile update operations

## Clarifications

### Session 2025-12-05

- Q: Should email/password users have a "Forgot Password" reset flow? → A: Yes, include password reset (send reset email via Firebase)
- Q: Should new email/password registrations require email verification before accessing protected content? → A: No, allow immediate access after registration
- Q: Should the landing/home page require authentication? → A: No, "/" is public; only /inventory and /loadouts are protected
- Q: What validation constraints should apply to editable profile fields? → A: Basic - displayName 2-50 chars required, trailName 2-30 chars optional, bio max 500 chars, URLs validated
- Q: Should /settings require authentication? → A: Yes, /settings requires authentication (add to protected routes)

## Assumptions

- The Firebase project 'gearshack-springbreak' already exists and has the required configuration
- Environment variables for Firebase configuration are available (API key, project ID, etc.)
- The Firestore structure `userBase/{uid}` is the correct path based on legacy application
- Background images exist in Firebase Storage at `backgrounds/hd` path
- OAuth redirect URLs are properly configured in Firebase Console for the deployment domain
- Users have relatively modern browsers with JavaScript enabled
- Network connectivity is reasonably stable for authentication flows
- The existing data in Firestore follows a consistent schema across users
- Sub-collections (gearInventory, loadouts, settings) exist but are not synced in this feature scope
- Avatar upload functionality can be simplified to URL input for MVP (file upload is optional enhancement)
- Email verification is not required for new registrations; users gain immediate access after signup
