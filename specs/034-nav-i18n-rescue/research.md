# Research: Navigation & Translation Rescue Sprint

**Feature**: 034-nav-i18n-rescue
**Date**: 2025-12-08

## Research Questions

### RQ1: How does next-intl handle locale-aware navigation?

**Investigation**:

next-intl provides locale-aware navigation through `createNavigation()`:

```typescript
// From i18n/navigation.ts in this project
import { createNavigation } from 'next-intl/navigation';
export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  defaultLocale,
});
```

**Decision**: Import `Link` and `useRouter` from `@/i18n/navigation` instead of `next/link` and `next/navigation`
**Rationale**: The locale-aware versions automatically prepend the current locale to URLs
**Alternatives**:
- Manually append locale to every URL - Error-prone and verbose
- Use middleware rewriting - Doesn't work for client-side navigation

---

### RQ2: Which files currently use incorrect imports?

**Investigation**:

Files using `next/link` (should use `@/i18n/navigation`):
1. `components/inventory-gallery/GearCard.tsx` - Line 18
2. `app/[locale]/loadouts/page.tsx` - Line 20
3. `app/[locale]/loadouts/new/page.tsx` - Line 13
4. `components/loadouts/LoadoutCard.tsx` - Line 12
5. `components/loadouts/GearDetailModal.tsx` - Line 16
6. `components/loadouts/LoadoutHeader.tsx` - Line 21
7. `components/layout/SiteFooter.tsx` - Line 16

Files using `useRouter from 'next/navigation'` (should use `@/i18n/navigation`):
1. `hooks/useGearEditor.ts` - Line 17
2. `app/[locale]/loadouts/new/page.tsx` - Line 11

**Decision**: Update all listed files to use `@/i18n/navigation` imports
**Rationale**: Ensures locale preservation across all navigation
**Alternatives**: None viable - all navigation must be locale-aware

---

### RQ3: What is the correct translation key structure?

**Investigation**:

Current translation file structure (de.json and en.json):
- `Inventory.itemCount` exists with value `"{count} Gegenstände"` / `"{count} items"`
- `Inventory.showingItems` exists with value `"Zeige {filtered} von {total} Gegenständen"`
- `GearEditor` namespace exists with form labels

User reported `itemsCount` but actual key is `itemCount` (already correct).

**Decision**: No translation changes needed - keys are already correct
**Rationale**: Investigation shows the keys match between code and JSON files
**Alternatives**: N/A

---

### RQ4: How does useRouter behave differently between next/navigation and next-intl?

**Investigation**:

Standard Next.js `useRouter` from `next/navigation`:
```typescript
router.push('/inventory'); // Goes to /inventory (no locale)
```

next-intl `useRouter` from `@/i18n/navigation`:
```typescript
router.push('/inventory'); // Goes to /de/inventory or /en/inventory (preserves locale)
```

**Decision**: Use `useRouter` from `@/i18n/navigation` for all programmatic navigation
**Rationale**: Automatically handles locale prefix without manual intervention
**Alternatives**: Manual locale concatenation - Rejected as error-prone

---

## Design Decisions

### DD-001: Import Migration Strategy

**Decision**: Replace imports file-by-file, not with global search-replace
**Rationale**: Allows verification that each file's usage is compatible
**Trade-offs**: Takes slightly longer but safer

### DD-002: No New Translation Keys Needed

**Decision**: Keep existing translation structure unchanged
**Rationale**:
- `itemCount` key already exists and is correct
- `showingItems` key already exists and is correct
- GearEditor namespace has all needed keys
**Trade-offs**: None - this simplifies the fix

### DD-003: Files That Should Keep next/navigation

**Decision**: Some files should NOT be migrated:
- `ProtectedRoute.tsx` - Uses `usePathname` for path checking, not navigation
- `Shell.tsx` - Uses `usePathname` for current path detection
- `notFound` usage in catch-all pages - Next.js internal

**Rationale**: These aren't navigation calls, they're path detection
**Trade-offs**: Requires case-by-case evaluation
