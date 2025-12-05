# Tasks: The Great Sync

**Feature**: 010-firestore-sync
**Generated**: 2025-12-05
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Overview

This task list implements Firestore real-time sync for the Gearshack web app. Tasks are organized by phase and user story, with dependencies clearly marked. Tasks marked with **[P]** can be run in parallel using multiple subagents.

## Parallel Execution Guide

To maximize development speed, use multiple `nextjs-geargraph-architect` subagents in parallel for tasks marked with **[P]**. Example:

```
Task tool invocations (in single message):
- Agent 1: T001 (types/sync.ts)
- Agent 2: T002 (adapter.schema.ts Zod exports)
- Agent 3: T003 (storage.schema.ts Zod exports)
```

---

## Phase 1: Setup - Types and Schemas

Foundation types and Zod schemas. **All tasks in this phase can run in parallel [P].**

| ID | Task | File | Depends On | Priority |
|----|------|------|------------|----------|
| T001 | **[P]** Create SyncState type and defaults | `types/sync.ts` | - | P1 |
| T002 | **[P]** Export Zod schemas from adapter contracts to lib | `lib/validations/adapter.ts` | - | P1 |
| T003 | **[P]** Export Zod schemas from storage contracts to lib | `lib/validations/storage.ts` | - | P2 |

### T001: Create SyncState Type

**File**: `types/sync.ts` (NEW)

**Description**: Create TypeScript interfaces for sync state management. Reference `contracts/sync-types.schema.ts`.

**Acceptance Criteria**:
- [X] Export `SyncStatus` type: `'idle' | 'syncing' | 'error'`
- [X] Export `SyncState` interface with: status, pendingOperations, lastSyncedAt, error
- [X] Export `DEFAULT_SYNC_STATE` constant
- [X] TypeScript strict mode compliance (no `any`)

---

### T002: Export Adapter Zod Schemas

**File**: `lib/validations/adapter.ts` (NEW)

**Description**: Re-export Zod schemas from contracts for use in adapter functions. Reference `contracts/adapter.schema.ts`.

**Acceptance Criteria**:
- [X] Export `FirestoreGearItemSchema` with validation
- [X] Export `FirestoreLoadoutSchema` with validation
- [X] Export `FirestoreTimestampSchema` for timestamp conversion
- [X] Export helper functions: `validateGearItem`, `validateLoadout`
- [X] Include fallback category map

---

### T003: Export Storage Zod Schemas

**File**: `lib/validations/storage.ts` (NEW)

**Description**: Re-export storage validation schemas. Reference `contracts/storage.schema.ts`.

**Acceptance Criteria**:
- [X] Export `STORAGE_CONFIG` constants
- [X] Export `UploadRequestSchema` and `UploadResultSchema`
- [X] Export `validateUploadFile` helper
- [X] Export `generateStoragePath` helper

---

## Phase 2: Foundation - Adapter and Store Extensions

Build core infrastructure. **T004-T006 can run in parallel [P] after Phase 1 completes.**

| ID | Task | File | Depends On | Priority |
|----|------|------|------------|----------|
| T004 | **[P]** Create legacy data adapter | `lib/firebase/adapter.ts` | T002 | P1 |
| T005 | **[P]** Create storage upload service | `lib/firebase/storage.ts` | T003 | P2 |
| T006 | **[P]** Extend useStore with sync methods | `hooks/useStore.ts` | T001 | P1 |

### T004: Create Legacy Data Adapter

**File**: `lib/firebase/adapter.ts` (NEW)

**Description**: Transform Flutter app Firestore data to web app interfaces. Handle snake_case → camelCase, Timestamps → Dates, missing fields → defaults.

**Acceptance Criteria**:
- [X] `adaptGearItem(doc: unknown, id: string): GearItem` - transforms Firestore doc
- [X] `adaptLoadout(doc: unknown, id: string): Loadout` - transforms Firestore doc
- [X] `prepareGearItemForFirestore(item: GearItem): object` - reverse transform for writes
- [X] `prepareLoadoutForFirestore(loadout: Loadout): object` - reverse transform
- [X] Handle Firestore Timestamp → Date conversion
- [X] Apply category fallbacks for invalid values
- [X] Preserve unknown fields (passthrough)
- [X] Use Zod for validation with graceful error handling

**Reference**: See `research.md` Section 2 for field mappings.

---

### T005: Create Storage Upload Service

**File**: `lib/firebase/storage.ts` (NEW)

**Description**: Image upload service for gear items using Firebase Storage.

**Acceptance Criteria**:
- [X] `uploadGearImage(file: File, userId: string): Promise<UploadResult>` - main upload function
- [X] Validate file size (max 10MB) before upload
- [X] Validate MIME type (image/jpeg, image/png, image/webp, image/gif)
- [X] Generate path: `user-uploads/{userId}/gear/{timestamp}-{filename}`
- [X] Return download URL on success
- [X] Throw typed errors on failure (`UploadError` with code)

**Reference**: See `research.md` Section 5 and `contracts/storage.schema.ts`.

---

### T006: Extend useStore with Sync Methods

**File**: `hooks/useStore.ts` (MODIFY)

**Description**: Add methods to Zustand store for Firestore sync operations.

**Acceptance Criteria**:
- [X] Add `syncState: SyncState` to store state
- [X] Add `setSyncState(state: Partial<SyncState>)` action
- [X] Add `setRemoteGearItems(items: GearItem[])` - replaces all items from Firestore
- [X] Add `setRemoteLoadouts(loadouts: Loadout[])` - replaces all loadouts
- [X] Add `incrementPendingOps()` and `decrementPendingOps()` helpers
- [ ] Update `addGearItem`, `updateGearItem`, `deleteGearItem` to return Promise
- [X] Maintain backwards compatibility with existing UI code

---

## Phase 3: US1 - Real-Time Gear Inventory Sync (P1)

Implement real-time Firestore sync for gear items.

| ID | Task | File | Depends On | Priority |
|----|------|------|------------|----------|
| T007 | Create useFirestoreSync hook | `hooks/useFirestoreSync.ts` | T004, T006 | P1 |
| T008 | Implement gear inventory listener | `hooks/useFirestoreSync.ts` | T007 | P1 |
| T009 | Add pending writes tracking | `hooks/useFirestoreSync.ts` | T008 | P1 |
| T010 | Integrate sync hook in app layout | `app/layout.tsx` | T008 | P1 |

### T007: Create useFirestoreSync Hook

**File**: `hooks/useFirestoreSync.ts` (NEW)

**Description**: Core sync hook that manages Firestore real-time listeners.

**Acceptance Criteria**:
- [X] Import Firebase SDK: `onSnapshot`, `collection`, `doc`
- [X] Use `useAuth` to get current user
- [X] Use `useStore` to access and update state
- [X] Set up useEffect that triggers on auth state change
- [X] Clean up listeners on unmount
- [X] Export hook for use in layout

---

### T008: Implement Gear Inventory Listener

**File**: `hooks/useFirestoreSync.ts` (MODIFY)

**Description**: Add real-time listener for gear inventory collection.

**Acceptance Criteria**:
- [X] Listen to `userBase/{uid}/gearInventory` collection
- [X] Transform documents using `adaptGearItem` from adapter
- [X] Call `setRemoteGearItems` with transformed data
- [X] Handle listener errors - set sync state to 'error'
- [X] Update sync state: 'syncing' on start, 'idle' on snapshot
- [X] Log errors to console with context

**Reference**: See `research.md` Section 1 for onSnapshot pattern.

---

### T009: Add Pending Writes Tracking

**File**: `hooks/useFirestoreSync.ts` (MODIFY)

**Description**: Prevent infinite sync loops by tracking local writes.

**Acceptance Criteria**:
- [X] Create `pendingWrites` Set to track in-flight document IDs
- [X] Export `markPendingWrite(id: string)` function
- [X] Export `clearPendingWrite(id: string)` function
- [X] In snapshot listener, skip documents in pendingWrites set
- [X] Clear pending write after snapshot confirms the change

**Reference**: See `research.md` Section 4 for loop prevention pattern.

---

### T010: Integrate Sync Hook in App Layout

**File**: `app/layout.tsx` (MODIFY)

**Description**: Initialize Firestore sync when app loads.

**Acceptance Criteria**:
- [X] Import `useFirestoreSync` hook
- [X] Call hook in layout (via client component wrapper if needed)
- [X] Ensure hook only runs once per app instance
- [X] Verify no SSR issues (hook should be client-only)

---

## Phase 4: US2 - Real-Time Loadout Sync (P1)

Extend sync to loadouts collection. **T011-T012 can run in parallel [P].**

| ID | Task | File | Depends On | Priority |
|----|------|------|------------|----------|
| T011 | **[P]** Implement loadout listener | `hooks/useFirestoreSync.ts` | T008 | P1 |
| T012 | **[P]** Add loadout pending writes | `hooks/useFirestoreSync.ts` | T009 | P1 |

### T011: Implement Loadout Listener

**File**: `hooks/useFirestoreSync.ts` (MODIFY)

**Description**: Add real-time listener for loadouts collection.

**Acceptance Criteria**:
- [X] Listen to `userBase/{uid}/loadouts` collection
- [X] Transform documents using `adaptLoadout` from adapter
- [X] Call `setRemoteLoadouts` with transformed data
- [X] Handle listener errors
- [X] Coordinate sync state with gear listener (both must complete for 'idle')

---

### T012: Add Loadout Pending Writes

**File**: `hooks/useFirestoreSync.ts` (MODIFY)

**Description**: Extend pending writes tracking for loadouts.

**Acceptance Criteria**:
- [X] Create separate `pendingLoadoutWrites` Set
- [X] Export `markPendingLoadoutWrite` and `clearPendingLoadoutWrite`
- [X] Skip loadout documents in pending set during snapshot processing

---

## Phase 5: US3 - Gear CRUD with Cloud Persistence (P1)

Implement optimistic CRUD operations. **T013-T015 can run in parallel [P].**

| ID | Task | File | Depends On | Priority |
|----|------|------|------------|----------|
| T013 | **[P]** Implement addGearItem with Firestore | `hooks/useStore.ts` | T004, T009 | P1 |
| T014 | **[P]** Implement updateGearItem with Firestore | `hooks/useStore.ts` | T004, T009 | P1 |
| T015 | **[P]** Implement deleteGearItem with Firestore | `hooks/useStore.ts` | T009 | P1 |
| T016 | Add error handling and rollback | `hooks/useStore.ts` | T013-T015 | P1 |
| T017 | **[P]** Implement loadout CRUD | `hooks/useStore.ts` | T012 | P1 |

### T013: Implement addGearItem with Firestore

**File**: `hooks/useStore.ts` (MODIFY)

**Description**: Add Firestore write to addGearItem action.

**Acceptance Criteria**:
- [X] Generate UUID for new item if not provided
- [X] Apply optimistic update to local state immediately
- [X] Mark pending write before Firestore call
- [X] Write to `userBase/{uid}/gearInventory/{id}` using setDoc
- [X] Use `prepareGearItemForFirestore` for transformation
- [X] Return Promise that resolves on success
- [X] Show success toast on completion

**Reference**: See `research.md` Section 3 for optimistic update pattern.

---

### T014: Implement updateGearItem with Firestore

**File**: `hooks/useStore.ts` (MODIFY)

**Description**: Add Firestore write to updateGearItem action.

**Acceptance Criteria**:
- [X] Store previous state for rollback
- [X] Apply optimistic update immediately
- [X] Mark pending write
- [X] Use updateDoc with merge option (preserve unknown fields)
- [X] Update `updatedAt` timestamp
- [X] Return Promise

---

### T015: Implement deleteGearItem with Firestore

**File**: `hooks/useStore.ts` (MODIFY)

**Description**: Add Firestore delete to deleteGearItem action.

**Acceptance Criteria**:
- [X] Store item for rollback
- [X] Remove from local state immediately
- [X] Mark pending write
- [X] Delete from Firestore using deleteDoc
- [X] Handle cascade: remove item from any loadouts
- [X] Return Promise

---

### T016: Add Error Handling and Rollback

**File**: `hooks/useStore.ts` (MODIFY)

**Description**: Implement rollback logic for failed CRUD operations.

**Acceptance Criteria**:
- [X] Wrap Firestore operations in try-catch
- [X] On error: rollback local state to previous
- [X] On error: show error toast with message
- [X] On error: set sync state to 'error'
- [X] Clear pending write on both success and failure
- [X] Log detailed error to console

---

### T017: Implement Loadout CRUD

**File**: `hooks/useStore.ts` (MODIFY)

**Description**: Add Firestore persistence to loadout operations.

**Acceptance Criteria**:
- [X] `addLoadout`: optimistic add + setDoc
- [X] `updateLoadout`: optimistic update + updateDoc
- [X] `deleteLoadout`: optimistic delete + deleteDoc
- [X] Use `prepareLoadoutForFirestore` transformation
- [X] Mark pending loadout writes
- [X] Handle errors with rollback

---

## Phase 6: US4 - Image Upload for Gear Items (P2)

Implement image upload functionality.

| ID | Task | File | Depends On | Priority |
|----|------|------|------------|----------|
| T018 | Create useImageUpload hook | `hooks/useImageUpload.ts` | T005 | P2 |
| T019 | Integrate upload in GearEditor | `components/gear/GearEditor.tsx` | T018 | P2 |
| T020 | Add upload progress UI | `components/gear/GearEditor.tsx` | T019 | P2 |

### T018: Create useImageUpload Hook

**File**: `hooks/useImageUpload.ts` (NEW)

**Description**: Hook to manage image upload state and operations.

**Acceptance Criteria**:
- [X] Import `uploadGearImage` from storage service
- [X] Track upload state: idle, uploading, success, error
- [X] Track upload progress percentage (if available)
- [X] `upload(file: File): Promise<string>` returns download URL
- [X] Handle validation errors (file size, type)
- [X] Show toast on error

---

### T019: Integrate Upload in GearEditor

**File**: `components/gear/GearEditor.tsx` (MODIFY)

**Description**: Connect image upload to gear editor form.

**Acceptance Criteria**:
- [X] Import `useImageUpload` hook
- [X] Add file input for image selection
- [X] On file select, trigger upload
- [X] On upload success, set `primaryImageUrl` field
- [X] Show preview of uploaded image
- [X] Handle upload errors gracefully

---

### T020: Add Upload Progress UI

**File**: `components/gear/GearEditor.tsx` (MODIFY)

**Description**: Visual feedback during image upload.

**Acceptance Criteria**:
- [X] Show loading spinner on save button during upload
- [X] Disable save button during upload
- [X] Show upload progress if available
- [X] Clear loading state on completion or error

---

## Phase 7: US5 - Sync Status Visibility (P2)

Add sync indicator to header.

| ID | Task | File | Depends On | Priority |
|----|------|------|------------|----------|
| T021 | Create SyncIndicator component | `components/layout/SyncIndicator.tsx` | T006 | P2 |
| T022 | Integrate in SiteHeader | `components/layout/SiteHeader.tsx` | T021 | P2 |

### T021: Create SyncIndicator Component

**File**: `components/layout/SyncIndicator.tsx` (NEW)

**Description**: Visual indicator showing current sync status.

**Acceptance Criteria**:
- [X] Import `useStore` to access syncState
- [X] Render cloud icon (from lucide-react)
- [X] `idle`: Static cloud icon, subtle opacity
- [X] `syncing`: Cloud icon with pulse animation
- [X] `error`: Cloud icon with warning badge/color
- [X] Tooltip showing detailed status on hover
- [X] Accessible: include aria-label

---

### T022: Integrate in SiteHeader

**File**: `components/layout/SiteHeader.tsx` (MODIFY)

**Description**: Add sync indicator to site header.

**Acceptance Criteria**:
- [X] Import `SyncIndicator` component
- [X] Position in header (near user avatar or right side)
- [X] Only show when user is authenticated
- [X] Ensure responsive layout (hide label on mobile, show icon only)

---

## Phase 8: Polish and Validation

Final testing and cleanup.

| ID | Task | File | Depends On | Priority |
|----|------|------|------------|----------|
| T023 | Run lint and build | - | T001-T022 | P1 |
| T024 | Manual test: Scenario 1-3 | - | T023 | P1 |
| T025 | Manual test: Scenario 4-6 | - | T023 | P1 |
| T026 | Manual test: Scenario 7-10 | - | T023 | P2 |
| T027 | Update quickstart checklist | `specs/010-firestore-sync/quickstart.md` | T024-T026 | P2 |

### T023: Run Lint and Build

**Description**: Verify code quality and build success.

**Acceptance Criteria**:
- [X] `npm run lint` passes with no errors
- [X] `npm run build` completes successfully
- [X] No TypeScript errors in strict mode

---

### T024: Manual Test - Core Sync (Scenarios 1-3)

**Description**: Validate core sync functionality per quickstart.md.

**Reference**: `quickstart.md` Scenarios 1-3

**Acceptance Criteria**:
- [ ] Scenario 1: Initial data loads on login
- [ ] Scenario 2: Real-time updates between tabs
- [ ] Scenario 3: Create gear item persists

---

### T025: Manual Test - CRUD Operations (Scenarios 4-6)

**Description**: Validate CRUD and image upload per quickstart.md.

**Reference**: `quickstart.md` Scenarios 4-6

**Acceptance Criteria**:
- [ ] Scenario 4: Update gear item persists
- [ ] Scenario 5: Delete gear item persists
- [ ] Scenario 6: Image upload works

---

### T026: Manual Test - Edge Cases (Scenarios 7-10)

**Description**: Validate edge cases per quickstart.md.

**Reference**: `quickstart.md` Scenarios 7-10

**Acceptance Criteria**:
- [ ] Scenario 7: Legacy data transforms correctly
- [ ] Scenario 8: Error recovery works
- [ ] Scenario 9: Loadout sync works
- [ ] Scenario 10: Multi-device consistency

---

### T027: Update Quickstart Checklist

**File**: `specs/010-firestore-sync/quickstart.md` (MODIFY)

**Description**: Mark completed validation scenarios.

**Acceptance Criteria**:
- [ ] Update validation checklist with pass/fail status
- [ ] Document any known issues
- [ ] Note performance benchmark results

---

## Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Phase 1: Setup | T001-T003 | All 3 tasks [P] |
| Phase 2: Foundation | T004-T006 | All 3 tasks [P] |
| Phase 3: US1 Gear Sync | T007-T010 | Sequential |
| Phase 4: US2 Loadout Sync | T011-T012 | Both tasks [P] |
| Phase 5: US3 CRUD | T013-T017 | T013-T015 [P], T017 [P] |
| Phase 6: US4 Images | T018-T020 | Sequential |
| Phase 7: US5 Status | T021-T022 | Sequential |
| Phase 8: Polish | T023-T027 | T024-T026 [P] |

**Total Tasks**: 27
**P1 Tasks**: 18 (Must complete)
**P2 Tasks**: 9 (Should complete)
**Maximum Parallel Agents**: 3 (Phase 1, Phase 2, Phase 5)

---

## Parallel Execution Examples

### Example 1: Phase 1 (3 agents)

```
# Launch in single message with 3 Task tool invocations:
Agent 1 (nextjs-geargraph-architect): "Implement T001 - Create types/sync.ts with SyncState type, SyncStatus enum, and DEFAULT_SYNC_STATE constant"
Agent 2 (nextjs-geargraph-architect): "Implement T002 - Create lib/validations/adapter.ts exporting Zod schemas from contracts/adapter.schema.ts"
Agent 3 (nextjs-geargraph-architect): "Implement T003 - Create lib/validations/storage.ts exporting Zod schemas from contracts/storage.schema.ts"
```

### Example 2: Phase 2 (3 agents)

```
# After Phase 1 completes:
Agent 1 (nextjs-geargraph-architect): "Implement T004 - Create lib/firebase/adapter.ts with adaptGearItem, adaptLoadout, and prepare* functions"
Agent 2 (nextjs-geargraph-architect): "Implement T005 - Create lib/firebase/storage.ts with uploadGearImage function"
Agent 3 (nextjs-geargraph-architect): "Implement T006 - Modify hooks/useStore.ts to add syncState, setRemoteGearItems, setRemoteLoadouts"
```

### Example 3: Phase 5 CRUD (3 agents)

```
# After T009 completes:
Agent 1 (nextjs-geargraph-architect): "Implement T013 - Add Firestore write to addGearItem in hooks/useStore.ts"
Agent 2 (nextjs-geargraph-architect): "Implement T014 - Add Firestore write to updateGearItem in hooks/useStore.ts"
Agent 3 (nextjs-geargraph-architect): "Implement T015 - Add Firestore delete to deleteGearItem in hooks/useStore.ts"
```
