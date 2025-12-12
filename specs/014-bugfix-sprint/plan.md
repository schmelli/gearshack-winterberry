# Implementation Plan: Final Polish & Bugfix Sprint

**Branch**: `014-bugfix-sprint` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-bugfix-sprint/spec.md`

## Summary

This feature addresses UX/UI bugs reported after the visual identity overhaul:
1. **Login Screen**: Replace auto-rotating background with single random static image, fix viewport coverage
2. **Gear Editor**: Add pill-style tabs, improve validation feedback with toasts, fix image upload flow
3. **Header Icons**: Update SyncIndicator, Bell, and UserMenu icons to use white color on dark green background
4. **Image Search**: Convert disabled placeholder to clickable popover showing "Coming in V2"

Technical approach:
- Modify `BackgroundRotator` to select one random image on mount with no rotation
- Update `GearEditorForm` TabsList with pill styling (bg-muted rounded-full)
- Enhance validation with toast on save errors and required field asterisks
- Fix `useGearEditor` to properly await pending image uploads before Firestore submission
- Update header component icon colors to `text-white` for visibility
- Add Popover component to image search button in MediaSection

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, Tailwind CSS 4, shadcn/ui, lucide-react, react-hook-form, Zod, Sonner (toast)
**Storage**: Firebase Firestore, Firebase Storage
**Testing**: Manual testing (no automated test framework)
**Target Platform**: Web (responsive, desktop-first)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Page load <3s, visual updates immediate
**Constraints**: WCAG AA contrast compliance
**Scale/Scope**: Single-user app, ~100s of gear items per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | PASS | Logic in hooks (useGearEditor), UI stateless |
| II. TypeScript Strict Mode | PASS | No `any` types, Zod validation for forms |
| III. Design System Compliance | PASS | Using shadcn/ui components (Tabs, Popover, Toast) |
| IV. Spec-Driven Development | PASS | Spec created before implementation |
| V. Import and File Organization | PASS | All imports use `@/*` alias |

**Technology Constraints Check**:
- Next.js 16+ App Router
- TypeScript strict mode
- Tailwind CSS 4 only
- shadcn/ui components
- lucide-react icons

**Code Quality Gates**:
- Will run `npm run lint` before merge
- Will run `npm run build` before merge

## Project Structure

### Documentation (this feature)

```text
specs/014-bugfix-sprint/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
├── checklists/          # Quality checklists
│   └── requirements.md  # Already created
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router structure
app/
├── login/
│   └── page.tsx         # Uses BackgroundRotator

components/
├── auth/
│   └── BackgroundRotator.tsx   # FR-001-004: Static random image, viewport fix
├── layout/
│   ├── SiteHeader.tsx          # FR-013-014: Icon visibility
│   ├── SyncIndicator.tsx       # FR-013: White icon color
│   └── UserMenu.tsx            # FR-013: White styling
├── gear-editor/
│   ├── GearEditorForm.tsx      # FR-015-016: Pill tabs
│   └── sections/
│       ├── GeneralInfoSection.tsx  # FR-005: Required asterisks
│       └── MediaSection.tsx        # FR-017-019: Image search popover

hooks/
└── useGearEditor.ts     # FR-007-012: Validation feedback, image upload await
```

**Structure Decision**: Using existing Next.js App Router structure. Bug fixes apply to existing components.

## Complexity Tracking

> No constitution violations - all changes follow existing patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
