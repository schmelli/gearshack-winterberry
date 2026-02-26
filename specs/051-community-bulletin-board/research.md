# Research: Community Bulletin Board

**Feature**: 051-community-bulletin-board
**Date**: 2025-12-29
**Status**: Complete

## Research Tasks

### 1. Supabase Patterns for Community Content

**Decision**: Use separate `bulletin_posts` and `bulletin_replies` tables with RLS policies based on existing social-graph patterns.

**Rationale**:
- Consistent with existing codebase (see `friend_requests`, `friendships`, `user_follows` tables)
- RLS enables row-level access control without application logic
- Separate tables for posts/replies simplifies indexing and query patterns
- Existing `check_and_increment_rate_limit` RPC can be reused for rate limiting

**Alternatives Considered**:
- Single `bulletin_items` table with type column: Rejected due to complex queries for nested replies and pagination
- NoSQL/JSON storage: Rejected per constitution (Supabase PostgreSQL required)

### 2. Infinite Scroll Implementation

**Decision**: Cursor-based pagination using `created_at` timestamp with `id` as tiebreaker.

**Rationale**:
- More efficient than offset-based for large datasets
- Handles concurrent inserts gracefully (no skipped/duplicated items)
- Supabase supports cursor queries natively with `.lt()` and `.order()`
- Existing patterns in codebase (see `useFriendActivity.ts`)

**Alternatives Considered**:
- Offset pagination (`LIMIT 20 OFFSET 40`): Rejected due to performance degradation at scale and insertion inconsistency
- Keyset pagination on ID only: Rejected because timestamp ordering is required for chronological feed

### 3. Markdown Rendering for Replies

**Decision**: Use `react-markdown` with custom components for shadcn/ui styling, limited subset (bold, italic, links only).

**Rationale**:
- Widely used, well-maintained library
- Can restrict to specific node types for security
- Custom component mapping enables consistent styling
- Spec explicitly limits to bold, italic, links (no images, code blocks, etc.)

**Alternatives Considered**:
- `marked` + `DOMPurify`: More manual setup, less React-native
- Custom parser: Unnecessary complexity for limited markdown subset
- No markdown: Reduced UX for reply formatting

### 4. Rate Limiting Strategy

**Decision**: Supabase RPC function with atomic check-and-increment, counts stored in `user_rate_limits` table.

**Rationale**:
- Existing pattern from social-graph feature (`check_and_increment_rate_limit`)
- Atomic operation prevents race conditions
- Daily reset via PostgreSQL date comparison
- New account detection via profile `created_at` comparison

**Alternatives Considered**:
- Redis-based rate limiting: Additional infrastructure, overkill for current scale
- Application-level counting: Race condition prone, not atomic
- Middleware rate limiting: Doesn't account for per-action limits (posts vs replies)

### 5. Reply Nesting Strategy

**Decision**: Store `parent_reply_id` (nullable) in replies table, client-side tree construction with max depth enforcement.

**Rationale**:
- Simple flat storage in DB (single table scan)
- Client constructs tree from flat list
- Depth > 2 replies automatically "flatten" to level 2 (reply to parent's parent)
- Consistent with spec requirement for max 2 nesting levels

**Alternatives Considered**:
- Materialized path (`1/2/3`): More complex queries for simple 2-level nesting
- Nested set model: Overkill for shallow nesting, complex updates
- Closure table: Excellent for deep trees, unnecessary for 2 levels

### 6. Content Linking (Loadouts/Shakedowns)

**Decision**: Store `linked_content_type` (enum) and `linked_content_id` (UUID) in posts table, fetch preview data on render.

**Rationale**:
- Polymorphic reference pattern used elsewhere in codebase
- Preview data fetched separately to avoid denormalization
- Supports future content types (marketplace items)
- Null values for posts without linked content

**Alternatives Considered**:
- Denormalized preview data: Stale data issues, complex updates
- Separate linking table: Unnecessary for single optional link per post
- URL-based detection: Fragile, doesn't support internal routing

### 7. Soft Archival Implementation

**Decision**: Add `is_archived` boolean column with default `false`, scheduled job sets `true` after 90 days. Direct link access ignores archive flag.

**Rationale**:
- Simple implementation with single boolean check
- Direct link route (`/community/post/[postId]`) fetches regardless of archive status
- Scheduled job can run nightly (Supabase cron or external)
- No data deletion, preserves reply integrity

**Alternatives Considered**:
- Separate archive table: Complex migration, query duplication
- `archived_at` timestamp: Slightly more complex queries for same result
- TTL with hard delete: Violates spec requirement for direct link access

### 8. Search Implementation

**Decision**: PostgreSQL full-text search with `tsvector` column on post content, updated via trigger.

**Rationale**:
- Native Supabase/PostgreSQL capability
- Efficient for keyword search within 500-char posts
- GIN index for fast lookups
- Can combine with tag filter in same query

**Alternatives Considered**:
- Algolia/Typesense: External dependency, cost, overkill for simple content
- ILIKE pattern matching: Poor performance at scale
- Client-side filtering: Doesn't scale, requires full data load

### 9. Notification Integration

**Decision**: Reuse existing notification system via `notifications` table with new types `bulletin_reply`, `bulletin_report_resolved`.

**Rationale**:
- Existing notification infrastructure handles delivery
- Consistent UX with other notification types
- First-3-replies muting implemented in insert logic (track reply count per post)
- No new dependencies

**Alternatives Considered**:
- Separate notification service: Fragmented experience
- Email-only: Missing in-app notifications
- Real-time websockets: Future enhancement, not MVP required

### 10. Report Workflow Integration

**Decision**: New `bulletin_reports` table with status enum (pending, resolved, dismissed), extend existing admin dashboard.

**Rationale**:
- Consistent with moderation patterns elsewhere
- Report count aggregation for priority escalation
- Status field tracks moderator actions
- Reporter anonymity via view that excludes reporter_id for mods

**Alternatives Considered**:
- Generic reports table: Polymorphic adds complexity
- External moderation tool: Integration overhead, cost
- Auto-moderation AI: Future enhancement, not MVP

## Technology Stack Confirmation

All decisions align with constitution requirements:

| Requirement | Implementation |
|-------------|----------------|
| TypeScript strict | All types defined in `types/bulletin.ts` |
| Supabase PostgreSQL | Tables with RLS, triggers, RPC functions |
| shadcn/ui | Card, Button, Dialog, Sheet, Avatar, Badge |
| Tailwind CSS 4 | All styling via utility classes |
| react-hook-form + Zod | Post/Reply forms with validation |
| next-intl | i18n strings for en/de |
| Zustand | Board state management |

## Open Questions Resolved

All technical unknowns have been addressed. No NEEDS CLARIFICATION items remain.
