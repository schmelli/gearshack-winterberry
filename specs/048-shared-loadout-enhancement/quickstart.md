# Quickstart: Shared Loadout Enhancement

**Feature**: 048-shared-loadout-enhancement
**Date**: 2025-12-14

## Overview

This document provides a quick reference for implementing the Shared Loadout Enhancement feature. Refer to the full spec, plan, and data model for complete details.

## Prerequisites

Before starting implementation:

1. **Database migrations** must be run to add:
   - `source_share_token` column to `gear_items`
   - `notifications` table
   - Comment notification trigger

2. **Existing components** to reuse:
   - `GearCard` from `components/inventory-gallery/`
   - `GearDetailModal` from `components/gear-detail/`
   - `ProfileView` from `components/profile/`
   - `AvatarWithFallback` from `components/profile/`

## Quick Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] Run database migration for `source_share_token` column
- [ ] Create `notifications` table and trigger
- [ ] Extend `SharedLoadoutPayload` type with new fields
- [ ] Create `SharedLoadoutOwner` type

### Phase 2: Anonymous User Experience

- [ ] Modify `page.tsx` to detect auth state
- [ ] Create `SharedLoadoutHero` component
- [ ] Create `SignupCTA` component
- [ ] Create `OwnerProfilePreview` component
- [ ] Create `SharedGearCard` wrapper component
- [ ] Create `SharedGearGrid` with category grouping

### Phase 3: Signed-In User Experience

- [ ] Create `SharedLoadoutAppView` component
- [ ] Create `useOwnedItemsCheck` hook
- [ ] Create `useWishlistActions` hook
- [ ] Add owned item indicators to `SharedGearCard`
- [ ] Add "Add to Wishlist" action

### Phase 4: Post-Signup Import

- [ ] Create `importLoadoutToWishlist` server action
- [ ] Add localStorage handling for pending import
- [ ] Add post-login import check in app shell

### Phase 5: Comment Notifications

- [ ] Create notification hook with realtime subscription
- [ ] Add notification indicator to header (if not exists)
- [ ] Handle notification deep-linking

## Key Files to Create

```
components/shakedown/
├── SharedLoadoutHero.tsx         # Hero header for anonymous
├── SharedLoadoutAppView.tsx      # In-app view for authenticated
├── SharedGearCard.tsx            # GearCard wrapper with indicators
├── SharedGearGrid.tsx            # Category-grouped grid
├── SignupCTA.tsx                 # Call-to-action banner
└── OwnerProfilePreview.tsx       # Clickable owner avatar

hooks/
├── useSharedLoadout.ts           # Main orchestration hook
├── useOwnedItemsCheck.ts         # Match against user inventory
└── useWishlistActions.ts         # Add to wishlist logic

actions/
└── sharing.ts                    # Server actions

lib/supabase/queries/
└── sharing.ts                    # Supabase query functions

types/
└── sharing.ts                    # Extended (add new interfaces)
```

## Key Files to Modify

```
app/[locale]/shakedown/[token]/page.tsx
  - Add auth detection
  - Conditional rendering based on auth state
  - Fetch owner profile with loadout

types/sharing.ts
  - Add SharedGearItem extended fields
  - Add SharedLoadoutOwner interface
  - Add SharedLoadoutWithOwner interface

types/database.ts
  - Add source_share_token to gear_items
  - Add notifications table types
```

## Component Hierarchy

```
ShakedownPage (server component)
├── [Anonymous]
│   └── SharedLoadoutHero
│       ├── Logo + Loadout Info
│       ├── OwnerProfilePreview
│       ├── SignupCTA
│       └── SharedGearGrid
│           └── SharedGearCard (per category)
│               └── GearDetailModal (on click)
│
└── [Authenticated]
    └── AppShell (existing)
        └── SharedLoadoutAppView
            ├── OwnerProfilePreview
            └── SharedGearGrid
                └── SharedGearCard (with owned/wishlist indicators)
                    └── GearDetailModal (on click)
```

## Testing Scenarios

### Anonymous User Flow
1. Open shared URL in incognito
2. Verify hero header shows app logo, loadout name, owner avatar
3. Verify gear cards render with images
4. Click gear card → detail modal opens
5. Click CTA → redirects to login
6. Click owner avatar → profile preview shows

### Signed-In User Flow
1. Open shared URL while logged in
2. Verify standard app navigation visible
3. Verify owned items show indicator
4. Click "Add to Wishlist" on unowned item
5. Verify toast confirmation
6. Check inventory → item appears with wishlist status

### Post-Signup Import
1. Open shared URL (anonymous)
2. Click CTA → complete signup
3. Verify loadout imported automatically
4. Check loadouts → imported loadout visible
5. Check inventory → items have wishlist status

### Comment Notification
1. User A shares loadout
2. User B comments on it
3. User A sees notification appear
4. Click notification → navigates to loadout

## Common Patterns

### Auth Detection in Server Component
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const isAuthenticated = !!user;
```

### Item Matching Logic
```typescript
const normalizeForMatch = (brand: string | null, name: string): string =>
  `${(brand || '').toLowerCase().trim()}|${name.toLowerCase().trim()}`;
```

### LocalStorage for Pending Import
```typescript
// On CTA click
localStorage.setItem('pendingImport', shareToken);

// After login
const pending = localStorage.getItem('pendingImport');
if (pending) {
  await importLoadoutToWishlist(pending);
  localStorage.removeItem('pendingImport');
}
```

## i18n Keys to Add

```json
{
  "SharedLoadout": {
    "heroTitle": "Virtual Gear Shakedown",
    "sharedBy": "Shared by {name}",
    "tripDate": "Trip date",
    "createdOn": "Created",
    "totalItems": "Total Items",
    "signupCta": "Add this loadout to your collection",
    "signupButton": "Sign Up Free",
    "ownedBadge": "Owned",
    "wishlistBadge": "On Wishlist",
    "addToWishlist": "Add to Wishlist",
    "importSuccess": "Loadout imported! {count} items added to wishlist.",
    "ownerUnavailable": "Owner no longer available"
  }
}
```

## Related Documentation

- [spec.md](./spec.md) - Full feature specification
- [plan.md](./plan.md) - Implementation plan
- [data-model.md](./data-model.md) - Database schema changes
- [contracts/api.md](./contracts/api.md) - API contracts
