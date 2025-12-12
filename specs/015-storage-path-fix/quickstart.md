# Quickstart: Storage Path Alignment & Loadout Crash Fix

**Feature**: 015-storage-path-fix
**Time Estimate**: 15-30 minutes
**Prerequisites**: Feature 010-firestore-sync completed

## Quick Summary

Fix image upload permissions by changing storage path from `user-uploads/{userId}/gear/` to `userBase/{userId}/inventory/` to match Firebase Security Rules.

## Implementation Steps

### Step 1: Fix Storage Path (Critical - US1)

**File**: `lib/validations/storage.ts`

Change lines 27-30:

```diff
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
-  BASE_PATH: 'user-uploads',
-  GEAR_SUBDIR: 'gear',
+  BASE_PATH: 'userBase',
+  GEAR_SUBDIR: 'inventory',
};
```

### Step 2: Verify LoadoutCard Guard (US2 - Already Done)

**File**: `components/loadouts/LoadoutCard.tsx:44-48`

Confirm this code exists (no changes needed):

```typescript
if (!loadout.id || !/^[a-zA-Z0-9_-]{10,}$/.test(loadout.id)) {
  console.warn('[LoadoutCard] Invalid loadout ID, skipping render:', loadout.id);
  return null;
}
```

### Step 3: Enhance Error Messages (Optional - US3)

**File**: `hooks/useImageUpload.ts`

Add import at top:
```typescript
import { StorageUploadError } from '@/lib/firebase/storage';
```

Replace catch block (lines 102-107):

```typescript
} catch (err) {
  let message = 'Upload failed. Please try again.';

  if (err instanceof StorageUploadError) {
    switch (err.code) {
      case 'FILE_TOO_LARGE':
        message = 'File is too large. Maximum size is 10MB.';
        break;
      case 'INVALID_FILE_TYPE':
        message = 'Invalid file type. Please use JPG, PNG, WebP, or GIF.';
        break;
      case 'NOT_AUTHENTICATED':
        message = 'Permission denied. Please log in again.';
        break;
      case 'UPLOAD_FAILED':
        message = 'Upload failed. Please check your connection and try again.';
        break;
    }
  }

  setError(message);
  setStatus('error');
  toast.error(message);
  return null;
}
```

## Testing Checklist

- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run build` - no errors
- [ ] Log in to app
- [ ] Open gear editor
- [ ] Upload an image
- [ ] Verify upload succeeds (no permission error)
- [ ] Check image displays in preview
- [ ] Navigate to loadouts page - no crashes
- [ ] (Optional) Test error messages by uploading invalid file types

## Rollback Plan

If issues occur, revert `lib/validations/storage.ts` to:
```typescript
BASE_PATH: 'user-uploads',
GEAR_SUBDIR: 'gear',
```

Note: This will break uploads again but matches the pre-fix state.
