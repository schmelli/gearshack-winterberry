# Tasks: Restore Product Search with Cloudinary Integration

**Input**: Design documents from `/specs/039-product-search-cloudinary/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: No automated tests requested - manual testing per acceptance scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Next.js App Router structure:
- **Hooks**: `hooks/`
- **Components**: `components/gear-editor/`
- **Types**: `types/`
- **Server Actions**: `app/actions/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify prerequisites and existing infrastructure

- [x] T001 Verify Serper API key configured in `.env.local` (SERPER_API_KEY)
- [x] T002 [P] Verify existing `searchGearImages` server action works in `app/actions/image-search.ts`
- [x] T003 [P] Verify Cloudinary configuration in `.env.local` (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET)
- [x] T004 [P] Add `ProductSearchStatus` type to `types/cloudinary.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create `hooks/useProductSearch.ts` with `UseProductSearchReturn` interface from data-model.md
- [x] T006 Implement search state management (query, results, status, error) in `hooks/useProductSearch.ts`
- [x] T007 Add `uploadUrl` method signature to `UseCloudinaryUploadReturn` interface in `hooks/useCloudinaryUpload.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Search and Select Specific Product Image (Priority: P1) 🎯 MVP

**Goal**: Users can search for specific product images (e.g., "Nitecore NB10000") and select one to upload to Cloudinary

**Independent Test**: Open gear editor, type "MSR Hubba Hubba tent" in search field, click Search, verify image grid appears with relevant product images, click one image, verify it uploads to Cloudinary and appears in form

**⚠️ Constitution Compliance (Principle I)**: `ImageUploadZone.tsx` MUST remain stateless. Use `useProductSearch` and `useCloudinaryUpload` hooks directly in the component - do NOT lift state to parent or add `useState` for search state in the component file.

### Implementation for User Story 1

- [x] T008 [US1] Implement `uploadUrl` method in `hooks/useCloudinaryUpload.ts` (pass URL to Cloudinary REST API per research.md)
- [x] T009 [US1] Implement debounced search function (300ms) in `hooks/useProductSearch.ts`
- [x] T010 [US1] Add error handling and toast notifications to `hooks/useProductSearch.ts`
- [x] T011 [P] [US1] Create `components/gear-editor/ProductSearchGrid.tsx` - stateless grid component for 3x3 image results
- [x] T012 [US1] Add search input field and button to top of `components/gear-editor/ImageUploadZone.tsx`
- [x] T013 [US1] Integrate `useProductSearch` hook into `components/gear-editor/ImageUploadZone.tsx`
- [x] T014 [US1] Wire ProductSearchGrid image click to `uploadUrl` method in `components/gear-editor/ImageUploadZone.tsx`
- [x] T015 [US1] Handle successful upload - update form field with Cloudinary `secure_url` in `components/gear-editor/ImageUploadZone.tsx`
- [x] T016 [US1] Add "No results found" empty state to `components/gear-editor/ProductSearchGrid.tsx`

**Checkpoint**: User Story 1 complete - users can search and select product images via Cloudinary

---

## Phase 4: User Story 2 - Visual Feedback During Search and Upload (Priority: P1)

**Goal**: Users see loading indicators during search and upload progress during Cloudinary upload

**Independent Test**: Click search and observe loading indicator, select an image and observe upload progress indicator until completion

### Implementation for User Story 2

- [x] T017 [US2] Add loading spinner to search button during search in `components/gear-editor/ImageUploadZone.tsx`
- [x] T018 [US2] Add overlay loading state to ProductSearchGrid when uploading selected image in `components/gear-editor/ProductSearchGrid.tsx`
- [x] T019 [US2] Show upload progress percentage from `useCloudinaryUpload` in `components/gear-editor/ImageUploadZone.tsx`
- [x] T020 [US2] Add success toast notification on upload complete in `hooks/useCloudinaryUpload.ts`
- [x] T021 [US2] Add error message display below search input on search failure in `components/gear-editor/ImageUploadZone.tsx`
- [x] T022 [US2] Add error message display on upload failure with retry option in `components/gear-editor/ImageUploadZone.tsx`

**Checkpoint**: User Story 2 complete - users have full visual feedback for search and upload operations

---

## Phase 5: User Story 3 - Demote Cloud Import Widget to Secondary Option (Priority: P2)

**Goal**: Reorganize UI hierarchy - Product Search primary, Drag-drop secondary, Cloud Import tertiary

**Independent Test**: Verify ImageUploadZone shows Product Search prominently at top, Cloud Import (Unsplash) at bottom

### Implementation for User Story 3

- [x] T023 [US3] Reorganize `components/gear-editor/ImageUploadZone.tsx` layout per research.md UI diagram
- [x] T024 [US3] Add "Or" divider between search results and drag-drop zone in `components/gear-editor/ImageUploadZone.tsx`
- [x] T025 [US3] Move CloudImportButton to bottom of `components/gear-editor/ImageUploadZone.tsx` (below second divider)
- [x] T026 [US3] Verify drag-and-drop local file upload still works (SC-006) in `components/gear-editor/ImageUploadZone.tsx`
- [x] T027 [US3] Verify Cloud Import (Unsplash) still accessible (SC-006) in `components/gear-editor/ImageUploadZone.tsx`
- [x] T028 [US3] Update label/description text to emphasize "Search for product images" as primary action

**Checkpoint**: User Story 3 complete - UI hierarchy reflects product search as primary method

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation

- [x] T029 Verify all acceptance scenarios from spec.md work correctly (manual testing) - documented in quickstart.md
- [x] T030 [P] Test backward compatibility with existing Cloudinary local file uploads - code paths preserved
- [x] T031 [P] Test backward compatibility with existing Cloud Import (Unsplash) - CloudImportButton still accessible
- [x] T032 Run `npm run lint` and fix any linting errors - passed (only unrelated warnings)
- [x] T033 Run `npm run build` and verify no build errors - build successful
- [x] T034 Update quickstart.md testing checklist with actual verification results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority and deeply integrated (implement together)
  - US3 (P2) can be done after US1+US2 but shares same files
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core functionality
- **User Story 2 (P1)**: Same priority as US1 but SEQUENTIALLY AFTER US1 (visual feedback requires working search/upload infrastructure)
- **User Story 3 (P2)**: Can start after US1+US2 - UI reorganization only

> **Note**: US1 and US2 are both P1 priority for business value, but US2 has a technical dependency on US1. Implement US1 first, then US2.

### Within Each User Story

- Hook logic before component integration
- Core functionality before error handling
- Complete user story before moving to next

### Parallel Opportunities

- T002, T003, T004 can run in parallel (different concerns)
- T011 (ProductSearchGrid) can run in parallel with T008-T010 (hook implementation)
- T030, T031 can run in parallel (different test targets)

---

## Parallel Example: User Story 1

```bash
# Launch hook and component tasks in parallel:
Task: "Implement uploadUrl method in hooks/useCloudinaryUpload.ts"
Task: "Create ProductSearchGrid.tsx stateless component"

# Then integrate sequentially:
Task: "Add search input to ImageUploadZone.tsx"
Task: "Wire ProductSearchGrid to uploadUrl"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup verification
2. Complete Phase 2: Foundational hooks
3. Complete Phase 3: User Story 1 (core search + upload)
4. **STOP and VALIDATE**: Test search → select → upload → form update flow
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Hooks ready
2. Add User Story 1 → Search works → Demo (MVP!)
3. Add User Story 2 → Polish feedback → Demo
4. Add User Story 3 → UI reorganized → Final

### Single Developer Strategy

Recommended order for one developer:

1. T001-T007 (Setup + Foundational) - ~1 hour
2. T008-T016 (User Story 1) - ~2 hours
3. T017-T022 (User Story 2) - ~1 hour
4. T023-T028 (User Story 3) - ~1 hour
5. T029-T034 (Polish) - ~30 minutes

**Total estimated: ~5.5 hours**

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 are tightly coupled - implement together for best results
- Existing `searchGearImages` server action requires no changes
- Cloudinary URL upload is well-documented in research.md
- All UI uses shadcn/ui + Tailwind CSS per constitution
