# Tasks: UI Enhancements & Component Polish

**Input**: Design documents from `/specs/013-ui-enhancements/`
**Tests**: Manual testing only

---

## Phase 1: Component Installation

- [X] T001 Install navigation-menu component from shadcn: `npx shadcn@latest add navigation-menu`
- [X] T002 Install hover-card component from shadcn: `npx shadcn@latest add hover-card`

---

## Phase 2: Brand Hover Cards (US2)

- [X] T003 [US2] Import HoverCard components in components/inventory-gallery/GearCard.tsx
- [X] T004 [US2] Wrap brand name with HoverCard trigger in GearCard
- [X] T005 [US2] Create HoverCardContent with brand name and optional URL link

---

## Phase 3: Image Search Placeholder (US3)

- [X] T006 [US3] Import Search icon and Tooltip in components/gear-editor/sections/MediaSection.tsx
- [X] T007 [US3] Add disabled image search button next to "Paste URL" and "Upload" buttons
- [X] T008 [US3] Add tooltip showing "Image search coming soon" on hover

---

## Phase 4: Icon Overlap Fix (US4)

- [X] T009 [US4] Review MediaSection ImageUploadInput for icon spacing issues
- [X] T010 [US4] Ensure proper gap/margin between mode toggle buttons and icons

---

## Phase 5: Validation

- [X] T011 Run npm run lint and fix any errors
- [X] T012 Run npm run build and fix any errors
- [X] T013 Manual testing: Verify all acceptance scenarios

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | T001-T002 | Install shadcn components |
| 2 | T003-T005 | Brand hover cards |
| 3 | T006-T008 | Image search placeholder |
| 4 | T009-T010 | Icon overlap fix |
| 5 | T011-T013 | Validation |

**Total Tasks**: 13
