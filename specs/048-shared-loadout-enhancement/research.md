# Research: Shared Loadout Enhancement

**Feature**: 048-shared-loadout-enhancement
**Date**: 2025-12-14

## Research Questions

### R1: How to detect authentication state in shared loadout page?

**Decision**: Use `@supabase/ssr` server-side auth check in the page component

**Rationale**:
- The page is already a server component (`app/[locale]/shakedown/[token]/page.tsx`)
- Supabase SSR provides `createClient()` which can check `getUser()` on the server
- This allows conditional rendering before sending to client, avoiding hydration flashes

**Alternatives Considered**:
- Client-side auth check with `useEffect` - Rejected: causes layout flash
- Middleware auth - Rejected: page should be accessible to all, just render differently

**Implementation**:
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const isAuthenticated = !!user;
```

---

### R2: How to extend SharedLoadoutPayload for full GearCard rendering?

**Decision**: Extend the existing payload with additional fields during share creation

**Rationale**:
- Current payload lacks `description`, which GearCard needs for detailed view
- Adding fields at share-time means the data is snapshotted (no dependency on owner's current items)
- Backward compatible: existing shares work, new shares have more data

**Alternatives Considered**:
- Fetch full items from gear_items table - Rejected: breaks if owner deletes items
- Store full GearItem objects - Rejected: excessive data, includes private fields

**Implementation**:
Extend `SharedLoadoutPayload.items` to include:
- `description: string | null`
- `nobgImages: NobgImages | null` (for optimized images)

---

### R3: How to implement owned-item matching?

**Decision**: Match by normalized `brand + name` (lowercase, trimmed)

**Rationale**:
- Simple and effective for MVP
- Users expect "same item" means same brand + name
- Case-insensitive handles minor variations
- Can be enhanced later with fuzzy matching

**Alternatives Considered**:
- Match by product URL - Rejected: not all items have URLs
- Match by model number - Rejected: not all items have model numbers
- Fuzzy string matching - Rejected: over-engineering for MVP

**Implementation**:
```typescript
const normalizeForMatch = (brand: string | null, name: string): string =>
  `${(brand || '').toLowerCase().trim()}|${name.toLowerCase().trim()}`;

const ownedSet = new Set(userItems.map(i => normalizeForMatch(i.brand, i.name)));
const isOwned = (item: SharedItem) => ownedSet.has(normalizeForMatch(item.brand, item.name));
```

---

### R4: How to store wishlist source reference?

**Decision**: Add `source_share_token` nullable column to `gear_items` table

**Rationale**:
- Simple schema change, single column addition
- Nullable means existing items unaffected
- Links directly to the share that inspired the wishlist addition
- Enables future features like "View original loadout"

**Alternatives Considered**:
- Separate junction table `wishlist_sources` - Rejected: over-normalized for single reference
- Store in notes field as JSON - Rejected: loses type safety, harder to query
- Store full loadout copy - Rejected: data duplication, sync issues

**Implementation**:
```sql
ALTER TABLE gear_items ADD COLUMN source_share_token TEXT
  REFERENCES loadout_shares(share_token) ON DELETE SET NULL;
```

---

### R5: How to implement comment notifications?

**Decision**: Use database trigger to insert notification on comment creation

**Rationale**:
- Decouples notification from client code
- Guarantees notification even if client disconnects
- Can leverage existing realtime subscriptions
- Atomic with comment insert

**Alternatives Considered**:
- Client-side notification insert after comment - Rejected: race conditions, client may disconnect
- Supabase Edge Function - Rejected: adds complexity for simple use case
- Polling - Rejected: inefficient, not realtime

**Implementation**:
1. Create `notifications` table (or extend existing if Feature 046 has one)
2. Add PostgreSQL trigger:
```sql
CREATE OR REPLACE FUNCTION notify_loadout_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, reference_id, message, created_at)
  SELECT owner_id, 'loadout_comment', NEW.id,
         'Someone commented on your loadout', NOW()
  FROM loadout_shares
  WHERE share_token = NEW.share_token AND owner_id IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_loadout_comment_insert
AFTER INSERT ON loadout_comments
FOR EACH ROW EXECUTE FUNCTION notify_loadout_owner();
```

---

### R6: How to handle auto-import after signup from shared loadout?

**Decision**: Store `pendingImport` share token in localStorage, check on app mount

**Rationale**:
- Works across the OAuth redirect flow
- No server-side session modification needed
- Simple client-side detection
- Gracefully degrades if user clears storage

**Alternatives Considered**:
- URL query parameter through auth - Rejected: complicates OAuth callback
- Server-side session storage - Rejected: requires auth provider integration
- Cookie-based - Rejected: same complexity as localStorage with more restrictions

**Implementation**:
1. On CTA click: `localStorage.setItem('pendingImport', shareToken)`
2. After login, in app shell or dashboard: check for `pendingImport`
3. If present: call `importLoadout(token)` server action, then clear storage
4. Show toast: "Loadout imported! Items added to your wishlist."

---

### R7: How to fetch owner profile for display?

**Decision**: Extend `loadout_shares` query to join with `profiles` table

**Rationale**:
- Single query fetches both loadout and owner info
- RLS allows public profile fields to be read
- Respects privacy settings by selecting only public fields

**Alternatives Considered**:
- Separate query for profile - Rejected: adds latency, extra round trip
- Embed profile in payload at share time - Rejected: profile may update

**Implementation**:
```typescript
const { data } = await supabase
  .from('loadout_shares')
  .select(`
    payload,
    allow_comments,
    created_at,
    owner:profiles!owner_id (
      id,
      display_name,
      avatar_url,
      trail_name,
      bio,
      location_name,
      instagram,
      facebook,
      youtube,
      website,
      messaging_privacy
    )
  `)
  .eq('share_token', token)
  .single();
```

---

### R8: Best practices for GearCard reuse in shared context

**Decision**: Create wrapper component `SharedGearCard` that wraps existing `GearCard`

**Rationale**:
- `GearCard` is designed for inventory context (edit links, etc.)
- Wrapper can suppress edit functionality and add owned/wishlist indicators
- Follows composition pattern, no modifications to core component
- Constitution compliant: reuses existing component

**Alternatives Considered**:
- Modify GearCard with conditional props - Rejected: pollutes core component
- Duplicate GearCard code - Rejected: violates DRY, maintenance burden
- CSS-only hiding of edit button - Rejected: fragile, leaks implementation

**Implementation**:
- `SharedGearCard` accepts shared item props + `isOwned`, `isOnWishlist`, `onAddToWishlist`
- Renders `GearCard` with `onClick` for detail modal
- Overlays owned/wishlist badges
- Hides edit button via wrapper styling

---

## Summary

All research questions resolved. Key decisions:
1. Server-side auth check with conditional rendering
2. Extended payload at share-time for GearCard data
3. Brand+name matching for owned items (normalized)
4. Single `source_share_token` column for wishlist reference
5. Database trigger for comment notifications
6. LocalStorage for pending import tracking
7. Join query for owner profile
8. Wrapper component pattern for shared GearCard
