# Quickstart: Rescue & Refine

**Feature Branch**: `011-rescue-refine-bugs`
**Date**: 2025-12-05

## Overview

This feature fixes critical runtime bugs and applies UI polish to the Firestore sync implementation. The main issues are:

1. **LoadoutCard crashes** - Invalid IDs (hex colors) in loadout data cause runtime errors
2. **"Untitled Item" display** - Legacy gear items show wrong name because field mapping is incomplete
3. **UI inconsistencies** - Edit loadout uses Sheet instead of Dialog, footer styling differs from header

## Prerequisites

- Feature 010-firestore-sync completed
- shadcn/ui Dialog component installed
- Firebase auth working (to test sync)

## Key Changes

### 1. ID Validation (adapter.ts)

Add validation helper:

```typescript
function isValidFirestoreId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{10,}$/.test(id);
}
```

Use before returning adapted items to filter out invalid entries.

### 2. Name Field Resolution (adapter.ts)

Update `adaptGearItem` to check multiple name fields:

```typescript
const nameValue = resolveField(validated, 'name', 'title')
  ?? resolveField(validated, 'item_name', 'displayName')
  ?? 'Unnamed Gear';
```

### 3. Zod Schema Update (validations/adapter.ts)

Make name field optional, add alternative fields:

```typescript
export const FirestoreGearItemSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  item_name: z.string().optional(),
  displayName: z.string().optional(),
  // ... rest
});
```

### 4. LoadoutCard Guard (LoadoutCard.tsx)

Add defensive check before render:

```typescript
if (!loadout.id || !/^[a-zA-Z0-9_-]{10,}$/.test(loadout.id)) {
  console.warn('[LoadoutCard] Invalid loadout ID:', loadout.id);
  return null;
}
```

### 5. Edit Loadout Dialog Migration

Create new `LoadoutMetadataDialog.tsx` based on existing Sheet component:

- Replace `Sheet` imports with `Dialog` imports
- Update component structure to use `Dialog`, `DialogContent`, etc.
- Keep same form logic

### 6. Footer Styling Update (SiteFooter.tsx)

Update className to match header:

```diff
- <footer className={cn('bg-emerald-900 text-emerald-100', className)}>
+ <footer className={cn('bg-emerald-50/90 backdrop-blur-md text-foreground dark:bg-emerald-900/90', className)}>
```

## Testing Checklist

- [ ] Navigate to /loadouts - no console errors
- [ ] Click any loadout card - navigates without crash
- [ ] View inventory - gear items show actual names (not "Untitled Item")
- [ ] Edit a loadout - centered Dialog modal appears
- [ ] Scroll to footer - matches header's emerald-50 background
- [ ] Open gear detail modal - appears above header

## Files Modified

| File | Change |
|------|--------|
| `lib/firebase/adapter.ts` | ID validation, name field resolution |
| `lib/validations/adapter.ts` | Zod schema: optional name, add title/item_name |
| `components/loadouts/LoadoutCard.tsx` | Guard for invalid IDs |
| `components/loadouts/LoadoutMetadataSheet.tsx` | → `LoadoutMetadataDialog.tsx` |
| `components/layout/SiteFooter.tsx` | Styling update |
