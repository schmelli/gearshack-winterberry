# Implementation Plan: Gear Item Editor

**Branch**: `001-gear-item-editor` | **Date**: 2025-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-gear-item-editor/spec.md`

## Summary

Build the core CRUD interface for managing gear items in the inventory system. The editor handles a complex data model with 20+ fields organized into 6 logical sections using a tabbed form interface. Key technical challenges include:
1. Hierarchical taxonomy selection (Category → Subcategory → ProductType) sourced from GearGraph ontology
2. Form state management with validation using react-hook-form + Zod
3. Strict separation of UI and logic per constitution (useGearEditor hook)

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+, React 19+, react-hook-form 7.x, Zod 4.x, shadcn/ui
**Storage**: Local state for MVP (no backend persistence in this feature scope)
**Testing**: Vitest for unit tests, React Testing Library for component tests
**Target Platform**: Web (desktop + mobile responsive)
**Project Type**: Next.js App Router (single project)
**Performance Goals**: Form interactions < 100ms, taxonomy cascade < 50ms
**Constraints**: Must work offline (taxonomy data bundled as JSON)
**Scale/Scope**: Single user, ~100-500 gear items typical inventory size

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Implementation Notes |
|-----------|--------|---------------------|
| I. Feature-Sliced Light | ✅ PASS | `useGearEditor` hook handles all logic; UI components are stateless |
| II. TypeScript Strict | ✅ PASS | All types in `@/types/gear.ts`; Zod schemas for runtime validation |
| III. Design System | ✅ PASS | Using shadcn Form, Tabs, Card, Button, Input, Select components |
| IV. Spec-Driven | ✅ PASS | Spec complete with user stories, requirements, acceptance criteria |
| V. Import/File Org | ✅ PASS | Using `@/*` aliases; feature co-located in `app/inventory/` |

**Technology Constraints Compliance:**
- Framework: Next.js 16+ ✅
- Language: TypeScript strict ✅
- Styling: Tailwind CSS only ✅
- Components: shadcn/ui ✅
- Icons: lucide-react ✅
- Forms: react-hook-form + Zod ✅

## Project Structure

### Documentation (this feature)

```text
specs/001-gear-item-editor/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: TypeScript interfaces
├── quickstart.md        # Phase 1: Developer guide
├── contracts/           # Phase 1: Zod schemas
│   ├── gear-item.schema.ts
│   └── taxonomy.schema.ts
└── tasks.md             # Phase 2: Implementation tasks
```

### Source Code (repository root)

```text
app/
├── inventory/
│   ├── page.tsx                    # Inventory list page
│   └── [id]/
│       └── edit/
│           └── page.tsx            # Edit gear item page
│   └── new/
│       └── page.tsx                # New gear item page

components/
├── ui/                             # shadcn/ui components (existing)
└── gear-editor/
    ├── GearEditorForm.tsx          # Main form container (stateless)
    ├── sections/
    │   ├── GeneralInfoSection.tsx  # Section 1: Name, Brand, Model
    │   ├── ClassificationSection.tsx # Section 2: Category/Subcategory/ProductType
    │   ├── WeightSpecsSection.tsx  # Section 3: Weight, Dimensions
    │   ├── PurchaseSection.tsx     # Section 4: Price, Date, Store
    │   ├── MediaSection.tsx        # Section 5: Images
    │   └── StatusSection.tsx       # Section 6: Condition, Status, Notes
    └── TaxonomySelect.tsx          # Cascading taxonomy dropdowns

hooks/
└── useGearEditor.ts                # All form logic, validation, state

types/
├── gear.ts                         # GearItem, GearItemFormData interfaces
└── taxonomy.ts                     # Category, Subcategory, ProductType types

lib/
├── taxonomy/
│   ├── taxonomy-data.json          # Converted from ontology TTL
│   └── taxonomy-utils.ts           # Filter functions for cascading
└── validations/
    └── gear-schema.ts              # Zod schemas (re-export from contracts)
```

**Structure Decision**: Next.js App Router structure with feature-based organization. The gear editor components are co-located under `components/gear-editor/` with the hook in `hooks/`. This follows the constitution's Feature-Sliced Light architecture while maintaining the existing project structure.

## Complexity Tracking

> No violations - all principles satisfied with standard patterns.

| Pattern | Justification | Simpler Alternative Considered |
|---------|---------------|-------------------------------|
| Cascading taxonomy selects | Required by FR-010 through FR-013 | Single dropdown rejected (poor UX for hierarchical data) |
| 6 form sections with tabs | Required by FR-007 (prevent overwhelming user) | Single long form rejected (40+ fields unusable) |
