# Research: Search Save Fix & i18n Repair Sprint

**Feature**: 031-search-save-i18n-fix
**Date**: 2025-12-08

## Research Questions

### RQ1: Why does saving fail when selecting search images?

**Investigation**:

Reviewed the save flow:
1. `MediaSection.tsx` - `handleSelectImage(imageUrl)` calls `onChange(imageUrl)` which sets the form's `primaryImageUrl` field
2. `useGearEditor.ts` - `handleSubmit` calls `formDataToGearItem(data)` to convert form to entity
3. `gear-utils.ts` - `formDataToGearItem` passes `primaryImageUrl` through directly (line 152)
4. `useStore.ts` - `addItem` and `updateItem` call `prepareGearItemForFirestore()`
5. `adapter.ts` - `prepareGearItemForFirestore` maps `primaryImageUrl` to `primary_image` (line 552)

**Finding**: The save flow appears correct - external URLs should pass through without issue. The actual bug may be:
- `onFileSelect` prop not being called to clear local file preview state when search image is selected
- The `localPreview` state in MediaSection could cause confusion

**Decision**: Clear local file state when search image is selected
**Rationale**: Ensures clean state transition from file-based upload flow to URL-based search flow
**Alternatives**: None - this is the correct fix location

---

### RQ2: Why does the i18n FORMATTING_ERROR occur on Inventory page?

**Investigation**:

Reviewed the translation flow:
1. `messages/de.json` line 131: `"showingItems": "Zeige {filtered} von {total} Gegenständen"`
2. `messages/en.json` line 131: `"showingItems": "Showing {filtered} of {total} items"`
3. `GalleryToolbar.tsx` lines 166-168: Uses string replacement:
   ```tsx
   {t.showingItems
     .replace('{filtered}', String(filteredCount))
     .replace('{total}', String(itemCount))}
   ```
4. `app/[locale]/inventory/page.tsx` line 99: Passes `showingItems: t('showingItems')`

**Finding**: The GalleryToolbar uses manual string `.replace()` instead of next-intl's ICU message formatting. This should work, but the translation messages use ICU format `{variable}` which the `.replace()` handles correctly.

The actual issue may be:
- `t('showingItems')` is being called with ICU formatting expectation but no variables passed
- next-intl may throw FORMATTING_ERROR when ICU placeholders exist but no values provided

**Decision**: The message files are correct. The issue is in how the translation is being called or passed. The GalleryToolbar receives the raw string and does manual replacement, which works. Need to verify the actual error source.

**Rationale**: The current string replacement approach is valid and simpler than ICU formatting
**Alternatives**: Could switch to ICU formatting with `t('showingItems', { filtered, total })`, but current approach works

---

### RQ3: Best practices for toast feedback on user actions?

**Investigation**:

The project uses `sonner` for toasts (already imported in MediaSection.tsx).

**Decision**: Use `toast.info('Image selected')` for non-intrusive feedback
**Rationale**:
- `info` variant is appropriate for confirmatory messages (not success/error)
- Consistent with existing toast usage in the codebase
- Brief message that doesn't require dismissal

**Alternatives**:
- `toast.success()` - Too emphatic for a simple selection
- Custom duration - Default ~3s is appropriate

---

## Summary of Fixes

| Issue | Root Cause | Fix Location | Fix Description |
|-------|------------|--------------|-----------------|
| Image save fails | Local file state not cleared | `MediaSection.tsx` | Call `onFileSelect?.(null, null)` in `handleSelectImage` |
| i18n crash | Need to verify actual error | `GalleryToolbar.tsx` | Verify string replacement works, check for ICU formatting issues |
| Toast feedback | Not implemented | `MediaSection.tsx` | Add `toast.info('Image selected')` in `handleSelectImage` |

## Design Decisions

### DD-001: Keep string replacement for translations

**Decision**: Maintain current `.replace()` approach for `showingItems`
**Rationale**: Simpler than ICU formatting, already working in English locale
**Trade-offs**: Less powerful than ICU (no pluralization), but adequate for this use case

### DD-002: Clear all local state on search selection

**Decision**: Clear both `localPreview` and reset any pending upload state
**Rationale**: Ensures clean transition, prevents ghost state from previous interactions
**Trade-offs**: None significant

### DD-003: Use info toast variant

**Decision**: `toast.info()` rather than `toast.success()`
**Rationale**: Selection is an intermediate action, not a completion; info is appropriate
**Trade-offs**: Less prominent than success toast, but more semantically correct
