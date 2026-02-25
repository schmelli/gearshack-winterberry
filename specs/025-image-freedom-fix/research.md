# Research: Total Freedom Sprint

**Input**: spec.md requirements for image deletion persistence and external domain support
**Date**: 2025-12-07

## Decision Records

### DR-001: Use deleteField() for Image Removal

**Status**: APPROVED

**Context**: When a user removes an image, the current flow sets `primaryImageUrl: null` in the update. Firestore's `updateDoc()` treats `null` as "set this field to null value", not "remove this field from the document". The Flutter app expects the field to be absent (not null) when no image exists.

**Decision**: Use Firebase `deleteField()` sentinel value when image URL is empty/null

**Implementation**:
```typescript
import { deleteField } from 'firebase/firestore';

// In useStore.updateItem():
const firestoreUpdates = { ...updates };
if (updates.primaryImageUrl === null) {
  firestoreUpdates.primary_image = deleteField();
  delete firestoreUpdates.primaryImageUrl;
}
```

**Consequences**:
- Image deletion persists correctly to Firestore
- Flutter app compatibility maintained
- No schema changes required

---

### DR-002: Delete nobgImages When Primary Image Removed

**Status**: APPROVED

**Context**: When the primary image is removed, the associated background-removed images (nobgImages) should also be removed to maintain data consistency.

**Decision**: When primaryImageUrl is set to null/empty, also delete nobgImages field

**Implementation**:
```typescript
if (updates.primaryImageUrl === null) {
  firestoreUpdates.primary_image = deleteField();
  firestoreUpdates.nobgImages = deleteField();
  delete firestoreUpdates.primaryImageUrl;
}
```

**Consequences**:
- Data consistency maintained
- No orphaned processed image references
- Firebase Storage cleanup remains out of scope (per spec)

---

### DR-003: Wildcard Hostname in next.config.ts

**Status**: APPROVED

**Context**: Users want to paste product image URLs from any retailer (fjellsport.no, REI, etc.). Currently blocked by Next.js Image component domain whitelist.

**Decision**: Use hostname wildcard pattern `'**'` to allow all HTTPS domains

**Implementation**:
```typescript
// next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**',  // Allow all HTTPS domains
    },
  ],
}
```

**Alternatives Considered**:
1. Keep adding domains on demand - Rejected (poor UX, constant updates needed)
2. Use `unoptimized: true` - Rejected (loses Next.js image optimization benefits)
3. `<img>` tag instead of `<Image>` - Rejected (loses optimization, inconsistent)

**Consequences**:
- Any HTTPS image URL works immediately
- HTTP URLs still blocked (security)
- Image optimization still applied by Next.js

---

### DR-004: Minimal Change to useStore.ts

**Status**: APPROVED

**Context**: Need to add deleteField() logic without major refactoring.

**Decision**: Add image deletion handling directly in `updateItem()` function before the `updateDoc()` call.

**Implementation Location**: `hooks/useStore.ts` lines 105-152

**Changes**:
1. Import `deleteField` from 'firebase/firestore'
2. Add conditional logic to detect primaryImageUrl === null
3. Transform updates to use deleteField() sentinel

**Consequences**:
- Single file change for deletion persistence
- No changes to hooks/useGearEditor.ts
- No changes to lib/gear-utils.ts
- No changes to lib/firebase/adapter.ts

---

### DR-005: Keep Existing Form Flow Unchanged

**Status**: APPROVED

**Context**: The remove button in MediaSection.tsx correctly sets `primaryImageUrl` to empty string `''`. The `formDataToGearItem()` correctly converts `''` to `null`.

**Decision**: No changes to form handling or conversion logic. The fix is isolated to the Firestore write layer.

**Flow**:
1. User clicks remove → `onChange('')` → form value is `''`
2. User saves → `formDataToGearItem()` → `primaryImageUrl: null`
3. `useStore.updateItem()` → detects `null`, uses `deleteField()`
4. Firestore field is deleted (not set to null)

**Consequences**:
- No changes to UI components
- No changes to form utilities
- Single point of fix in data layer

---

## File Impact Summary

| File | Change Type | Reason |
|------|-------------|--------|
| `hooks/useStore.ts` | Modify | Add deleteField() logic for image removal |
| `next.config.ts` | Modify | Add wildcard hostname pattern |

## Research Conclusion

Both bugs have clean, isolated fixes:
1. **Image deletion**: Add 3-4 lines in useStore.ts to use deleteField()
2. **External domains**: Replace 4 specific domains with 1 wildcard pattern
