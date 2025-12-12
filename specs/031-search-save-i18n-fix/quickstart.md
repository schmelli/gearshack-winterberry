# Quickstart: Search Save Fix & i18n Repair Sprint

**Feature**: 031-search-save-i18n-fix
**Date**: 2025-12-08

## Overview

This guide walks through fixing two bugs and adding one polish item in the Gearshack app:
1. Image save failure when selecting search images
2. i18n FORMATTING_ERROR on German Inventory page
3. Toast feedback when selecting search images

---

## Fix 1: Clear Local File State on Search Selection

**File**: `components/gear-editor/sections/MediaSection.tsx`

### Current Code (Problem)

```typescript
// Feature 030: Select image from search results (T006)
const handleSelectImage = useCallback(
  (imageUrl: string) => {
    onChange(imageUrl);
    setSearchResults([]); // Close grid after selection
    setSearchError(null);
  },
  [onChange]
);
```

### Fixed Code

```typescript
// Feature 030 + 031: Select image from search results
// FR-003: Clear local file state, FR-006: Add toast
const handleSelectImage = useCallback(
  (imageUrl: string) => {
    onChange(imageUrl);
    onFileSelect?.(null, null);  // FR-003: Clear any pending local file state
    setSearchResults([]);         // Close grid after selection
    setSearchError(null);
    toast.info('Image selected'); // FR-006: User feedback
  },
  [onChange, onFileSelect]
);
```

**Changes**:
1. Add `onFileSelect?.(null, null)` to clear local file/preview state
2. Add `onFileSelect` to dependency array
3. Add `toast.info('Image selected')` for feedback

---

## Fix 2: Verify i18n Translation Variables

**Files**: `messages/de.json`, `messages/en.json`, `components/inventory-gallery/GalleryToolbar.tsx`

### Step 2.1: Verify Message Files

Check that both files have consistent placeholder format:

```json
// messages/en.json - Line ~131
"showingItems": "Showing {filtered} of {total} items"

// messages/de.json - Line ~131
"showingItems": "Zeige {filtered} von {total} Gegenständen"
```

### Step 2.2: Verify GalleryToolbar Usage

The current implementation uses manual string replacement (not ICU formatting):

```typescript
// GalleryToolbar.tsx - Lines 166-168
{t.showingItems
  .replace('{filtered}', String(filteredCount))
  .replace('{total}', String(itemCount))}
```

This approach works correctly. The FORMATTING_ERROR may come from:
- Incorrect variable name in JSON (verify `{filtered}` not `{filter}`)
- Mismatched quotes or special characters

### Step 2.3: If Error Persists

If the error is from next-intl ICU formatting expectation, the page.tsx call might need adjustment. Check:

```typescript
// app/[locale]/inventory/page.tsx - Line 99
showingItems: t('showingItems')  // Should NOT pass variables if using manual replace
```

---

## Fix 3: Toast Feedback (Already in Fix 1)

The toast is added in Fix 1 above. Ensure `toast` from `sonner` is imported (it already is in MediaSection.tsx).

---

## Validation Checklist

After making changes:

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` succeeds
- [ ] Manual test: Create new item → Search for image → Select image → Save → Verify success
- [ ] Manual test: Switch to German locale → Navigate to /de/inventory → Verify no crash
- [ ] Manual test: Apply filter in inventory → Verify "Zeige X von Y Gegenständen" displays
- [ ] Manual test: Select search image → Verify "Image selected" toast appears

---

## Files Modified Summary

| File | Change | Requirements |
|------|--------|--------------|
| `components/gear-editor/sections/MediaSection.tsx` | Add `onFileSelect?.(null, null)` and `toast.info()` to `handleSelectImage` | FR-003, FR-006 |
| `messages/de.json` | Verify `showingItems` has `{filtered}` and `{total}` | FR-005 |
| `messages/en.json` | Verify `showingItems` has `{filtered}` and `{total}` | FR-005 |

No new files created. This is a pure bugfix sprint.
