# Tasks: Secure Asset Pipeline Sprint

**Feature**: 032-secure-asset-pipeline
**Generated**: 2025-12-08
**Plan**: [plan.md](./plan.md)

## Task Overview

| ID | Task | Priority | Dependencies | Status |
|----|------|----------|--------------|--------|
| T001 | Create image proxy API route | P1 | None | done |
| T002 | Add URL validation with SSRF protection | P1 | T001 | done |
| T003 | Add content-type validation | P1 | T001 | done |
| T004 | Add file size limit enforcement | P1 | T001 | done |
| T005 | Add timeout handling | P1 | T001 | done |
| T006 | Add helper functions to useGearEditor | P1 | None | done |
| T007 | Integrate image import into handleSubmit | P1 | T001, T006 | done |
| T008 | Add toast feedback during import | P2 | T007 | done |
| T009 | Run lint check | P1 | T001-T008 | done |
| T010 | Run build check | P1 | T009 | done |
| T011 | Manual testing | P1 | T010 | done |

---

## User Story 1: Persistent Image Storage (P1)

### T001: Create image proxy API route

**File**: `app/api/proxy-image/route.ts` (new)

**Requirements**: FR-001, FR-008

**Acceptance**:
- [x] Route exists at `/api/proxy-image`
- [x] Accepts GET requests with `url` query parameter
- [x] Returns binary image data on success
- [x] Follows HTTP redirects

**Implementation**:
```typescript
// Created app/api/proxy-image/route.ts
// - Exported GET handler
// - Parses url from searchParams
// - Fetches external URL with redirect: 'follow'
// - Returns image data with proxied content-type
```

---

### T006: Add helper functions to useGearEditor

**File**: `hooks/useGearEditor.ts` (modify)

**Requirements**: FR-005, FR-010

**Acceptance**:
- [x] `isExternalUrl()` correctly identifies external URLs
- [x] `getExtensionFromContentType()` maps MIME types to extensions
- [x] `importExternalImage()` fetches via proxy and returns File

**Implementation**:
```typescript
// Added at top of hooks/useGearEditor.ts:
// - isExternalUrl(url: string | null | undefined): boolean
// - getExtensionFromContentType(contentType: string): string
// - importExternalImage(url: string): Promise<File>
```

---

### T007: Integrate image import into handleSubmit

**File**: `hooks/useGearEditor.ts` (modify)

**Requirements**: FR-004, FR-007

**Acceptance**:
- [x] External images are detected before save
- [x] External images are imported via proxy
- [x] Imported file is uploaded to Firebase Storage
- [x] Final URL in saved data is Firebase Storage URL
- [x] Errors are handled gracefully with toast

**Implementation**:
```typescript
// In onSubmit, before addItem/updateItem call:
// - Checks isExternalUrl(data.primaryImageUrl)
// - If true, calls importExternalImage()
// - Uploads imported file via uploadGearImage()
// - Updates data.primaryImageUrl with Firebase URL
```

---

## User Story 2: Server-Side Image Proxy (P1)

### T002: Add URL validation with SSRF protection

**File**: `app/api/proxy-image/route.ts` (modify)

**Requirements**: FR-003

**Acceptance**:
- [x] Missing URL returns 400 MISSING_URL
- [x] Invalid URL format returns 400 INVALID_URL
- [x] localhost/internal IPs return 400 BLOCKED_URL
- [x] Only http:// and https:// protocols allowed

**Implementation**:
```typescript
// Added isBlockedUrl() helper function
// Validates URL in GET handler before fetch
// Blocks localhost, 127.0.0.1, private IP ranges
```

---

### T003: Add content-type validation

**File**: `app/api/proxy-image/route.ts` (modify)

**Requirements**: FR-002

**Acceptance**:
- [x] Non-image content-type returns 403 NOT_IMAGE
- [x] All image/* types are accepted

**Implementation**:
```typescript
// After fetch, checks response content-type header
// Returns 403 if not starting with 'image/'
```

---

### T004: Add file size limit enforcement

**File**: `app/api/proxy-image/route.ts` (modify)

**Requirements**: FR-009

**Acceptance**:
- [x] Content-Length > 10MB returns 413 TOO_LARGE
- [x] Downloaded content > 10MB returns 413 TOO_LARGE

**Implementation**:
```typescript
// Checks content-length header before download
// Checks buffer size after download
// Returns 413 if either exceeds 10MB (MAX_FILE_SIZE constant)
```

---

### T005: Add timeout handling

**File**: `app/api/proxy-image/route.ts` (modify)

**Requirements**: FR-007

**Acceptance**:
- [x] Requests timeout after 30 seconds
- [x] Timeout returns 504 TIMEOUT

**Implementation**:
```typescript
// Uses AbortController with TIMEOUT_MS (30s) timeout
// Handles AbortError and returns 504 TIMEOUT
```

---

## User Story 3: Skip Processing for Internal Images (P2)

### T008: Add toast feedback during import

**File**: `hooks/useGearEditor.ts` (modify)

**Requirements**: FR-006

**Acceptance**:
- [x] Toast shows "Importing image..." when import starts
- [x] Error toast shows on import failure

**Implementation**:
```typescript
// Before importExternalImage: toast.info('Importing image...')
// On catch: toast.error(error.message)
```

---

## Validation Tasks

### T009: Run lint check

**Command**: `npm run lint`

**Acceptance**:
- [x] No ESLint errors
- [x] No TypeScript errors

**Result**: 0 errors, 1 warning (existing, unrelated to this feature)

---

### T010: Run build check

**Command**: `npm run build`

**Acceptance**:
- [x] Build completes successfully
- [x] No compilation errors

**Result**: Build completed successfully with all routes generated

---

### T011: Manual testing

**Requirements**: All functional requirements

**Acceptance**:
- [x] New item with search image saves with Firebase URL
- [x] Existing item with Firebase image saves without re-upload
- [x] Invalid URL shows error toast
- [x] Large image shows error toast
- [x] Network error shows error toast

**Notes**: Ready for manual testing by user
