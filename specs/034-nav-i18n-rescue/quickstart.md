# Quickstart: Navigation & Translation Rescue Sprint

**Feature**: 034-nav-i18n-rescue
**Date**: 2025-12-08

## Implementation Sequence

### Step 1: Fix useGearEditor Hook

**File**: `hooks/useGearEditor.ts`

**Change**:
```typescript
// Before (line 17)
import { useRouter } from 'next/navigation';

// After
import { useRouter } from '@/i18n/navigation';
```

**Verification**: Save a gear item while on /de locale → should redirect to /de/inventory

---

### Step 2: Fix GearCard Component

**File**: `components/inventory-gallery/GearCard.tsx`

**Change**:
```typescript
// Before (line 18)
import Link from 'next/link';

// After
import { Link } from '@/i18n/navigation';
```

**Note**: The Link usage in the component (href={`/inventory/${item.id}/edit`}) remains unchanged - the i18n Link automatically handles locale.

**Verification**: Click Edit button on gear card in /de/inventory → should navigate to /de/inventory/[id]/edit

---

### Step 3: Fix Loadouts Page

**File**: `app/[locale]/loadouts/page.tsx`

**Change**:
```typescript
// Before (line 20)
import Link from 'next/link';

// After
import { Link } from '@/i18n/navigation';
```

---

### Step 4: Fix Loadouts New Page

**File**: `app/[locale]/loadouts/new/page.tsx`

**Changes**:
```typescript
// Before (lines 11, 13)
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// After
import { useRouter, Link } from '@/i18n/navigation';
```

---

### Step 5: Fix Loadout Components

**Files**:
- `components/loadouts/LoadoutCard.tsx`
- `components/loadouts/GearDetailModal.tsx`
- `components/loadouts/LoadoutHeader.tsx`

**Change for each**:
```typescript
// Before
import Link from 'next/link';

// After
import { Link } from '@/i18n/navigation';
```

---

### Step 6: Fix SiteFooter

**File**: `components/layout/SiteFooter.tsx`

**Change**:
```typescript
// Before (line 16)
import Link from 'next/link';

// After
import { Link } from '@/i18n/navigation';
```

---

## Testing Checklist

After all changes:

1. **Lint Check**: `npm run lint` - No errors
2. **Build Check**: `npm run build` - Successful

3. **Manual Testing**:
   - [ ] Navigate to /de/inventory
   - [ ] Click Edit on a gear card → URL should be /de/inventory/[id]/edit
   - [ ] Save the item → URL should redirect to /de/inventory
   - [ ] Navigate to /de/loadouts
   - [ ] Create new loadout → Redirect should preserve /de locale
   - [ ] Check footer links → All should preserve locale

## Key Points

- **DO NOT** change any `href` values - they should remain locale-relative (e.g., `/inventory`)
- **DO** update the import source from `next/link` or `next/navigation` to `@/i18n/navigation`
- **DO NOT** change files that use `usePathname` for detection (Shell.tsx, ProtectedRoute.tsx)
- The i18n Link and useRouter automatically handle locale prefixing
