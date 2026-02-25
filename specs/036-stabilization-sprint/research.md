# Research: Stabilization Sprint - i18n, Image Domains & MIME Fixes

**Feature**: 036-stabilization-sprint
**Date**: 2025-12-08
**Status**: Complete

## Research Tasks

### 1. i18n FORMATTING_ERROR Investigation

**Question**: Why does the inventory page crash with FORMATTING_ERROR?

**Finding**: The crash occurs because next-intl's `t()` function requires all placeholders defined in a message to be provided as parameters. When calling `t('showingItems')` without parameters, but the message is defined as:
```json
"showingItems": "Showing {filtered} of {total} items"
```
next-intl throws a FORMATTING_ERROR because `{filtered}` and `{total}` are required.

**Current Architecture**: The GalleryToolbar component receives translation strings via props and does its own string replacement:
```typescript
{t.showingItems
  .replace('{filtered}', String(filteredCount))
  .replace('{total}', String(itemCount))}
```

**Decision**: Fix the inventory page to pass parameters to `t()` function:
```typescript
showingItems: t('showingItems', { filtered: filteredCount, total: itemCount }),
```

This is the correct approach because:
1. It properly uses next-intl's ICU message format
2. It supports pluralization and other i18n features if needed
3. It prevents the FORMATTING_ERROR at the source

**Alternative Considered**: Change message definitions to not use placeholders and let GalleryToolbar handle all substitution. Rejected because it breaks proper i18n patterns and would require more changes.

---

### 2. Image Domain Restriction Status

**Question**: Is the wildcard hostname pattern correctly configured?

**Finding**: The `next.config.ts` already has the correct configuration:
```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**',
    },
  ],
},
```

**Decision**: No action needed. The wildcard `**` allows all HTTPS domains.

**Verification**: The build output shows Image Optimization is working with the wildcard pattern.

---

### 3. MIME Type Validation Investigation

**Question**: Why do Firebase Storage uploads fail for proxied images?

**Finding**: The `importExternalImage` function in `useGearEditor.ts` uses the content-type header from the proxy response to set the File's MIME type:
```typescript
const contentType = response.headers.get('content-type') || 'image/jpeg';
```

However, the proxy (after recent modifications) may return:
- `image/jpeg` (correct)
- Empty string or null (handled by fallback)
- `application/octet-stream` (NOT handled - this is the bug)
- Other non-image types

Firebase Storage security rules require `content_type.matches('image/.*')`, so files with `application/octet-stream` will be rejected.

**Decision**: Add explicit validation of content-type before creating the File:
```typescript
const rawContentType = response.headers.get('content-type') || '';
const contentType = rawContentType.startsWith('image/') ? rawContentType : 'image/jpeg';
```

**Rationale**:
- If content-type is a valid image type, use it
- If content-type is missing, empty, or non-image, default to `image/jpeg`
- JPEG is a safe fallback as most images can be treated as JPEG for storage purposes

---

### 4. GalleryToolbar Translation Pattern

**Question**: How should the GalleryToolbar receive pre-formatted vs raw translations?

**Finding**: The current pattern passes raw translation strings that contain placeholder markers:
```typescript
translations={{
  showingItems: t('showingItems'),  // FAILS - placeholders not filled
  itemsCount: t('itemCount'),       // FAILS - placeholder not filled
}}
```

The GalleryToolbar then does manual string replacement. This pattern breaks with next-intl's strict validation.

**Decision**: Two options to fix:
1. **Option A**: Pass pre-formatted strings from the page
2. **Option B**: Change GalleryToolbar to receive values directly

**Selected**: Option A - Keep the translation architecture, but pass formatted strings:
```typescript
translations={{
  showingItems: t('showingItems', { filtered: filteredCount, total: itemCount }),
  itemsCount: t('itemCount', { count: itemCount }),
}}
```

Then update GalleryToolbar to use the pre-formatted strings directly instead of doing string replacement.

---

## Summary

| Issue | Decision | Rationale |
|-------|----------|-----------|
| i18n FORMATTING_ERROR | Pass parameters to `t()` | Proper i18n usage |
| Image Domains | No action needed | Already configured with wildcard |
| MIME Type | Validate and sanitize content-type | Ensure Firebase accepts uploads |
| GalleryToolbar | Use pre-formatted translations | Cleaner architecture |

## Implementation Approach

1. **Fix inventory page** (`app/[locale]/inventory/page.tsx`):
   - Pass `filteredCount` and `itemCount` to `t('showingItems', {...})`
   - Pass `itemCount` to `t('itemCount', {...})`

2. **Fix GalleryToolbar** (`components/inventory-gallery/GalleryToolbar.tsx`):
   - Update to display pre-formatted strings directly
   - Remove manual `.replace()` calls

3. **Fix useGearEditor** (`hooks/useGearEditor.ts`):
   - Add MIME type validation in `importExternalImage`
   - Default to `image/jpeg` for non-image content types
