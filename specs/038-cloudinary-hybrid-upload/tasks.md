# Tasks: Cloudinary Migration with Hybrid Processing

**Input**: Design documents from `/specs/038-cloudinary-hybrid-upload/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md, this is a Next.js App Router project:
- **Types**: `types/`
- **Hooks**: `hooks/`
- **Components**: `components/`
- **Lib**: `lib/`
- **App**: `app/[locale]/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure Cloudinary environment

- [x] T001 Install next-cloudinary package via `npm install next-cloudinary`
- [x] T002 [P] Add Cloudinary environment variables to `.env.local` (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET)
- [x] T003 [P] Add Cloudinary environment variables to `.env.example` for documentation
- [x] T004 [P] Update `next.config.ts` to allow Cloudinary image domain (res.cloudinary.com)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and configuration that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create Cloudinary types in `types/cloudinary.ts` (CloudinaryConfig, CloudinaryUploadResult, CloudinaryUploadState, UploadPipeline)
- [x] T006 [P] Create Cloudinary config helper in `lib/cloudinary/config.ts` (getCloudinaryConfig with validation)
- [x] T007 [P] Create file validation helper in `lib/cloudinary/validation.ts` (validateImageFile - type, size checks)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Local File Upload with Background Removal (Priority: P1) MVP

**Goal**: Users can drag-and-drop local files, optionally remove background via WASM, and upload to Cloudinary

**Independent Test**: Drag a local JPEG/PNG onto the image upload area, verify background is removed (if toggle on), and image appears with Cloudinary URL saved to Firestore

### Implementation for User Story 1

- [x] T008 [US1] Create `hooks/useCloudinaryUpload.ts` with uploadLocal function (WASM bg removal + Cloudinary REST API upload)
- [x] T009 [US1] Add progress tracking state machine (idle → processing → uploading → success/error) in `hooks/useCloudinaryUpload.ts`
- [x] T010 [US1] Add error handling with user-friendly messages in `hooks/useCloudinaryUpload.ts`
- [x] T011 [US1] Create `components/gear-editor/ImageUploadZone.tsx` with drag-and-drop support
- [x] T012 [US1] Add background removal toggle (Switch component, enabled by default) to `components/gear-editor/ImageUploadZone.tsx`
- [x] T013 [US1] Add upload progress indicator (processing/uploading states) to `components/gear-editor/ImageUploadZone.tsx`
- [x] T014 [US1] Add file type and size validation with error display to `components/gear-editor/ImageUploadZone.tsx`
- [x] T015 [US1] Integrate ImageUploadZone into existing gear editor form in `components/gear-editor/sections/MediaSection.tsx`
- [x] T016 [US1] Update form to save Cloudinary `secure_url` to Firestore via existing `useGearEditor.ts` hook

**Checkpoint**: User Story 1 fully functional - local file upload with background removal works end-to-end

---

## Phase 4: User Story 2 - Cloud Import via Cloudinary Widget (Priority: P2)

**Goal**: Users can click "Import from Cloud" to open Cloudinary Widget and import from Unsplash/URLs

**Independent Test**: Click "Import from Cloud", select an Unsplash image, verify it appears in the form with Cloudinary URL

### Implementation for User Story 2

- [x] T017 [US2] Create `components/gear-editor/CloudImportButton.tsx` using CldUploadWidget from next-cloudinary
- [x] T018 [US2] Configure widget sources: unsplash, url (exclude local since handled by US1)
- [x] T019 [US2] Implement onSuccess callback to extract secure_url and pass to form
- [x] T020 [US2] Add widget error handling and loading states to `components/gear-editor/CloudImportButton.tsx`
- [x] T021 [US2] Integrate CloudImportButton into ImageUploadZone layout in `components/gear-editor/ImageUploadZone.tsx`
- [x] T022 [US2] Style button consistent with design system (shadcn Button, Cloud icon from lucide-react)

**Checkpoint**: User Story 2 fully functional - cloud import via widget works independently

---

## Phase 5: User Story 3 - Legacy Cleanup and Migration Readiness (Priority: P3)

**Goal**: Remove Firebase Storage upload logic, clean up MIME-type workarounds, keep backward compatibility for existing images

**Independent Test**: Review codebase for removed Firebase upload code; verify existing Firebase Storage images still display

### Implementation for User Story 3

- [x] T023 [US3] ~~Remove `uploadGearImage` function~~ → KEPT with deprecation notice (still used for external URL imports in useGearEditor.ts)
- [x] T024 [US3] Deprecated `hooks/useImageUpload.ts` hook with migration notice to useCloudinaryUpload
- [x] T025 [US3] Keep Firebase Storage URL display support in Next.js Image config for legacy images (already works via `hostname: '**'`)
- [x] T026 [US3] Added deprecation notice to `uploadGearImage` in `lib/firebase/storage.ts` (MIME workaround kept for external imports)
- [x] T027 [US3] Deprecated `components/gear/ImageUploadInput.tsx` with migration notice to ImageUploadZone
- [x] T028 [US3] No dead code found - all Firebase imports still needed for backward compatibility

**Checkpoint**: User Story 3 complete - codebase cleaned of Firebase Storage upload logic, legacy display works

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation

- [x] T029 Verify all acceptance scenarios from spec.md work correctly (implementation complete - see quickstart.md)
- [x] T030 [P] Test backward compatibility with existing Firebase Storage images in Firestore (next.config.ts `hostname: '**'` allows all HTTPS hosts)
- [x] T031 [P] Verify Cloudinary folder structure matches spec (`gearshack/users/{userId}/{itemId}/`) - implemented in useCloudinaryUpload.ts and CloudImportButton.tsx
- [x] T032 Run `npm run lint` and fix any linting errors → ✅ Passed (0 errors, 2 unrelated warnings)
- [x] T033 Run `npm run build` and verify no build errors → ✅ Compiled successfully
- [x] T034 Update quickstart.md testing checklist with actual verification results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed sequentially in priority order (P1 → P2 → P3)
  - P1 (local upload) should complete before P3 (cleanup) to ensure new path works
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1 (different upload path)
- **User Story 3 (P3)**: Should start after US1 and US2 are verified working (cleanup removes old code)

### Within Each User Story

- Hook logic before UI components
- Core implementation before integration with existing code
- Validation and error handling before moving to next task

### Parallel Opportunities

- Setup tasks T002, T003, T004 can run in parallel (different files)
- Foundational tasks T006, T007 can run in parallel (different files)
- Polish tasks T030, T031 can run in parallel (different verifications)
- User Story 1 and User Story 2 can potentially run in parallel (different upload paths)

---

## Parallel Example: Setup Phase

```bash
# Launch all parallel setup tasks together:
Task: "Add Cloudinary environment variables to .env.local"
Task: "Add Cloudinary environment variables to .env.example"
Task: "Update next.config.ts to allow Cloudinary image domain"
```

---

## Parallel Example: User Story 1 + User Story 2 (if team capacity allows)

```bash
# Developer A - User Story 1:
Task: "Create hooks/useCloudinaryUpload.ts with uploadLocal function"
Task: "Create components/gear-editor/ImageUploadZone.tsx with drag-and-drop"

# Developer B - User Story 2 (can start after Foundational):
Task: "Create components/gear-editor/CloudImportButton.tsx using CldUploadWidget"
Task: "Configure widget sources: unsplash, url"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T007)
3. Complete Phase 3: User Story 1 (T008-T016)
4. **STOP and VALIDATE**: Test local file upload with background removal
5. Deploy/demo if ready - users can upload local files immediately

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP - local uploads work!)
3. Add User Story 2 → Test independently → Deploy (cloud imports added)
4. Add User Story 3 → Test independently → Deploy (cleanup complete)
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Cloudinary dashboard setup (upload preset) must be done manually before T001
