# Quickstart: Total Freedom Sprint

**Feature**: 025-image-freedom-fix
**Date**: 2025-12-07
**Estimated Changes**: ~20 lines across 2 files

## Pre-Implementation Checklist

- [x] Read spec.md - 2 user stories (deletion persistence, external domains)
- [x] Read research.md - 5 decision records
- [x] Understand current implementation flow
- [x] Identify exact files and lines to modify

## Implementation Steps

### Step 1: Fix Image Deletion Persistence (hooks/useStore.ts)

**Location**: `hooks/useStore.ts` lines 15 and 105-152

**Changes**:

1. Add `deleteField` to import (line 15):
```typescript
import { doc, setDoc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
```

2. Add deletion handling in `updateItem()` before the `updateDoc()` call (around line 126):
```typescript
// Check if primaryImageUrl is being deleted
const firestoreUpdates: Record<string, unknown> = { ...updates, updated_at: now };

if ('primaryImageUrl' in updates && updates.primaryImageUrl === null) {
  // Use deleteField() to remove the field from Firestore
  firestoreUpdates['primary_image'] = deleteField();
  firestoreUpdates['nobgImages'] = deleteField();
  delete firestoreUpdates.primaryImageUrl;
}

await updateDoc(docRef, firestoreUpdates);
```

### Step 2: Allow All External Image Domains (next.config.ts)

**Location**: `next.config.ts` lines 5-22

**Replace**: Current remotePatterns array with wildcard:
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

## Validation

1. **Lint**: `npm run lint` - must pass
2. **Build**: `npm run build` - must succeed
3. **Manual Test - Deletion**:
   - Navigate to /inventory/[id]/edit with existing image
   - Click remove button
   - Save
   - Reload page
   - Verify image is permanently removed
4. **Manual Test - External Domains**:
   - Create/edit gear item
   - Paste external image URL (e.g., from fjellsport.no)
   - Verify image displays without errors

## Success Criteria

- [x] SC-001: Image deletions persist after save and reload
- [x] SC-002: External HTTPS image URLs display without errors
- [x] SC-003: Lint and build pass
- [x] SC-004: No regression in image upload functionality
