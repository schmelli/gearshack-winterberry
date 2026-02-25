# Contracts: Navigation & Translation Rescue Sprint

**Feature**: 034-nav-i18n-rescue
**Date**: 2025-12-08

## Overview

This feature does not introduce new API endpoints or contracts. It corrects the usage of existing navigation infrastructure.

## Behavioral Contracts

### Link Component Contract

**Import**: `import { Link } from '@/i18n/navigation'`

**Behavior**:
- Accepts `href` prop as locale-relative path
- Automatically prepends current locale to href
- Supports all standard Next.js Link props

**Example**:
```tsx
// Current locale: de
<Link href="/inventory/abc/edit">Edit</Link>
// Renders: <a href="/de/inventory/abc/edit">Edit</a>
```

### useRouter Hook Contract

**Import**: `import { useRouter } from '@/i18n/navigation'`

**Behavior**:
- `router.push(path)` - Navigates with locale prefix
- `router.replace(path)` - Replaces with locale prefix
- `router.prefetch(path)` - Prefetches with locale prefix

**Example**:
```typescript
// Current locale: de
const router = useRouter();
router.push('/inventory');
// Navigates to: /de/inventory
```

## Migration Checklist

Files must be updated from standard Next.js imports to i18n-aware imports:

- [ ] `hooks/useGearEditor.ts` - useRouter
- [ ] `components/inventory-gallery/GearCard.tsx` - Link
- [ ] `app/[locale]/loadouts/page.tsx` - Link
- [ ] `app/[locale]/loadouts/new/page.tsx` - Link, useRouter
- [ ] `components/loadouts/LoadoutCard.tsx` - Link
- [ ] `components/loadouts/GearDetailModal.tsx` - Link
- [ ] `components/loadouts/LoadoutHeader.tsx` - Link
- [ ] `components/layout/SiteFooter.tsx` - Link
