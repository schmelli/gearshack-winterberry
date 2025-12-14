# Feature Specification: Shared Loadout Enhancement

**Feature Branch**: `048-shared-loadout-enhancement`
**Created**: 2025-12-13
**Status**: Draft
**Input**: User description: "Enhance the shared loadout screen to differentiate between signed-in and anonymous users, with hero header showing owner profile, proper gear cards with detail modals, CTA for signup, wishlist integration for signed-in users, and comment notifications."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anonymous Visitor Hero Experience (Priority: P1)

An anonymous visitor (not signed in) opens a shared loadout URL and sees a beautifully designed landing-style page that showcases the loadout with a hero header. The header displays the app logo, loadout name, description, trip details, and the owner's avatar. This creates a premium first impression that represents the app's quality and encourages signup.

**Why this priority**: This is the primary conversion touchpoint - visitors must be impressed enough to consider signing up. The shared page acts as the app's "business card" for potential new users.

**Independent Test**: Can be fully tested by sharing a loadout URL in incognito mode and verifying the hero header renders with all owner information and loadout details.

**Acceptance Scenarios**:

1. **Given** I am not signed in, **When** I open a shared loadout URL, **Then** I see a hero-style header with the app logo, loadout name, description, seasons, activity types, and owner avatar
2. **Given** I am viewing a shared loadout as anonymous user, **When** I click on the owner's avatar, **Then** an owner profile modal opens showing the owner's public profile information
3. **Given** I am viewing a shared loadout as anonymous user, **When** the page loads, **Then** I do not see the app's standard navigation bar (no menu, no settings icon)

---

### User Story 2 - Anonymous Visitor Signup Call-to-Action (Priority: P1)

The shared loadout page for anonymous visitors includes a prominent call-to-action in the header area that invites them to sign up in order to add this loadout to their own collection. The CTA is visually prominent but not intrusive.

**Why this priority**: Converting visitors to users is a core business goal. The CTA must be visible and compelling without disrupting the content viewing experience.

**Independent Test**: Can be tested by opening a shared URL while logged out and verifying the CTA button/banner is visible and links to signup/signin flow.

**Acceptance Scenarios**:

1. **Given** I am not signed in, **When** I view a shared loadout, **Then** I see a clear CTA inviting me to "Add this loadout to your collection" or similar messaging
2. **Given** I am viewing the CTA, **When** I click on it, **Then** I am directed to the sign-in/sign-up page with context that I came from a shared loadout
3. **Given** I complete signup/signin from a shared loadout, **When** I return to the app, **Then** the system automatically creates a copy of the loadout in my account with all items added as wishlist status

---

### User Story 3 - Premium Gear Cards with Detail Modals (Priority: P1)

The gear items in the shared loadout display using the same high-quality GearCard component used in the main app inventory. Clicking on any gear card opens the full detail modal showing all item information, creating a consistent premium experience.

**Why this priority**: The gear cards are the core content visitors are evaluating. They must match the in-app quality to demonstrate the app's value and encourage signup.

**Independent Test**: Can be tested by opening a shared loadout and clicking on gear items to verify detail modals open with full item information.

**Acceptance Scenarios**:

1. **Given** I am viewing a shared loadout (signed-in or anonymous), **When** the page loads, **Then** I see gear items displayed as proper GearCard components with images, brand, name, weight, and category
2. **Given** I am viewing a shared loadout, **When** I click on a gear card, **Then** the GearDetailModal opens showing full item details (image, specs, description)
3. **Given** I am viewing gear cards, **When** multiple items exist, **Then** they are grouped and sorted by category for logical organization

---

### User Story 4 - Signed-In User In-App Experience (Priority: P2)

A signed-in user opening a shared loadout URL sees the page rendered within the normal app shell with standard navigation. The experience feels integrated rather than like a separate landing page.

**Why this priority**: Signed-in users should have a seamless in-app experience. The differentiation between signed-in and anonymous experiences creates appropriate context for each user type.

**Independent Test**: Can be tested by signing in and opening a shared loadout URL, verifying the standard app navigation is visible.

**Acceptance Scenarios**:

1. **Given** I am signed in, **When** I open a shared loadout URL, **Then** I see the standard app navigation header
2. **Given** I am signed in and viewing a shared loadout, **When** I click on the owner's avatar, **Then** I see their profile modal with options to contact them if their privacy settings allow
3. **Given** I am viewing someone else's loadout, **When** I see items I don't own, **Then** I can distinguish them from items I already have in my inventory

---

### User Story 5 - Owned Items Indicator (Priority: P2)

When a signed-in user views a shared loadout, items they already own in their inventory are subtly indicated (visual distinction). This helps users quickly identify what new gear the loadout suggests.

**Why this priority**: Identifying owned vs. new items helps users evaluate the loadout's value and decide which items to add to their wishlist.

**Independent Test**: Can be tested by creating a shared loadout with items the viewing user owns, then verifying those items show a "You own this" indicator.

**Acceptance Scenarios**:

1. **Given** I am signed in and viewing a shared loadout, **When** the loadout contains items I own, **Then** those items display a subtle "Owned" indicator or visual treatment
2. **Given** I am viewing a shared loadout, **When** an item matches one in my inventory (by name/brand or other matching logic), **Then** it is marked as owned
3. **Given** I own none of the items, **When** I view the loadout, **Then** no items show the owned indicator

---

### User Story 6 - Add to Wishlist Feature (Priority: P2)

Signed-in users can add items they don't own from a shared loadout to their inventory as "wishlist" items. This enables tracking desired gear for future purchase or marketplace alerts.

**Why this priority**: Wishlist functionality drives engagement and enables future marketplace features (price alerts, seller notifications).

**Independent Test**: Can be tested by viewing a shared loadout with items not in inventory and clicking "Add to Wishlist" on one, then verifying it appears in the user's inventory with wishlist status.

**Acceptance Scenarios**:

1. **Given** I am signed in and viewing a shared loadout, **When** I see an item I don't own, **Then** I see an option to "Add to Wishlist"
2. **Given** I click "Add to Wishlist" on an item, **When** the action completes, **Then** the item is added to my inventory with status "wishlist"
3. **Given** I add an item to my wishlist, **When** I view the shared loadout again, **Then** that item now shows as "On your wishlist" instead of offering to add again

---

### User Story 7 - Comment Notifications for Loadout Owner (Priority: P3)

When someone leaves a comment on a shared loadout, the loadout owner receives a notification in their app's notification system. This keeps owners engaged with feedback on their shared content.

**Why this priority**: Notifications drive engagement and ensure loadout owners see valuable feedback. This is foundational for community features.

**Independent Test**: Can be tested by leaving a comment on a shared loadout, then checking the owner's notification feed for the new notification.

**Acceptance Scenarios**:

1. **Given** someone comments on my shared loadout, **When** the comment is posted, **Then** I receive a notification in my app
2. **Given** I receive a comment notification, **When** I view the notification, **Then** I can see who commented and on which loadout
3. **Given** I have comment notifications enabled, **When** I click the notification, **Then** I am navigated to view the shared loadout with comments

---

### User Story 8 - Owner Profile Access from Shared Page (Priority: P3)

Both anonymous and signed-in users can click on the loadout owner's avatar to view their profile. For signed-in users, this may include contact options if the owner's privacy settings allow.

**Why this priority**: Profile visibility enables community interaction and trust-building between users sharing gear knowledge.

**Independent Test**: Can be tested by clicking the owner avatar on a shared loadout and verifying the profile modal opens with appropriate information based on privacy settings.

**Acceptance Scenarios**:

1. **Given** I am viewing a shared loadout, **When** I click on the owner's avatar, **Then** an owner profile modal opens showing their public profile information
2. **Given** I am signed in and viewing someone's profile, **When** their settings allow contact, **Then** I see an option to send them a message
3. **Given** the owner has restricted their profile, **When** I view their profile, **Then** I see only limited public information as per their privacy settings

---

### Edge Cases

- What happens when a shared loadout URL is invalid or expired? - Show a friendly 404 page with option to browse public loadouts or sign up
- What happens when the loadout owner deletes their account? - The shared loadout should show "Owner no longer available" but still display the gear
- What happens when adding an item to wishlist fails? - Show error toast and retry option, don't lose the action intent
- What happens if a signed-in user owns all items in the shared loadout? - Show a message like "Great taste! You already own all these items"
- How does the system match "owned" items when exact duplicates may not exist? - Match by brand + name (case-insensitive), with future option for more sophisticated matching

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect whether the viewer is signed in and render the appropriate page variant (hero landing vs. in-app shell)
- **FR-002**: System MUST display a hero-style header for anonymous users with app logo, loadout name, description, seasons, activity types, and owner avatar
- **FR-003**: System MUST hide the standard app navigation bar for anonymous users viewing shared loadouts
- **FR-004**: System MUST display a prominent call-to-action for anonymous users to sign up and add the loadout
- **FR-005**: System MUST render gear items using the existing GearCard component with all visual features (images, brand, weight, category badges)
- **FR-006**: System MUST open GearDetailModal when a user clicks on a gear card
- **FR-007**: System MUST group and sort gear items by category
- **FR-008**: System MUST show standard app navigation for signed-in users viewing shared loadouts
- **FR-009**: System MUST indicate which items the signed-in viewer already owns
- **FR-010**: System MUST allow signed-in users to add unowned items to their inventory with "wishlist" status, copying available fields and storing a reference link to the source shared loadout
- **FR-011**: System MUST display the owner's profile modal when their avatar is clicked
- **FR-012**: System MUST create a notification for the loadout owner when a new comment is posted
- **FR-013**: System MUST respect user privacy settings when displaying profile information to other users
- **FR-014**: System MUST automatically create a copy of the shared loadout (with items as wishlist status) when a user completes signup/signin from a shared loadout CTA

### Key Entities

- **SharedLoadout**: The loadout being shared, containing name, description, seasons, activity types, and items
- **LoadoutOwner**: The user who created and shared the loadout, with avatar and profile information
- **GearItem**: Individual gear items within the loadout, with full detail information
- **WishlistItem**: A gear item added to a user's inventory with wishlist status, containing copied fields (name, brand, image, category, weight) plus a reference link to the source shared loadout
- **CommentNotification**: A notification entity linking a comment to the loadout owner's notification feed

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Anonymous visitors can view shared loadouts with full gear detail functionality within 3 seconds of page load
- **SC-002**: 90% of anonymous visitors see the signup CTA within 5 seconds of viewing a shared loadout (above-fold placement)
- **SC-003**: Gear cards render with the same visual quality and functionality as the main inventory page
- **SC-004**: Signed-in users can identify owned items within 2 seconds of page load through clear visual indicators
- **SC-005**: Users can add items to wishlist with single-click interaction and receive confirmation within 1 second
- **SC-006**: Comment notifications appear in the owner's notification feed within 30 seconds of comment submission
- **SC-007**: Owner profile modal loads within 1 second of avatar click

## Clarifications

### Session 2025-12-14

- Q: What data should be copied when adding a shared loadout item to wishlist? → A: Copy available fields (name, brand, image, category, weight) + store reference link to original shared loadout for user context
- Q: What happens when anonymous user signs up from shared loadout CTA? → A: Automatically create a copy of the entire loadout in user's account with all items added as wishlist status

## Assumptions

- The existing ProfileModal component can be reused or adapted for displaying the loadout owner's profile
- The existing GearCard and GearDetailModal components can be reused in the shared loadout context without modification
- The messaging/notification system from Feature 046 is available and can be extended for comment notifications
- Item matching for "owned" detection will use brand + name matching as an initial implementation
- The SharedLoadoutPayload type already contains sufficient information for rendering full gear cards
- Users' privacy settings already exist in the profile system and control what information is publicly visible
