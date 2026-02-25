# Feature Specification: Community Bulletin Board

**Feature Branch**: `051-community-bulletin-board`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "A lightweight, chronological message board where registered GearShack users can post quick questions, share updates, and connect with the community—like the bulletin board at your local outdoor shop."

## Clarifications

### Session 2025-12-29

- Q: When a user visits the bulletin board and there are no posts yet, what should they see? → A: Show welcoming empty state with "Be the first to post!" CTA button
- Q: What should happen to posts older than 90 days? → A: Soft archive (hide from feed, keep in database, accessible via direct link)

## Overview

A simple, ephemeral message board that mirrors the cork board at outdoor shops. Users can post brief messages (500 characters max) to ask for gear advice, announce shakedown requests, seek trade partners, or share trip planning tips. The board prioritizes simplicity with chronological ordering (no voting/ranking) and optional category tags for filtering.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Post a Quick Question (Priority: P1)

As a GearShack user planning a trip, I want to post a quick question to the community so that I can get advice from experienced outdoor enthusiasts.

**Why this priority**: This is the core value proposition—enabling community Q&A. Without posting, the bulletin board has no content. This delivers immediate value as a standalone MVP.

**Independent Test**: Can be fully tested by creating a post with content and optional tag, verifying it appears at the top of the board, and confirming the author sees their post immediately.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the Community page, **When** they click "New Post" and enter text (≤500 chars), **Then** the post appears at the top of the bulletin board within 2 seconds
2. **Given** a user composing a post, **When** they type beyond 450 characters, **Then** the character counter turns red as a warning
3. **Given** a user composing a post, **When** they select a category tag (Question, Shakedown, Trade, Trip Planning, Gear Advice, Other), **Then** the tag badge displays on the published post
4. **Given** a user viewing their own post, **When** they access the post menu within 15 minutes, **Then** they can edit the post content

---

### User Story 2 - Browse and Reply to Posts (Priority: P1)

As a community member, I want to browse recent posts and reply to help others so that I can contribute knowledge and connect with fellow outdoor enthusiasts.

**Why this priority**: Equal to posting—without replies, posts have no value. Browsing and replying enables community interaction and is essential for a functioning board.

**Independent Test**: Can be fully tested by loading the board, scrolling through posts, expanding a post to view replies, and submitting a reply that appears immediately.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the Bulletin Board, **When** the page loads, **Then** 20 most recent posts display in reverse chronological order within 1 second
2. **Given** a user viewing the board, **When** they scroll to the bottom, **Then** the next 20 older posts load automatically (infinite scroll)
3. **Given** a user clicking on a post, **When** the post expands, **Then** all existing replies are visible with author, timestamp, and content
4. **Given** a user typing a reply, **When** they click "Send Reply" or press Ctrl+Enter, **Then** the reply appears immediately under the post
5. **Given** a post author, **When** someone replies to their post (first 3 replies), **Then** they receive a notification

---

### User Story 3 - Filter Posts by Category (Priority: P2)

As a user looking for specific content, I want to filter posts by category tag so that I can quickly find relevant discussions (e.g., only Trade posts or Trip Planning posts).

**Why this priority**: Enhances discoverability but not essential for MVP. Users can browse chronologically without filtering.

**Independent Test**: Can be fully tested by selecting a tag filter and verifying only posts with that tag appear.

**Acceptance Scenarios**:

1. **Given** a user viewing the board, **When** they select "Trip Planning" filter, **Then** only posts tagged "Trip Planning" are displayed
2. **Given** a user with an active filter, **When** they clear the filter, **Then** all posts display in chronological order
3. **Given** a user searching by keyword, **When** they enter search text, **Then** posts containing that keyword in content are displayed within 2 seconds

---

### User Story 4 - Share Loadout/Shakedown to Board (Priority: P2)

As a user who completed a loadout or shakedown, I want to share it to the bulletin board so that I can get community feedback and showcase my gear setup.

**Why this priority**: Drives cross-feature engagement but requires shakedowns/loadouts to exist. Not essential for MVP bulletin board functionality.

**Independent Test**: Can be tested by navigating to a loadout, clicking "Share to Community", and verifying a pre-filled post with link preview appears on the board.

**Acceptance Scenarios**:

1. **Given** a user on their loadout page, **When** they click "Share to Community", **Then** a pre-filled post appears with loadout details and attached link
2. **Given** a shared loadout post, **When** another user clicks the link preview, **Then** they navigate to the full loadout page
3. **Given** a shared loadout post on the board, **When** displayed, **Then** it shows a visual card preview with key details (base weight, item count, thumbnail)

---

### User Story 5 - Report Inappropriate Content (Priority: P2)

As a community member, I want to report spam or inappropriate posts so that the community remains safe and on-topic.

**Why this priority**: Essential for community health but can be added after core posting/replying works. Initial launch can rely on manual moderation.

**Independent Test**: Can be tested by clicking report on a post, selecting a reason, and verifying the report is submitted with confirmation toast.

**Acceptance Scenarios**:

1. **Given** a user viewing any post, **When** they click the three-dot menu and select "Report Post", **Then** a modal appears with report reason options
2. **Given** a user in the report modal, **When** they select a reason (Spam, Harassment, Off-topic, Other) and submit, **Then** confirmation appears and the post is flagged for moderators
3. **Given** multiple users reporting the same post, **When** reports accumulate (>5), **Then** the report is escalated to high priority for moderators

---

### User Story 6 - Moderator Review Workflow (Priority: P3)

As a moderator, I want to review reported posts and take action so that I can maintain community standards and remove harmful content.

**Why this priority**: Admin functionality that supports the reporting system. Can be implemented after user-facing features are complete.

**Independent Test**: Can be tested by logging into admin panel, viewing reported posts sorted by report count, and taking action (delete, warn, ban).

**Acceptance Scenarios**:

1. **Given** a moderator in the admin panel, **When** they view "Bulletin Board Reports", **Then** flagged posts appear sorted by report count (highest first)
2. **Given** a moderator reviewing a reported post, **When** they select "Delete Post" and "Warn User", **Then** the post is removed from the board and the user receives an email notification
3. **Given** a banned user, **When** they access the bulletin board, **Then** they can read posts but cannot create posts or replies

---

### User Story 7 - Delete Own Post (Priority: P3)

As a post author, I want to delete my own posts so that I can remove content I no longer want visible.

**Why this priority**: User control feature. Core posting works without deletion capability initially.

**Independent Test**: Can be tested by creating a post, accessing the post menu, selecting delete, and confirming the post is removed (or shows "[Deleted]" if replies exist).

**Acceptance Scenarios**:

1. **Given** a user viewing their own post (no replies), **When** they select "Delete Post" from the menu, **Then** the post is completely removed from the board
2. **Given** a user viewing their own post (with replies), **When** they delete, **Then** the post shows "[Post deleted by user]" but replies remain visible

---

### Edge Cases

- What happens when the bulletin board has no posts (empty state)? → Show welcoming message with "Be the first to post!" CTA button
- What happens when a user tries to post more than 10 posts in one day? → Rate limit error displayed, post blocked
- What happens when a new account (<7 days) tries to exceed 3 posts/day? → Stricter rate limit enforced with clear message
- What happens when duplicate content is posted within 1 hour? → Post blocked with "You already posted this" message
- How does the system handle a post with exactly 500 characters? → Accepted; counter shows 500/500 (not red)
- What happens when a user replies to a deleted post? → Reply button is disabled; "Post deleted" shown
- How are nested replies (reply to a reply) handled beyond 2 levels? → Replies flatten to 2 levels max

## Requirements *(mandatory)*

### Functional Requirements

**Posting & Content**
- **FR-001**: System MUST allow users to create posts up to 500 characters with real-time character counting
- **FR-002**: System MUST allow users to add optional category tags: Question, Shakedown, Trade, Trip Planning, Gear Advice, Other
- **FR-003**: System MUST allow users to attach links to their loadouts, shakedowns, or marketplace items
- **FR-004**: System MUST allow users to edit their posts within 15 minutes of posting
- **FR-005**: System MUST allow users to delete their own posts at any time
- **FR-006**: System MUST display "[Post deleted by user]" for deleted posts that have replies

**Browsing & Discovery**
- **FR-007**: System MUST display 20 most recent posts on initial page load in reverse chronological order
- **FR-008**: System MUST support infinite scroll loading of older posts (20 at a time)
- **FR-009**: System MUST allow filtering posts by category tag
- **FR-010**: System MUST support keyword search across post content
- **FR-011**: System MUST display post author avatar, name, timestamp, tag badge, reply count, and linked content preview

**Replies & Interaction**
- **FR-012**: System MUST allow users to reply to any post
- **FR-013**: System MUST support markdown formatting in replies (bold, italic, links)
- **FR-014**: System MUST limit reply nesting to 2 levels (reply → reply to reply, then flatten)
- **FR-015**: System MUST notify post authors of the first 3 replies, then mute further notifications
- **FR-016**: System MUST allow users to edit/delete their own replies (same rules as posts)

**Moderation & Safety**
- **FR-017**: System MUST allow users to report posts or replies with predefined reasons (Spam, Harassment, Off-topic, Other)
- **FR-018**: System MUST notify moderators when content is reported
- **FR-019**: System MUST allow moderators to delete posts, warn users, or ban users (1d/7d/permanent)
- **FR-020**: System MUST restrict banned users to read-only mode (can view, cannot post/reply)
- **FR-021**: System MUST track report abuse and warn users who submit false reports

**Rate Limiting (Spam Prevention)**
- **FR-022**: System MUST limit users to 10 posts per day
- **FR-023**: System MUST limit users to 50 replies per day
- **FR-024**: System MUST limit new accounts (<7 days old) to 3 posts per day
- **FR-025**: System MUST block duplicate posts (identical content within 1 hour)

**Access Control**
- **FR-026**: System MUST require authentication to view the bulletin board (login-gated)
- **FR-027**: System MUST associate all posts and replies with user accounts (no anonymous posting)

**Content Lifecycle**
- **FR-028**: System MUST soft-archive posts older than 90 days (hide from feed, retain in database)
- **FR-029**: System MUST keep archived posts accessible via direct link

### Key Entities

- **Post**: A bulletin board entry with content (≤500 chars), author, timestamp, optional tag, optional linked content reference, edit window status, deletion status
- **Reply**: A response to a post or another reply, with content, author, timestamp, parent reference, nesting level (max 2)
- **Report**: A flag on a post/reply with reporter (anonymous to mods), reason category, optional details, timestamp, resolution status
- **PostTag**: Category classification (Question, Shakedown, Trade, Trip Planning, Gear Advice, Other)
- **LinkedContent**: Reference to loadout, shakedown, or marketplace item with preview metadata (thumbnail, title, key stats)

## Success Criteria *(mandatory)*

### Measurable Outcomes

**User Engagement**
- **SC-001**: 15% of monthly active users post at least once within 30 days of launch
- **SC-002**: 60% of posts receive at least 1 reply within 48 hours
- **SC-003**: 70% of posts include a category tag
- **SC-004**: Users spend an average of 4+ minutes per bulletin board session
- **SC-005**: 40% of daily active users visit the bulletin board at least once per day

**Performance**
- **SC-006**: Initial board load (20 posts with avatars and previews) completes in under 1 second
- **SC-007**: Post creation from submit to visible on board takes under 500ms
- **SC-008**: Search results return in under 2 seconds

**Community Health**
- **SC-009**: Less than 2% of posts are reported
- **SC-010**: Average moderation response time under 12 hours for standard reports, under 1 hour for high-priority (>5 reports)

**Cross-Feature Conversion**
- **SC-011**: 70% of linked shakedown/loadout posts receive click-throughs to the full content
- **SC-012**: 30% of "Trade" tagged posts result in at least one direct message between users
- **SC-013**: 10% of users who engage in post replies later add each other as friends (Feature 001 integration)

## Assumptions

1. **User authentication** exists and works reliably for login-gated access
2. **Notification system** from existing infrastructure can deliver reply notifications
3. **Admin moderation tools** framework exists (extended from existing moderation dashboard)
4. **Markdown rendering** library is available for reply formatting (react-markdown or similar)
5. **Profiles and avatars** exist and can be fetched for post author display
6. Users expect and accept chronological ordering (no demand for voting/ranking at MVP)
7. Bulletin board content is **ephemeral** — posts older than 90 days are soft-archived (hidden from feed but retained in database and accessible via direct link)
8. **Social Graph** (Feature 001) integration for friend connections is complete

## Scope Boundaries

### In Scope
- Post creation with 500 char limit and optional tags
- Chronological feed with infinite scroll
- Threaded replies (max 2 levels)
- Tag filtering and keyword search
- Content linking to loadouts/shakedowns/marketplace
- User reporting with moderator review workflow
- Rate limiting for spam prevention
- Edit/delete own content

### Out of Scope
- Voting/upvotes/downvotes (chronological only)
- Sticky/pinned posts
- Rich media uploads (images/videos) — links only
- Post scheduling
- View counts or engagement analytics
- Hashtags (use predefined tags only)
- Multiple boards/subreddits (single unified board)
- Private posts or restricted visibility

## Dependencies

### Required Before Implementation
- User authentication (exists)
- User profiles with avatar display (exists)
- Notification system for reply alerts (exists)
- Moderation dashboard framework (exists, to be extended)

### Optional Enhancements
- Social Graph (Feature 001): Enables "Posts from Friends" filtering (future)
- Shakedowns (Feature 004): Enables shakedown linking (when available)
- Marketplace (Feature 003): Enables trade post linking (when available)
