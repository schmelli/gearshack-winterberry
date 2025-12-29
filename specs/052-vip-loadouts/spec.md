# Feature Specification: VIP Loadouts (Influencer Integration)

**Feature Branch**: `052-vip-loadouts`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "A content curation system where GearShack showcases outdoor influencers' and experts' gear setups by recreating their YouTube/blog loadouts as 'headless' profiles within the platform."

## Summary

VIP Loadouts is a content curation system enabling GearShack to showcase outdoor influencers' and experts' gear setups as browseable, followable profiles. Admins curate VIP content by building loadouts from YouTube videos and blog articles, linking to original sources, and featuring them prominently on the Community page. Users can discover, follow, and copy these expert loadouts as templates for their own gear planning. If an influencer later joins the platform, they can claim their pre-built profile and gain full account access.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover and Browse VIP Loadouts (Priority: P1)

A user visits the Community page to find gear inspiration from trusted outdoor experts. They see a "Featured VIP Loadouts" section showcasing curated loadouts from well-known influencers like Darwin onthetrail, Andrew Skurka, and Dixie (Homemade Wanderlust). The user clicks on a VIP profile to view their gear setup with full attribution to the original content source.

**Why this priority**: Core discovery is the foundation of the feature. Without browseable VIP content, no other functionality provides value. This enables SEO traffic acquisition and delivers immediate value to users seeking expert gear recommendations.

**Independent Test**: Can be fully tested by navigating to Community page and viewing VIP profiles. Delivers value by providing expert gear recommendations with source attribution.

**Acceptance Scenarios**:

1. **Given** a user is on the Community page, **When** the page loads, **Then** they see a "Featured VIP Loadouts" section with at least one VIP profile card showing name, avatar, bio preview, and loadout count
2. **Given** a user clicks on a VIP loadout card, **When** the VIP profile page loads, **Then** they see the full profile with bio, social links, follower count, and a list of loadouts with source attribution
3. **Given** a user views a VIP loadout, **When** viewing the gear list, **Then** each item shows name, weight, and quantity with category groupings and total weight calculations
4. **Given** a VIP is unclaimed, **When** viewing their profile, **Then** a banner displays "This is a curated account featuring content from [VIP Name]"
5. **Given** a VIP loadout has a source URL, **When** viewing the loadout, **Then** a prominent link displays "Based on: [Watch Original Video]" or similar attribution

---

### User Story 2 - Follow VIP and Receive Updates (Priority: P2)

A user finds an influencer whose gear philosophy resonates with them and wants to stay updated when new loadouts are added. They click "Follow" on the VIP profile and receive notifications whenever the GearShack team curates new content for that VIP.

**Why this priority**: Following creates ongoing engagement and retention. Users return to the platform when notified of new content, building habit formation and community connection.

**Independent Test**: Can be tested by following a VIP and verifying the follow relationship is stored. Delivers value by enabling users to track their favorite influencers.

**Acceptance Scenarios**:

1. **Given** a logged-in user views a VIP profile, **When** they click "Follow", **Then** the button changes to "Following" and the follower count increments
2. **Given** a user follows a VIP, **When** an admin publishes a new loadout for that VIP, **Then** the user receives a notification within 5 minutes
3. **Given** a user receives a VIP notification, **When** they click it, **Then** they navigate directly to the new loadout detail page
4. **Given** a user is following a VIP, **When** they view the VIP profile, **Then** they can click "Following" to unfollow and the follower count decrements
5. **Given** a non-logged-in user views a VIP profile, **When** they click "Follow", **Then** they are prompted to sign in or create an account

---

### User Story 3 - Copy VIP Loadout as Template (Priority: P2)

A user planning a similar trip wants to use a VIP's gear list as a starting point. They click "Copy to My Loadout" on a VIP loadout, and the system creates a new loadout in their account with all items added as wishlist items (since they don't own them yet).

**Why this priority**: Copy functionality converts inspiration into actionable planning. It drives users into the core loadout management features and provides clear value for gear acquisition planning.

**Independent Test**: Can be tested by copying a VIP loadout and verifying items appear in user's wishlist. Delivers value by giving users a curated starting point for gear planning.

**Acceptance Scenarios**:

1. **Given** a logged-in user views a VIP loadout, **When** they click "Copy to My Loadout", **Then** a confirmation modal appears asking "Create a loadout based on [VIP Name]'s [Loadout Name]?"
2. **Given** a user confirms the copy action, **When** the operation completes, **Then** a new loadout is created in their account with the VIP loadout's name as a prefix
3. **Given** a loadout is copied, **When** viewing the new loadout, **Then** all gear items from the VIP loadout appear as wishlist status items (not owned inventory)
4. **Given** a non-logged-in user views a VIP loadout, **When** they click "Copy to My Loadout", **Then** they are prompted to sign in or create an account with messaging "Create a free account to copy this loadout"

---

### User Story 4 - Admin Creates VIP Account and Loadouts (Priority: P1)

A GearShack admin watches a new gear video from a popular influencer and wants to add it to the platform. They access the admin dashboard, create or select the VIP account, and build a loadout by searching the gear database, adding items, specifying weights and notes, and linking to the original source video.

**Why this priority**: Admin curation is the content engine for this feature. Without efficient admin tools to create and manage VIP content, the feature cannot launch or grow.

**Independent Test**: Can be tested by an admin creating a VIP account and loadout via the admin dashboard. Delivers value by enabling content curation workflow.

**Acceptance Scenarios**:

1. **Given** an admin accesses the admin dashboard, **When** they navigate to VIP Management, **Then** they see a list of existing VIP accounts and an "Add New VIP" button
2. **Given** an admin creates a new VIP, **When** they complete the form, **Then** they must provide name, bio, avatar URL, and at least one social link (YouTube, Instagram, or website)
3. **Given** an admin creates a loadout for a VIP, **When** they fill the form, **Then** they must provide loadout name, source URL (required), description, and at least one gear item
4. **Given** an admin adds gear to a VIP loadout, **When** they search the database, **Then** they can add existing items or create new ones on-the-fly if not found
5. **Given** an admin publishes a VIP loadout, **When** publication completes, **Then** all followers of that VIP are notified and the loadout appears on the Community page
6. **Given** an admin wants to feature a VIP, **When** they toggle "Featured" status, **Then** that VIP appears in the "Featured VIP Loadouts" section on the Community page

---

### User Story 5 - Compare User Loadout to VIP Loadout (Priority: P3)

A user wants to optimize their gear by comparing their loadout to an expert's setup. They open one of their loadouts, click "Compare to VIP", select a VIP loadout, and see a side-by-side comparison highlighting weight differences, unique items, and category breakdowns.

**Why this priority**: Comparison is an advanced feature that enhances engagement but isn't required for core value. Users must first discover and follow VIPs before comparison becomes relevant.

**Independent Test**: Can be tested by comparing a user loadout to a VIP loadout and verifying the comparison view renders correctly. Delivers value by helping users identify gear optimization opportunities.

**Acceptance Scenarios**:

1. **Given** a user views their own loadout, **When** they click "Compare to VIP", **Then** a modal appears with a searchable list of VIP loadouts
2. **Given** a user selects a VIP loadout to compare, **When** the comparison view loads, **Then** both loadouts appear side-by-side with base weights displayed prominently
3. **Given** a comparison is displayed, **When** viewing the summary, **Then** the user sees weight difference, count of unique items per loadout, and category-by-category breakdown
4. **Given** a user views items the VIP has that they don't, **When** they click on an item, **Then** they can add it directly to their wishlist
5. **Given** a user creates a comparison, **When** they click "Save Comparison", **Then** the comparison is saved with a custom name for future reference

---

### User Story 6 - VIP Claims Account (Priority: P3)

An influencer whose content has been curated on GearShack decides to claim their profile. They receive an invitation from the GearShack team, verify their identity through email and social media confirmation, and gain full account ownership with all existing followers and loadouts preserved.

**Why this priority**: Account claiming is a growth feature for eventual VIP engagement. Most VIPs will remain unclaimed indefinitely, making this lower priority for MVP.

**Independent Test**: Can be tested by simulating the claim flow with verification steps. Delivers value by enabling influencers to take ownership and engage directly with their audience.

**Acceptance Scenarios**:

1. **Given** an admin initiates a claim invitation, **When** the VIP receives the email, **Then** they see a personalized link to "Claim Your GearShack Account"
2. **Given** a VIP clicks the claim link, **When** they complete email verification, **Then** they must also verify via a social media post or DM confirmation
3. **Given** a VIP completes verification, **When** their account is claimed, **Then** their profile badge changes from "Curated Account" to "Verified VIP"
4. **Given** a VIP claims their account, **When** verification completes, **Then** all existing followers are notified "[VIP Name] joined GearShack!"
5. **Given** a claimed VIP logs in, **When** they access their profile, **Then** they can edit bio, add new loadouts, send messages, and participate in community features

---

### User Story 7 - Search and Filter VIPs (Priority: P2)

A user is looking for gear recommendations specific to a trail or activity type. They use search and filter options on the Community page to find VIPs who have loadouts matching their interests (e.g., "PCT", "winter camping", "ultralight").

**Why this priority**: Search/filter enhances discoverability as the VIP catalog grows. Essential for users with specific needs to find relevant content.

**Independent Test**: Can be tested by searching for a VIP by name or filtering by trip type. Delivers value by enabling targeted discovery.

**Acceptance Scenarios**:

1. **Given** a user is on the Community page, **When** they enter a VIP name in the search box, **Then** matching VIP profiles appear with name highlighting
2. **Given** a user searches by trip type or keyword, **When** results load, **Then** VIPs with loadouts matching that term appear
3. **Given** search results are displayed, **When** viewing a VIP card, **Then** the relevant loadout that matched the search is highlighted
4. **Given** no VIPs match the search, **When** results are empty, **Then** a helpful message suggests broadening search criteria

---

### User Story 8 - Bookmark VIP Loadouts (Priority: P3)

A user finds several VIP loadouts they want to reference later without committing to copying them. They bookmark these loadouts and can access them from their profile's "Saved Loadouts" section.

**Why this priority**: Bookmarking is a convenience feature that enhances user experience but isn't critical for core value delivery.

**Independent Test**: Can be tested by bookmarking a VIP loadout and verifying it appears in saved items. Delivers value by enabling lightweight curation of reference material.

**Acceptance Scenarios**:

1. **Given** a logged-in user views a VIP loadout, **When** they click the bookmark icon, **Then** the loadout is saved and the icon changes to indicate saved state
2. **Given** a user has bookmarked loadouts, **When** they visit their profile's "Saved Loadouts" section, **Then** all bookmarked VIP loadouts appear with VIP attribution
3. **Given** a user views a saved loadout, **When** they click the bookmark icon again, **Then** the loadout is removed from their saved items

---

### Edge Cases

- What happens when a VIP loadout is deleted by admin while users have it bookmarked? System should remove bookmark and optionally notify affected users.
- How does the system handle VIP accounts with no loadouts? VIP profiles should only appear in search if they have at least one published loadout.
- What happens when an admin tries to create a VIP with a name that already exists? System should warn and suggest using the existing VIP or creating a unique variation.
- How does source URL validation work? System should accept YouTube, Vimeo, Instagram, and common blog platforms; reject invalid or non-content URLs. If source becomes unavailable post-publish, display "Source unavailable" badge, keep loadout visible, and notify admin.
- What happens if a VIP claim verification fails? System should provide clear retry instructions and admin notification for manual review.
- How does the system handle VIPs who request removal of their curated content? System archives VIP within 48 hours, notifies followers, retains data 30 days for appeals, then permanently deletes.

## Requirements *(mandatory)*

### Functional Requirements

#### VIP Account Management (Admin)

- **FR-001**: System MUST allow admins to create new VIP accounts with required fields: name, bio, avatar URL, and at least one social link
- **FR-002**: System MUST allow admins to edit VIP account details at any time
- **FR-003**: System MUST allow admins to archive VIP accounts within 48 hours of a valid takedown request, notify affected followers, and retain archived data for 30 days to allow appeals before permanent deletion
- **FR-004**: System MUST allow admins to mark VIP accounts as "Featured" for homepage promotion
- **FR-005**: System MUST display VIP accounts as either "Curated Account" (unclaimed) or "Verified VIP" (claimed)

#### VIP Loadout Management (Admin)

- **FR-006**: System MUST allow admins to create loadouts for VIP accounts
- **FR-007**: System MUST require source URL (YouTube, blog, etc.) for every VIP loadout
- **FR-007a**: System MUST display "Source unavailable" badge on loadouts when source URL becomes inaccessible, keep loadout visible, and notify admin for review
- **FR-008**: System MUST allow admins to search the gear database when adding items to VIP loadouts
- **FR-009**: System MUST allow admins to create new gear items on-the-fly if not found in database
- **FR-010**: System MUST allow admins to specify weight, quantity, and notes for each item in a VIP loadout
- **FR-011**: System MUST allow admins to edit or delete VIP loadouts at any time
- **FR-012**: System MUST automatically notify all VIP followers when a new loadout is published

#### VIP Discovery (User)

- **FR-013**: System MUST display a "Featured VIP Loadouts" section on the Community page
- **FR-014**: System MUST allow users to search VIPs by name
- **FR-015**: System MUST allow users to search VIP loadouts by trip type, trail name, or keywords
- **FR-016**: System MUST display VIP profiles with bio, social links, follower count, and loadout count
- **FR-017**: System MUST display source attribution (video/blog link) prominently on every VIP loadout
- **FR-018**: System MUST generate SEO-friendly URLs for VIP profiles and loadouts (e.g., `/vip/darwin-onthetrail/pct-2022`)

#### Following & Notifications

- **FR-019**: System MUST allow logged-in users to follow VIP accounts
- **FR-020**: System MUST allow users to unfollow VIP accounts at any time
- **FR-021**: System MUST send notifications to followers when new VIP loadouts are published
- **FR-022**: System MUST display follower count on VIP profiles (but not expose follower list for privacy)

#### Loadout Interaction

- **FR-023**: System MUST allow logged-in users to copy VIP loadouts as templates to their own account
- **FR-024**: System MUST add copied items as wishlist status (not owned inventory)
- **FR-025**: System MUST allow users to compare their loadouts to VIP loadouts with side-by-side view
- **FR-026**: System MUST allow users to bookmark VIP loadouts for future reference
- **FR-027**: System MUST generate shareable links for VIP loadouts with social media preview cards

#### VIP Claiming

- **FR-028**: System MUST allow admins to send claim invitations to VIPs via email
- **FR-029**: System MUST require identity verification (email + social media confirmation) for claiming
- **FR-030**: System MUST transfer all followers and loadouts to claimed VIP accounts
- **FR-031**: System MUST grant claimed VIPs full account capabilities (messaging, loadout management, community participation)
- **FR-032**: System MUST notify all followers when a VIP claims their account

### Key Entities

- **VIP Account**: Represents an influencer profile with name, bio, avatar, social links, verification status (curated/claimed), and featured flag. When claimed, links to User entity via foreign key (VIP entity preserved; User gains edit access to VIP profile and loadouts).
- **VIP Loadout**: A gear list attributed to a VIP with name, description, source URL, trip type, date range, visibility status, and creation metadata. Contains loadout items.
- **VIP Loadout Item**: An item in a VIP loadout with reference to gear item, weight (from video), quantity, and notes specific to how the VIP uses it.
- **VIP Follow**: Relationship between a user and a VIP account for notification delivery.
- **VIP Bookmark**: Relationship between a user and a VIP loadout for saved reference.
- **Claim Invitation**: Admin-initiated invitation with unique token, expiration, and verification status tracking.

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### Content & Curation

- **SC-001**: 50 VIP accounts created within 6 months of launch (top outdoor influencers)
- **SC-002**: 150 total VIP loadouts created (average 3 per VIP)
- **SC-003**: New loadouts from featured VIPs published within 7 days of source content release

#### User Engagement

- **SC-004**: 50% of active users follow at least one VIP within 3 months
- **SC-005**: Average 200 views per VIP loadout per month
- **SC-006**: 15% of VIP loadout viewers copy loadout to their account

#### Discovery & Traffic

- **SC-007**: 20% of organic traffic arrives via "[Name] gear list" search queries
- **SC-008**: 100 external social shares of VIP loadouts per month
- **SC-009**: 50 quality backlinks from gear blogs/forums within 6 months

#### Conversion & Retention

- **SC-010**: Users who interact with VIP content add 5+ items to wishlist on average
- **SC-011**: 30% of VIP loadout viewers use the comparison feature
- **SC-012**: Users who follow VIPs have 70% 30-day retention rate (vs. 60% baseline)

#### VIP Engagement

- **SC-013**: 20% of invited VIPs claim their accounts within first year
- **SC-014**: 80% of claimed VIPs add at least one new loadout within 90 days of claiming

### Performance Requirements

- **SC-015**: VIP profile and loadout pages load in under 1 second
- **SC-016**: Loadout comparison view generates in under 2 seconds
- **SC-017**: Follower notifications delivered within 5 minutes of loadout publication

## Assumptions

1. **Legal/Rights**: GearShack has sufficient rights to use influencer names and publicly available photos under fair use or with implicit permission through source attribution
2. **Influencer Reception**: Influencers will not object to curated accounts as they provide free promotion with proper attribution
3. **Source Attribution**: Linking to original content is sufficient attribution for using influencer content as reference
4. **Infrastructure Exists**: Loadout system, gear database, Social Graph (Feature 001), and admin dashboard are functional and available for integration
5. **Unclaimed Majority**: Most VIP accounts will remain unclaimed indefinitely; the feature provides value regardless of claim rate
6. **Notification System**: Existing notification infrastructure can support VIP-related notification types

## Dependencies

### Required (Must exist before implementation)

- **Loadout System**: For creating and managing VIP gear lists
- **Gear Inventory Database**: For gear items, specs, and photos referenced in VIP loadouts
- **Social Graph (Feature 001)**: For follow/unfollow functionality
- **Admin Dashboard**: For VIP management interface

### Optional (Enhances but not required)

- **Marketplace (Feature 003)**: Could link VIP gear items to marketplace listings
- **Community Shakedowns (Feature 004)**: VIP loadouts could be used as shakedown templates

## Out of Scope

- **Automatic video scraping**: Admins manually curate all content (no AI auto-generation)
- **VIP payments/revenue sharing**: No financial relationship with influencers
- **Exclusive content**: VIPs can post same content elsewhere
- **VIP-only forums**: No special discussion areas for VIPs
- **Live Q&A/video calls**: No integrated live events
- **Affiliate revenue**: VIP loadouts don't generate commissions in this phase
- **User nominations**: Only admins can create VIP accounts (no community nominations)

## Clarifications

### Session 2025-12-29

- Q: How should takedown/removal requests from VIPs be handled? → A: Archive VIP within 48 hours of valid request, notify followers, retain data 30 days for appeals
- Q: How should VIP Account link to User when claimed? → A: Link VIP Account to User via foreign key; VIP entity preserved, User gains edit access
- Q: How to handle unavailable source URLs? → A: Keep loadout visible with "Source unavailable" badge; notify admin for review

## Future Considerations

- Merchant integration for "Buy this gear" linking
- Gear affiliate program with VIP revenue sharing
- Trip reports and post-trip follow-ups by claimed VIPs
- VIP courses and paid educational content
- Auto-notifications when VIPs post new videos
- VIP leaderboards (most followed, most copied)
- Video embedding within loadout pages
- Gear evolution tracking across VIP loadouts over time
