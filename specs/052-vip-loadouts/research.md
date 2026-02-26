# Research: VIP Loadouts (Feature 052)

**Date**: 2025-12-29
**Feature**: VIP Loadouts (Influencer Integration)
**Status**: Complete

## Overview

This document captures research decisions made during Phase 0 planning. All technical context items from plan.md have been resolved - no NEEDS CLARIFICATION markers remained due to the constitution providing clear technology constraints.

---

## 1. Database Schema Design

### Decision
Use Supabase PostgreSQL with dedicated VIP tables, leveraging existing `profiles` table for user linking and `gear_items` table for loadout items.

### Rationale
- Constitution mandates Supabase (PostgreSQL) for database
- Existing Social Graph (Feature 001) uses `user_follows` table pattern - VIP follows should mirror this
- Existing loadouts table structure provides template for VIP loadouts
- RLS policies ensure proper access control for public VIP content vs admin-only mutations

### Alternatives Considered
- **Extending existing loadouts table with VIP flag**: Rejected - would complicate RLS policies and queries, VIP loadouts have different ownership semantics
- **Separate VIP microservice**: Rejected - over-engineering for MVP scale, adds deployment complexity

---

## 2. VIP Account to User Linking (Claiming)

### Decision
VIP Account entity has optional `claimed_by_user_id` foreign key to `profiles.id`. When claimed, VIP entity preserved; User gains edit access via RLS policy check.

### Rationale
- Per clarification session: "Link VIP Account to User via foreign key; VIP entity preserved, User gains edit access"
- Preserves VIP's SEO-friendly URLs and follower relationships
- Simpler than data migration/merge approach
- User can have regular profile AND VIP profile (different contexts)

### Alternatives Considered
- **Merge VIP into User on claim**: Rejected - requires complex data migration, loses VIP entity identity
- **Dual entities with manual sync**: Rejected - creates data consistency risks

---

## 3. Source URL Validation Strategy

### Decision
Client-side URL pattern validation on admin form submission. No active link checking at creation time. Background job checks source availability weekly; marks unavailable with badge.

### Rationale
- Per clarification: "Keep loadout visible with 'Source unavailable' badge; notify admin for review"
- Active checking at creation would slow admin workflow
- Weekly background check catches dead links without blocking content creation
- Badge approach maintains content value even when source disappears

### Alternatives Considered
- **Real-time URL health check on save**: Rejected - YouTube/blog pages may be slow, would frustrate admin
- **Remove loadout if source dies**: Rejected - gear list still valuable even without video

### Implementation Pattern
```typescript
// Validation patterns for common platforms
const SOURCE_URL_PATTERNS = {
  youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//,
  vimeo: /^https?:\/\/(www\.)?vimeo\.com\//,
  instagram: /^https?:\/\/(www\.)?instagram\.com\//,
  blog: /^https?:\/\// // Generic HTTPS
};
```

---

## 4. Follow/Unfollow Integration with Social Graph

### Decision
Create `vip_follows` table separate from `user_follows`. Reuse existing follow button patterns and notification infrastructure.

### Rationale
- Social Graph (Feature 001) designed for user-to-user following
- VIP accounts are not users (until claimed), so different relationship
- Notification system can handle VIP-specific notification types
- Separate table enables VIP-specific queries without filtering

### Pattern
```sql
-- vip_follows mirrors user_follows structure
CREATE TABLE vip_follows (
  follower_id UUID REFERENCES profiles(id),
  vip_id UUID REFERENCES vip_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, vip_id)
);
```

---

## 5. SEO-Friendly URL Structure

### Decision
Use slug-based routing: `/vip/[vip-slug]/[loadout-slug]`

### Rationale
- Spec requires SEO optimization for "[Name] gear list" searches
- Slug format: lowercase, hyphenated (e.g., `darwin-onthetrail`)
- Loadout slugs include trip info (e.g., `pct-2022`)
- Next.js App Router supports this via dynamic segments

### URL Examples
- VIP Profile: `/en/vip/darwin-onthetrail`
- VIP Loadout: `/en/vip/darwin-onthetrail/pct-2022`
- Search: `/en/vip?q=ultralight`
- Comparison: `/en/vip/compare?left=loadout-id&right=vip-loadout-id`

---

## 6. Admin Dashboard Integration

### Decision
Add VIP Management section to existing admin dashboard at `/admin/vip`.

### Rationale
- Constitution requires admin dashboard integration
- Existing admin patterns provide consistent UX
- Centralized admin access control already exists

### Pages
- `/admin/vip` - VIP list with search, featured toggle, archive actions
- `/admin/vip/new` - Create new VIP account
- `/admin/vip/[id]` - Edit VIP account details
- `/admin/vip/[id]/loadouts` - Manage VIP's loadouts
- `/admin/vip/[id]/loadouts/new` - Create loadout for VIP
- `/admin/vip/claims` - Claim invitation management

---

## 7. Loadout Comparison Algorithm

### Decision
Client-side comparison using existing loadout data structures. Calculate diffs by category and item.

### Rationale
- Comparison is read-only operation - no server-side state needed
- User's loadout already loaded; VIP loadout fetched on demand
- Weight calculations reuse existing loadout weight utilities
- O(n) comparison acceptable for typical loadout sizes (20-50 items)

### Comparison Metrics
1. **Total weight difference**: User base weight - VIP base weight
2. **Category breakdown**: Per-category weight comparison
3. **Unique items**: Items in one loadout but not other (by catalog_product_id or name match)
4. **Common items**: Items in both loadouts (potential weight optimization opportunities)

---

## 8. Notification Integration

### Decision
Add VIP notification types to existing notification system: `vip_new_loadout`, `vip_claimed`.

### Rationale
- Existing notification infrastructure handles delivery timing (<5 min requirement)
- Notification table already supports polymorphic types
- Push notification preferences already managed per user

### Notification Types
```typescript
type VipNotificationType =
  | 'vip_new_loadout'     // VIP published new loadout
  | 'vip_claimed'         // VIP you follow claimed their account
  | 'vip_archived';       // VIP you follow was archived (takedown)
```

---

## 9. Internationalization (i18n)

### Decision
Use next-intl for all VIP UI strings. VIP names and bios stored in English (not translated).

### Rationale
- Constitution mandates next-intl
- VIP names are proper nouns - shouldn't be translated
- UI chrome (buttons, labels, headers) uses translation keys
- Loadout descriptions may be English-only initially (admin-created content)

### Translation Keys Location
- `messages/en/vip.json` - VIP-specific English strings
- `messages/de/vip.json` - German translations

---

## 10. Copy to Loadout Implementation

### Decision
Deep copy VIP loadout items to new user loadout with wishlist status. Preserve item references, not item data.

### Rationale
- Per spec: "Copied items added to user's wishlist (not inventory)"
- Reference by gear_item_id maintains data consistency
- New loadout gets user's ownership with VIP loadout name as prefix
- User can then mark items as owned as they acquire them

### Copy Flow
1. Create new loadout for user with name: `[VIP Name]'s [Loadout Name] - Copy`
2. Copy all loadout_items with status = 'wishlist'
3. Set source_vip_loadout_id for attribution
4. Navigate user to their new loadout

---

## Dependencies Verified

| Dependency | Status | Notes |
|------------|--------|-------|
| Loadout System | ✅ Exists | `loadouts` and `loadout_items` tables available |
| Gear Inventory | ✅ Exists | `gear_items` and `catalog_products` tables available |
| Social Graph | ✅ Exists | Feature 001 provides follow patterns and notification integration |
| Admin Dashboard | ✅ Exists | `/admin` routes with role-based access control |
| Notification System | ✅ Exists | `notifications` table with type-based handling |

---

## Open Questions (Deferred to Implementation)

None - all critical decisions resolved.
