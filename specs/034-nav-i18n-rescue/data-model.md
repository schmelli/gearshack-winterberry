# Data Model: Navigation & Translation Rescue Sprint

**Feature**: 034-nav-i18n-rescue
**Date**: 2025-12-08

## Overview

This feature does not introduce new data models. It corrects the usage of existing navigation and translation infrastructure.

## Affected Modules

### Navigation Module (`@/i18n/navigation`)

Existing exports that should be used throughout the app:

```typescript
// From i18n/navigation.ts
export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales: ['en', 'de'],
  defaultLocale: 'en',
});
```

**Link Component**:
- Input: `href` prop with locale-relative path (e.g., `/inventory/[id]/edit`)
- Output: Renders `<a>` with full locale-prefixed URL (e.g., `/de/inventory/abc/edit`)

**useRouter Hook**:
- Returns router with locale-aware `push()`, `replace()`, `prefetch()` methods
- Automatically prepends current locale to all navigation URLs

### Translation Keys (No Changes)

Existing keys that are correctly defined:

| Namespace | Key | EN Value | DE Value |
|-----------|-----|----------|----------|
| Inventory | itemCount | `{count} items` | `{count} Gegenstände` |
| Inventory | showingItems | `Showing {filtered} of {total} items` | `Zeige {filtered} von {total} Gegenständen` |

## State Transitions

### Navigation Flow (Before Fix)

```
User clicks Edit → Link with /inventory/[id]/edit → Browser goes to /inventory/[id]/edit
                                                  → 404 or redirect to root (BUG)
```

### Navigation Flow (After Fix)

```
User on /de/inventory clicks Edit → i18n Link with /inventory/[id]/edit
                                  → Browser goes to /de/inventory/[id]/edit
                                  → Edit page loads correctly
```

### Save Flow (Before Fix)

```
User saves item → router.push('/inventory') → Browser goes to /inventory
                                            → Middleware redirects to /en/inventory
                                            → User loses German locale (BUG)
```

### Save Flow (After Fix)

```
User saves item on /de → i18n router.push('/inventory') → Browser goes to /de/inventory
                                                        → User stays in German locale
```

## Files Requiring Updates

| File | Line | Current | Required |
|------|------|---------|----------|
| `hooks/useGearEditor.ts` | 17 | `import { useRouter } from 'next/navigation'` | `import { useRouter } from '@/i18n/navigation'` |
| `components/inventory-gallery/GearCard.tsx` | 18 | `import Link from 'next/link'` | `import { Link } from '@/i18n/navigation'` |
| `app/[locale]/loadouts/page.tsx` | 20 | `import Link from 'next/link'` | `import { Link } from '@/i18n/navigation'` |
| `app/[locale]/loadouts/new/page.tsx` | 11,13 | Both imports | Both from `@/i18n/navigation` |
| `components/loadouts/LoadoutCard.tsx` | 12 | `import Link from 'next/link'` | `import { Link } from '@/i18n/navigation'` |
| `components/loadouts/GearDetailModal.tsx` | 16 | `import Link from 'next/link'` | `import { Link } from '@/i18n/navigation'` |
| `components/loadouts/LoadoutHeader.tsx` | 21 | `import Link from 'next/link'` | `import { Link } from '@/i18n/navigation'` |
| `components/layout/SiteFooter.tsx` | 16 | `import Link from 'next/link'` | `import { Link } from '@/i18n/navigation'` |
