# Tasks: AI-Powered Loadout Image Generation

**Input**: Design documents from `/specs/048-ai-loadout-image-gen/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification, so they are not included in this task list. Focus is on implementation only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a Next.js 16 App Router web application with:
- App pages: `app/[locale]/(main)/loadouts/`
- Components: `components/loadout/`, `components/ui/`
- Hooks: `hooks/`
- Library utilities: `lib/`
- Types: `types/`
- Database migrations: Supabase migrations

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and foundational code structure

- [x] T001 Create database migration for generated_images table in supabase/migrations/YYYYMMDDHHMMSS_add_loadout_image_generation.sql
- [x] T002 [P] Create TypeScript types for image generation in types/loadout-image.ts
- [x] T003 [P] Create Zod schemas for API contracts in specs/048-ai-loadout-image-gen/contracts/ (already created, verify they match implementation needs)
- [x] T004 [P] Add Cloudinary AI environment variables to .env.example (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_AI_ENABLED)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Run database migration to create generated_images table and extend loadouts table with hero_image_id and image_source_preference columns
- [x] T006 [P] Implement Cloudinary AI client in lib/cloudinary-ai.ts with signed upload API integration
- [x] T007 [P] Implement prompt builder utility in lib/prompt-builder.ts (activity type mapping, seasonal descriptors, style templates)
- [x] T008 [P] Implement fallback image selection logic in lib/fallback-images.ts with curated image set definitions
- [x] T009 [P] Create Supabase database service functions in lib/supabase/loadout-images.ts (insert, update, delete, query generated images)
- [x] T010 Seed fallback images to Cloudinary in folder gearshack/fallbacks/ (24 curated images per research.md)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Generate Contextual Loadout Image (Priority: P1) 🎯 MVP

**Goal**: Users can generate AI-powered hero images for loadouts with a single click, with automatic retry and fallback handling

**Independent Test**: Create new loadout with title "Mountain Hiking Trip", description "3-day backpacking in Rocky Mountains", season "Summer", click "Generate Image", verify mountain trail scene with summer characteristics appears within 5 seconds

### Implementation for User Story 1

- [x] T011 [P] [US1] Create ImageGenerationButton component in components/loadout/image-generation-button.tsx (stateless, receives onClick callback)
- [x] T012 [P] [US1] Create GeneratedImagePreview component in components/loadout/generated-image-preview.tsx (displays image with loading skeleton)
- [x] T013 [P] [US1] Create FallbackImagePlaceholder component in components/loadout/fallback-image-placeholder.tsx (loading states, fallback display)
- [x] T014 [US1] Implement useLoadoutImageGeneration hook in hooks/useLoadoutImageGeneration.ts with state machine (idle, generating, retrying, success, error, fallback)
- [x] T015 [US1] Implement generateImage function in useLoadoutImageGeneration hook (calls Cloudinary AI API via lib/cloudinary-ai.ts)
- [x] T016 [US1] Implement automatic retry logic in useLoadoutImageGeneration hook (retry once on failure, then fallback)
- [x] T017 [US1] Implement silent fallback to curated defaults in useLoadoutImageGeneration hook (on rate limits or permanent failures)
- [x] T018 [US1] Implement image save to database logic in useLoadoutImageGeneration hook (insert to generated_images, update loadouts.hero_image_id)
- [x] T019 [US1] Integrate ImageGenerationButton and GeneratedImagePreview into loadout detail page in app/[locale]/(main)/loadouts/[id]/page.tsx
- [x] T020 [US1] Add logging for image generation events (attempts, successes, failures, retries, fallbacks) in useLoadoutImageGeneration hook
- [x] T021 [US1] Add metrics tracking for generation time, success rate, fallback rate in useLoadoutImageGeneration hook
- [x] T022 [US1] Implement text overlay contrast enforcement with adaptive gradient in GeneratedImagePreview component (CSS: linear-gradient to-bottom with rgba black overlay)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can generate images, see loading states, automatic retry works, fallback images appear on failure

---

## Phase 4: User Story 2 - Review and Regenerate Image Variations (Priority: P2)

**Goal**: Users can regenerate images to get variations, view generation history (up to 3), and switch between previously generated images

**Independent Test**: Generate image for loadout, click "Generate Another" to see alternative variations, verify each new generation maintains contextual relevance with visual variety, verify history shows up to 3 images

### Implementation for User Story 2

- [x] T023 [P] [US2] Create ImageHistorySelector component in components/loadout/image-history-selector.tsx (displays up to 3 historical images with selection)
- [x] T024 [US2] Implement regenerateImage function in useLoadoutImageGeneration hook (triggers new generation with same/different prompt)
- [x] T025 [US2] Implement history management logic in useLoadoutImageGeneration hook (fetch last 3 images, auto-delete oldest when limit exceeded)
- [x] T026 [US2] Implement setActiveImage function in useLoadoutImageGeneration hook (updates is_active flag and loadouts.hero_image_id)
- [x] T027 [US2] Add "Generate Another" button to loadout detail page UI in app/[locale]/(main)/loadouts/[id]/page.tsx
- [x] T028 [US2] Integrate ImageHistorySelector component into loadout detail page in app/[locale]/(main)/loadouts/[id]/page.tsx
- [x] T029 [US2] Implement manual photo upload option integration in loadout detail page (sets image_source_preference to 'manual_upload')
- [x] T030 [US2] Implement preference persistence logic in useLoadoutImageGeneration hook (checks image_source_preference, doesn't auto-regenerate if manual_upload)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can generate, regenerate, view history, switch between variations, upload manual photos

---

## Phase 5: User Story 3 - Advanced Generation with Style Preferences (Priority: P3)

**Goal**: Users can provide style preferences (templates, time-of-day, atmosphere hints) to fine-tune image generation and generate multiple variations simultaneously

**Independent Test**: Select style template "Cinematic" and time preference "Golden Hour" for mountain hiking loadout, generate image, verify result exhibits cinematic composition and warm golden-hour lighting

### Implementation for User Story 3

- [x] T031 [P] [US3] Create StylePreferencesForm component in components/loadout/style-preferences-form.tsx (template selector, time-of-day selector, atmosphere text input)
- [x] T032 [US3] Extend prompt builder in lib/prompt-builder.ts to incorporate style preferences (template modifiers, time-of-day lighting, atmosphere hints)
- [x] T033 [US3] Update generateImage function in useLoadoutImageGeneration hook to accept stylePreferences parameter
- [x] T034 [US3] Implement generateMultipleVariations function in useLoadoutImageGeneration hook (generates 2-3 images concurrently with slight prompt variations)
- [x] T035 [US3] Integrate StylePreferencesForm into loadout detail page as collapsible advanced options in app/[locale]/(main)/loadouts/[id]/page.tsx
- [x] T036 [US3] Add "Generate 3 Options" button to loadout detail page UI in app/[locale]/(main)/loadouts/[id]/page.tsx
- [x] T037 [US3] Store stylePreferences in generated_images.style_preferences JSONB column when saving

**Checkpoint**: All user stories 1, 2, and 3 should now be independently functional - users have full control over generation with basic and advanced options

---

## Phase 6: User Story 4 - Accessibility and Alternative Text (Priority: P3)

**Goal**: Generated images automatically include descriptive alternative text for screen readers

**Independent Test**: Generate image for "Alpine Climbing" loadout, inspect image element, verify alt-text describes "Dramatic alpine mountain landscape with snow-capped peaks and rocky terrain under clear blue sky, suitable for summer climbing expedition"

### Implementation for User Story 4

- [x] T038 [P] [US4] Implement generateAltText utility function in lib/prompt-builder.ts (derives descriptive alt-text from generation prompt or loadout context)
- [x] T039 [US4] Update generateImage function in useLoadoutImageGeneration hook to automatically generate and store alt-text in generated_images.alt_text column
- [x] T040 [US4] Ensure GeneratedImagePreview component renders images with alt attribute populated from database in components/loadout/generated-image-preview.tsx
- [x] T041 [US4] Add ARIA labels to ImageGenerationButton and ImageHistorySelector components for screen reader navigation

**Checkpoint**: All user stories should now be independently functional with full accessibility compliance

---

## Phase 7: Contrast Enforcement & Polish

**Purpose**: Implement dynamic text overlay contrast enforcement and cross-cutting improvements

- [x] T042 [P] Implement brightness analysis utility in lib/contrast-analyzer.ts (calculateLuminance, getTextColor functions per research.md)
- [x] T043 [P] Create useTextOverlayColor hook in hooks/useTextOverlayColor.ts (analyzes image brightness, returns 'white' or 'black')
- [x] T044 Integrate useTextOverlayColor hook into GeneratedImagePreview component to dynamically set text color class
- [x] T045 Add semi-transparent gradient overlay CSS to GeneratedImagePreview component (from-transparent via-black/30 to-black/60)
- [x] T046 [P] Implement WCAG AA contrast ratio calculation in lib/contrast-analyzer.ts (calculateContrastRatio, meetsWCAGAA functions)
- [x] T047 Update loadout card components to display generated images as backgrounds with proper text contrast
- [x] T048 [P] Add error boundary for image generation failures in loadout detail page
- [x] T049 [P] Add toast notifications for generation success/failure using sonner in useLoadoutImageGeneration hook
- [x] T050 [P] Add loading progress indicator for image generation in GeneratedImagePreview component
- [ ] T051 Run quickstart.md validation checklist (manual testing scenarios) - USER ACTION REQUIRED
- [x] T052 Update CLAUDE.md with new technologies: Cloudinary AI generation, prompt engineering patterns, contrast compliance
- [x] T053 [P] Code cleanup: remove debug logs, ensure all imports use @/* paths, verify TypeScript strict mode compliance
- [x] T054 Run `npm run lint` and fix any ESLint warnings
- [x] T055 Run `npm run build` and verify production build succeeds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P3)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 but is independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends US1/US2 but is independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Enhances all previous stories but is independently testable

### Within Each User Story

- Components before integration into pages
- Hook functions before UI integration
- Database operations after schema migration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 Setup**: T002, T003, T004 can run in parallel
- **Phase 2 Foundational**: T006, T007, T008, T009 can run in parallel after T005
- **Phase 3 (US1)**: T011, T012, T013 can run in parallel (different component files)
- **Phase 4 (US2)**: T023 can run in parallel with hook updates
- **Phase 5 (US3)**: T031, T032 can run in parallel
- **Phase 6 (US4)**: T038, T041 can run in parallel
- **Phase 7 Polish**: T042, T043, T046, T048, T049, T050, T053 can run in parallel
- **Once Foundational complete**: All user stories (US1, US2, US3, US4) can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all UI components for User Story 1 together:
Task T011: "Create ImageGenerationButton component in components/loadout/image-generation-button.tsx"
Task T012: "Create GeneratedImagePreview component in components/loadout/generated-image-preview.tsx"
Task T013: "Create FallbackImagePlaceholder component in components/loadout/fallback-image-placeholder.tsx"

# These can all be built simultaneously as they're independent component files
```

---

## Parallel Example: Foundational Phase

```bash
# After T005 (database migration) completes, launch all utilities together:
Task T006: "Implement Cloudinary AI client in lib/cloudinary-ai.ts"
Task T007: "Implement prompt builder utility in lib/prompt-builder.ts"
Task T008: "Implement fallback image selection logic in lib/fallback-images.ts"
Task T009: "Create Supabase database service functions in lib/supabase/loadout-images.ts"

# These are independent utility modules that can be built in parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T010) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T011-T022)
4. **STOP and VALIDATE**: Test User Story 1 independently using quickstart.md checklist
5. Deploy/demo if ready - users can now generate images!

**MVP Deliverable**: Users can click "Generate Image" on loadouts and get contextual AI-generated hero images with automatic retry and fallback handling. This alone provides core value.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (T011-T022) → Test independently → Deploy/Demo (MVP! Core generation works)
3. Add User Story 2 (T023-T030) → Test independently → Deploy/Demo (Variations and history added)
4. Add User Story 3 (T031-T037) → Test independently → Deploy/Demo (Advanced style controls added)
5. Add User Story 4 (T038-T041) → Test independently → Deploy/Demo (Accessibility complete)
6. Polish (T042-T055) → Final production-ready release

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T010)
2. **Once Foundational is done**:
   - Developer A: User Story 1 (T011-T022)
   - Developer B: User Story 2 (T023-T030)
   - Developer C: User Story 3 (T031-T037)
   - Developer D: User Story 4 (T038-T041)
3. Stories complete and integrate independently
4. Team collaborates on Polish (T042-T055)

---

## Task Summary

**Total Tasks**: 55
**MVP Tasks** (Setup + Foundational + US1): 22 tasks
**Full Feature**: 55 tasks

**Tasks per User Story**:
- Setup (Phase 1): 4 tasks
- Foundational (Phase 2): 6 tasks
- User Story 1 - Generate Images (P1): 12 tasks 🎯 MVP
- User Story 2 - Variations & History (P2): 8 tasks
- User Story 3 - Style Preferences (P3): 7 tasks
- User Story 4 - Accessibility (P3): 4 tasks
- Polish & Cross-Cutting: 14 tasks

**Parallel Opportunities Identified**: 18 tasks marked [P] can run simultaneously

**Independent Test Criteria**:
- ✅ US1: Generate basic image with retry/fallback - fully testable alone
- ✅ US2: Regenerate and browse history - fully testable alone
- ✅ US3: Apply style preferences - fully testable alone
- ✅ US4: Verify alt-text generation - fully testable alone

**Suggested MVP Scope**: Setup + Foundational + User Story 1 only (22 tasks)

This delivers the core value proposition: AI-generated loadout hero images with professional quality and automatic error handling.

---

## Notes

- All tasks follow strict checklist format: `- [ ] [ID] [P?] [Story] Description with file path`
- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label (US1-US4) maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests are NOT included as they were not requested in the specification
- Follow Feature-Sliced Light architecture: hooks for logic, components stateless
- Use TypeScript strict mode, no `any` types
- All imports must use `@/*` absolute paths
- Only use shadcn/ui components from `components/ui/`, never create new base components
