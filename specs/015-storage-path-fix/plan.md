# Implementation Plan: Storage Path Alignment & Loadout Crash Fix

**Branch**: `015-storage-path-fix` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-storage-path-fix/spec.md`

## Summary

Fix two critical bugs: (1) Image uploads fail due to storage path mismatch with Firebase Security Rules - change path from `user-uploads/{userId}/gear/` to `userBase/{userId}/inventory/`, and (2) LoadoutCard crashes when rendering loadouts with invalid IDs (hex colors from legacy data) - add guard clause to skip invalid entries.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, Firebase SDK (auth, firestore, storage), Zod 4.x, shadcn/ui, sonner (toast)
**Storage**: Firebase Storage (`userBase/{userId}/inventory/`), Firebase Firestore
**Testing**: Manual testing (no automated tests in scope)
**Target Platform**: Web (modern browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Uploads complete within 5 seconds for typical images
**Constraints**: Must match existing Firebase Security Rules path pattern
**Scale/Scope**: Single-user gear management app

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| UI components stateless | PASS | Changes are in validation/service layer |
| Logic in hooks | PASS | useImageUpload hook handles upload logic |
| Types in `@/types` | PASS | Existing types sufficient |
| Use shadcn/ui | PASS | Toast notifications via sonner |
| No separate CSS files | PASS | No styling changes |

## Project Structure

### Documentation (this feature)

```text
specs/015-storage-path-fix/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Code analysis
├── quickstart.md        # Implementation guide
└── checklists/
    └── requirements.md  # Validation checklist
```

### Source Code (files to modify)

```text
lib/
└── validations/
    └── storage.ts       # STORAGE_CONFIG path constants (PRIMARY FIX)

components/
└── loadouts/
    └── LoadoutCard.tsx  # ID validation guard (ALREADY IMPLEMENTED)

hooks/
└── useImageUpload.ts    # Error toast handling (VERIFY/ENHANCE)
```

**Structure Decision**: Minimal changes - only `lib/validations/storage.ts` needs modification. LoadoutCard already has the guard clause.

## Complexity Tracking

No violations - this is a simple configuration fix with minimal code changes.

## Implementation Details

### US1: Storage Path Fix (P1)

**Current Implementation** (`lib/validations/storage.ts:14-31`):
```typescript
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  BASE_PATH: 'user-uploads',  // WRONG - doesn't match security rules
  GEAR_SUBDIR: 'gear',        // WRONG - should be 'inventory'
};
```

**Required Change**:
```typescript
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  BASE_PATH: 'userBase',      // FIXED - matches security rules
  GEAR_SUBDIR: 'inventory',   // FIXED - matches security rules
};
```

**Path Generation** (`lib/validations/storage.ts:111-118`):
```typescript
// Current: user-uploads/{userId}/gear/{timestamp}-{filename}
// Fixed:   userBase/{userId}/inventory/{timestamp}-{filename}
return `${STORAGE_CONFIG.BASE_PATH}/${userId}/${STORAGE_CONFIG.GEAR_SUBDIR}/${timestamp}-${safeName}`;
```

### US2: LoadoutCard Crash Prevention (P1)

**Already Implemented** (`components/loadouts/LoadoutCard.tsx:44-48`):
```typescript
// FR-004: Guard against invalid loadout IDs (e.g., hex colors, malformed data)
if (!loadout.id || !/^[a-zA-Z0-9_-]{10,}$/.test(loadout.id)) {
  console.warn('[LoadoutCard] Invalid loadout ID, skipping render:', loadout.id);
  return null;
}
```

This guard clause already:
- Checks for null/undefined IDs
- Validates ID format (alphanumeric, underscores, hyphens, min 10 chars)
- Rejects hex color codes like "#4660a"
- Logs warning for debugging

**Status**: FR-004, FR-005, FR-006 already satisfied.

### US3: Error Message Improvements (P2)

**Current Implementation** (`hooks/useImageUpload.ts:102-107`):
```typescript
} catch (err) {
  const message = err instanceof Error ? err.message : 'Upload failed';
  setError(message);
  setStatus('error');
  toast.error(message);
  return null;
}
```

**Enhancement** - Add specific error messages based on error type:
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

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing uploads orphaned | Low | Low | Old files in `user-uploads/` remain accessible, no data loss |
| Security rules mismatch | Medium | High | Test upload immediately after change |
| LoadoutCard regression | Low | Low | Guard clause already tested in feature 014 |

## Testing Strategy

1. **US1 Testing**:
   - Log in to app
   - Open gear editor
   - Upload an image
   - Verify upload succeeds without permission errors
   - Check Firebase Storage console for correct path

2. **US2 Testing**:
   - Already implemented and tested
   - Verify no regression

3. **US3 Testing**:
   - Trigger upload errors (disconnect network, large file)
   - Verify specific error messages appear

## Dependencies

- Firebase Storage security rules (already configured for `userBase/{userId}/inventory/`)
- Sonner toast library (already installed)
- No new dependencies required
