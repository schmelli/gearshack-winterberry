# Quickstart: Final Header Polish Sprint

**Feature**: 016-header-polish-sprint
**Estimated Time**: 10-15 minutes
**Prerequisites**: None

## Quick Summary

Fix three visual issues: logo visibility, avatar fallback visibility, and redundant loadouts title.

## Implementation Steps

### Step 1: Fix Logo Visibility (US1 - P1)

**File**: `components/layout/SiteHeader.tsx`

Find the Image component (around line 61-68):

```diff
<Image
  src="/logos/small_gearshack_logo.png"
  alt="Gearshack Logo"
  width={80}
  height={80}
-  className="h-20 w-20"
+  className="h-20 w-20 brightness-0 invert"
  priority
/>
```

### Step 2: Fix Avatar Fallback (US2 - P1)

**File**: `components/profile/AvatarWithFallback.tsx`

Find the AvatarFallback (around line 73):

```diff
-<AvatarFallback className="bg-primary/10 text-primary font-medium">
+<AvatarFallback className="bg-white/20 text-white font-medium">
  {initials}
</AvatarFallback>
```

### Step 3: Remove Loadouts Title (US3 - P2)

**File**: `app/loadouts/page.tsx`

Find the page header section (around line 54-69) and simplify:

```diff
{/* Page Header */}
-<div className="mb-6 flex items-center justify-between">
-  <div>
-    <h1 className="text-3xl font-bold tracking-tight">Loadouts</h1>
-    <p className="mt-1 text-muted-foreground">
-      Plan your trips by combining gear from your inventory
-    </p>
-  </div>
+<div className="mb-6 flex items-center justify-end">
  <Button asChild>
    <Link href="/loadouts/new">
      <Plus className="mr-2 h-4 w-4" />
      Create New Loadout
    </Link>
  </Button>
</div>
```

## Verification Checklist

- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run build` - no errors
- [ ] Visual: Logo is white/visible on green header
- [ ] Visual: Avatar initials visible when no profile photo
- [ ] Visual: Loadouts page starts with toolbar (no H1)
- [ ] Check dropdown menu avatar still looks correct

## Rollback Plan

All changes are CSS class modifications or markup removal. To rollback:

1. Remove `brightness-0 invert` from logo Image
2. Change avatar fallback back to `bg-primary/10 text-primary`
3. Re-add H1 and paragraph to loadouts page
