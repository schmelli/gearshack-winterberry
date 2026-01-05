# Feature Specification: Community Hub Enhancements

**Feature Branch**: `056-community-hub-enhancements`
**Created**: 2026-01-04
**Status**: Draft
**Input**: User description: "Community page enhancements including filter bug fix, YouTube sizing, VIP modal profiles, featured videos, admin banner carousel, sidebar spacing, VIP loadouts reorganization, and marketplace activation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Marketplace Browsing (Priority: P1)

As a community member, I want to browse gear items that other users have marked as "for sale", "for trade", or "available to borrow" so that I can find gear I need and connect with sellers/traders.

**Why this priority**: The marketplace is a core value proposition that enables peer-to-peer gear exchange - a primary driver for community engagement and retention.

**Independent Test**: Can be fully tested by navigating to the marketplace tab, viewing gear cards with seller info, filtering/sorting offerings, and initiating a conversation with a seller.

**Acceptance Scenarios**:

1. **Given** I am on the community page, **When** I click the "Marketplace" tab, **Then** I see a grid of gear cards from other users marked as for sale/trade/borrow
2. **Given** I am viewing the marketplace, **When** I filter by "For Sale" only, **Then** I see only items marked as for sale
3. **Given** I am viewing a gear card, **When** I click on the seller's avatar, **Then** I see that user's public profile
4. **Given** I am viewing a gear card, **When** I click the "Message" button, **Then** a conversation is initiated with that user about this item

---

### User Story 2 - Admin Banner Carousel (Priority: P1)

As an admin, I want to create and manage promotional banners that appear at the top of the community page so that I can highlight important announcements, featured posts, and app-related news.

**Why this priority**: A banner carousel provides a high-visibility channel for community communication and engagement, driving users to important content.

**Independent Test**: Can be fully tested by creating a banner in admin, setting its visibility period, previewing it, and verifying it appears in the carousel on the community page.

**Acceptance Scenarios**:

1. **Given** I am an admin on the admin/banners page, **When** I create a new banner with hero image, CTA text, button, and URL, **Then** the banner is saved and scheduled
2. **Given** I have created a banner with start/end dates, **When** the current time is within the visibility window, **Then** the banner appears in the community page carousel
3. **Given** multiple active banners exist, **When** I view the community page, **Then** I see a carousel that auto-rotates through the banners
4. **Given** I am viewing a banner, **When** I click the CTA button, **Then** I am taken to the configured URL (internal or external)

---

### User Story 3 - VIP Profile Modal (Priority: P2)

As a community member, I want to view VIP profiles as quick popup modals rather than navigating to a separate page so that I can quickly learn about VIPs without losing my place in the community.

**Why this priority**: Reduces navigation friction and keeps users engaged on the community page while still providing access to VIP information.

**Independent Test**: Can be fully tested by clicking a VIP name/avatar anywhere on the community pages and seeing a modal with their profile, loadouts, and featured videos.

**Acceptance Scenarios**:

1. **Given** I am on any community page, **When** I click on a VIP's name or avatar, **Then** a modal opens showing their profile information
2. **Given** the VIP modal is open, **When** I click anywhere outside the modal, **Then** the modal closes and I return to my previous view
3. **Given** a VIP has featured videos set by admin, **When** I view their modal profile, **Then** I see a "Featured Videos" section with those videos
4. **Given** the VIP modal is open, **When** I scroll within the modal, **Then** I can see all their loadouts and videos without affecting the page behind

---

### User Story 4 - VIP Loadouts Tab Reorganization (Priority: P2)

As a community member, I want to see only actual VIP loadouts on the VIP Loadouts tab, with reseller loadouts in a separate disabled tab, so that I clearly understand what content is available.

**Why this priority**: Clarity of content categories improves user understanding and sets expectations for upcoming features.

**Independent Test**: Can be fully tested by navigating to the VIP Loadouts page and verifying only VIP loadouts are shown, with a greyed-out "Reseller Loadouts" tab marked "Soon".

**Acceptance Scenarios**:

1. **Given** I am on the community/merchant-loadouts page, **When** I view the tabs, **Then** I see "VIP Loadouts" (active) and "Reseller Loadouts" (greyed out with "Soon" badge)
2. **Given** I am on the VIP Loadouts tab, **When** I view the page title and content, **Then** I only see references to VIP loadouts, not reseller loadouts
3. **Given** the Reseller Loadouts tab is greyed out, **When** I try to click it, **Then** nothing happens and the tab remains unselectable

---

### User Story 5 - Filter Bug Fix (Priority: P2)

As a community member, I want the bulletin board tag filter to work consistently so that I can find posts tagged with specific categories like "Gear Advice".

**Why this priority**: Broken filters degrade user experience and prevent content discovery - a core community function.

**Independent Test**: Can be fully tested by navigating directly to the community page with a filter active, verifying posts with that tag are visible.

**Acceptance Scenarios**:

1. **Given** a post exists with the "gear_advice" tag, **When** I navigate directly to the community page and activate the "Gear Advice" filter, **Then** I see that post in the results
2. **Given** I am on the community page with no filter, **When** I activate a tag filter, **Then** posts with that tag appear correctly
3. **Given** I am on a filtered view, **When** I refresh the page, **Then** the filter state is preserved and results are still correct

---

### User Story 6 - YouTube Embed Sizing (Priority: P3)

As a community member reading posts with YouTube videos, I want the video preview/thumbnail to be reasonably sized so that I can easily scroll past it without excessive scrolling.

**Why this priority**: UI polish item that improves reading experience but doesn't block core functionality.

**Independent Test**: Can be fully tested by viewing a post with an embedded YouTube video and confirming the preview is compact and scrollable.

**Acceptance Scenarios**:

1. **Given** a post contains a YouTube link, **When** I view the post, **Then** the YouTube preview is compact (max 300px height) and doesn't dominate the viewport
2. **Given** I am scrolling through posts, **When** I encounter a YouTube preview, **Then** I can scroll past it with a single scroll gesture on desktop

---

### User Story 7 - Sidebar Spacing (Priority: P3)

As a community member, I want the sidebar panels (Friends, Offers, Activity) to have more balanced spacing so that the layout looks professional and organized.

**Why this priority**: Visual polish that improves perceived quality without affecting functionality.

**Independent Test**: Can be fully tested by viewing the community page on desktop and confirming sidebar panels have increased gap spacing.

**Acceptance Scenarios**:

1. **Given** I am viewing the community page on desktop, **When** I look at the sidebar, **Then** the panels have visually balanced spacing (approximately 24px gap instead of 16px)

---

### User Story 8 - Admin Featured Videos for VIPs (Priority: P3)

As an admin, I want to add featured videos to VIP profiles so that I can highlight their best content in their profile modal.

**Why this priority**: Adds value to VIP profiles but depends on the modal being implemented first.

**Independent Test**: Can be fully tested by adding videos to a VIP in admin, then viewing their profile modal and seeing the Featured Videos section.

**Acceptance Scenarios**:

1. **Given** I am an admin viewing a VIP's settings, **When** I add YouTube video URLs to their featured videos list, **Then** those videos are saved
2. **Given** a VIP has featured videos configured, **When** any user views their profile modal, **Then** the Featured Videos section displays those videos

---

### Edge Cases

- What happens when no banners are active? The carousel section is hidden entirely.
- What happens when a marketplace item has no seller avatar? Display a default placeholder avatar.
- What happens when a VIP has no featured videos? The Featured Videos section is hidden in their modal.
- How does the marketplace handle items from blocked/banned users? Items from banned users are not shown.
- What happens when a banner's URL is invalid? The button is still clickable but leads to a 404 or error page (no pre-validation required).
- What happens on mobile for the banner carousel? Carousel adapts to full-width with touch swipe support.

## Requirements *(mandatory)*

### Functional Requirements

#### Marketplace (P1)
- **FR-001**: System MUST display a marketplace page at `/community/marketplace` showing gear items marked as for_sale, can_be_traded, or can_be_borrowed from all users except the current user
- **FR-002**: System MUST display gear cards with item details (name, image, condition, price converted to user's locale currency if for sale) and seller info (avatar, name)
- **FR-003**: Users MUST be able to filter marketplace by listing type (for sale, for trade, for borrow) and sort by date, price, or name
- **FR-003a**: Marketplace MUST use infinite scroll to load listings progressively (consistent with bulletin board pattern)
- **FR-004**: Users MUST be able to click seller avatar to view that user's public profile
- **FR-005**: Users MUST be able to click a "Message" button on gear cards to initiate a conversation about that item
- **FR-006**: System MUST enable the Marketplace tab in CommunityNavTabs (change `enabled: false` to `enabled: true`)

#### Banner Carousel (P1)
- **FR-007**: System MUST display a banner carousel at the top of the community page, above the navigation tabs
- **FR-008**: Each banner MUST contain: hero image, call-to-action text, button text, and target URL (internal or external)
- **FR-009**: Admins MUST be able to create, edit, and delete banners via `/admin/banners` page
- **FR-010**: Admins MUST be able to set visibility start date and end date for each banner
- **FR-011**: System MUST only display banners where current time is within the visibility window
- **FR-012**: Carousel MUST auto-rotate banners every 6 seconds with navigation dots and pause on hover
- **FR-013**: Carousel MUST support manual navigation via arrows and dots

#### VIP Profile Modal (P2)
- **FR-014**: System MUST display VIP profiles in a modal dialog instead of navigating to `/vip/[slug]` page
- **FR-015**: Modal MUST show: avatar, name, bio, social links, loadouts grid, and Featured Videos section
- **FR-016**: Modal MUST close when user clicks outside the modal or presses Escape
- **FR-017**: Existing VIP profile page (`/vip/[slug]`) MUST remain functional for direct URL access and SEO

#### VIP Featured Videos (P2/P3)
- **FR-018**: System MUST store an unlimited array of featured video URLs for each VIP account
- **FR-019**: Admins MUST be able to add/remove featured videos in the VIP admin section
- **FR-020**: VIP profile modal MUST display Featured Videos section if videos exist

#### VIP Loadouts Reorganization (P2)
- **FR-021**: System MUST show only VIP loadouts on the `/community/merchant-loadouts` page (not reseller loadouts)
- **FR-022**: System MUST add a secondary tab "Reseller Loadouts" that is greyed out with "Soon" badge
- **FR-023**: Page title and description MUST reference only VIP loadouts, not reseller content

#### Filter Bug Fix (P2)
- **FR-024**: System MUST correctly load and display filtered posts when navigating to the community page with an active tag filter
- **FR-025**: Filter state MUST persist via URL query parameters (enabling shareable/bookmarkable filtered views)

#### YouTube Embed Sizing (P3)
- **FR-026**: YouTube preview component MUST limit max-height to 300px while maintaining 16:9 aspect ratio
- **FR-027**: YouTube preview MUST be responsive and work within the post card constraints

#### Sidebar Spacing (P3)
- **FR-028**: CommunitySidebar component MUST use increased spacing (24px gap) between panels

### Key Entities

- **Banner**: Promotional content displayed in the community page carousel
  - hero_image_url, cta_text, button_text, target_url, visibility_start, visibility_end, display_order, created_by

- **VipAccount** (extension): Add featured_video_urls array field

- **GearItem** (existing): Already has is_for_sale, can_be_traded, can_be_borrowed fields for marketplace integration

- **MarketplaceListing** (view/query): Query combining gear_items with user profile data for marketplace display

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can browse marketplace and view all available gear offerings within 3 seconds of page load
- **SC-002**: Users can initiate a conversation with a seller in under 2 clicks from viewing a gear card
- **SC-003**: Admins can create and publish a banner in under 3 minutes
- **SC-004**: VIP profile modal loads within 1 second of clicking VIP name/avatar
- **SC-005**: Tag filter on bulletin board correctly displays filtered posts 100% of the time when filter is active
- **SC-006**: Marketplace tab becomes accessible to all authenticated users
- **SC-007**: Banner carousel displays on community page for all authenticated users when active banners exist
- **SC-008**: 100% of YouTube previews in posts fit within viewport without requiring excessive scrolling

## Clarifications

### Session 2026-01-04

- Q: How should marketplace prices be displayed? → A: Convert all prices to user's locale currency for consistent comparison
- Q: What timing should the banner carousel use for auto-rotation? → A: 6 seconds per slide
- Q: How many featured videos can admins add per VIP? → A: Unlimited (admin discretion)
- Q: How should filter state persist across page refreshes? → A: URL query parameters (shareable, bookmarkable)
- Q: How should the marketplace handle loading many listings? → A: Infinite scroll (consistent with bulletin board)

## Assumptions

- Existing messaging system from Feature 046 can be reused for marketplace conversations
- VIP accounts table already exists from Feature 052 and can be extended with featured_video_urls
- The community announcements banner component exists and can be enhanced or replaced with the carousel
- Users have already set marketplace flags on their gear items (is_for_sale, etc.)
- Mobile responsiveness follows existing responsive patterns in the codebase
- The carousel will use existing UI patterns (shadcn Carousel or similar)
