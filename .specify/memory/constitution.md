<!--
SYNC IMPACT REPORT
==================
Version change: 0.0.0 → 1.0.0
Bump type: MAJOR (Initial constitution creation)

Modified principles: N/A (new document)

Added sections:
- Core Principles (5 principles derived from PROJECT_RULES.md)
- Technology Constraints
- Development Workflow
- Governance

Removed sections: N/A

Templates requiring updates:
- .specify/templates/plan-template.md - ✅ Compatible (Constitution Check section present)
- .specify/templates/spec-template.md - ✅ Compatible (User stories align with workflow)
- .specify/templates/tasks-template.md - ✅ Compatible (Phase structure supports principles)

Follow-up TODOs: None
-->

# Gearshack Winterberry Constitution

## Core Principles

### I. Feature-Sliced Light Architecture (NON-NEGOTIABLE)

Strict separation of logic from UI is mandatory throughout the codebase:

- **UI Components**: MUST be stateless and receive data only via props. No `useEffect`, `useState` with side effects, or complex logic allowed in component files.
- **Custom Hooks**: ALL business logic (data fetching, calculations, state management, side effects) MUST reside in dedicated hook files under `hooks/`.
- **Types**: ALL data models and interfaces MUST be defined in `@/types` directory.

Rationale: Enables independent testing of logic, predictable UI rendering, and clear separation of concerns for maintainability.

### II. TypeScript Strict Mode

TypeScript strict mode is enabled and enforced:

- The `any` type is FORBIDDEN. All variables, parameters, and return types MUST have explicit or inferable types.
- Unknown data from external sources MUST be validated and typed using type guards or validation libraries (e.g., Zod).
- Generic types SHOULD be used over `any` when flexibility is required.

Rationale: Catches errors at compile time, improves code documentation, and enables better IDE support.

### III. Design System Compliance

The project uses shadcn/ui as its component library:

- New base components MUST NOT be created. Use existing `@/components/ui` components.
- Styling MUST use Tailwind CSS classes exclusively. No separate CSS files except `globals.css`.
- Layouts MUST use `flex`, `grid`, and Tailwind spacing utilities.
- Component usage pattern:
  - `Card` for containers
  - `Button` for actions
  - `Dialog` for modals
  - `Sheet` for mobile drawers

Rationale: Ensures visual consistency, reduces bundle size, and leverages battle-tested accessible components.

### IV. Spec-Driven Development

Before writing implementation code:

1. Check `/specs` folder for existing feature specifications.
2. Create TypeScript interfaces in `types/` first.
3. Create the logic hook in `hooks/` second.
4. Create the UI component last.

New features SHOULD have a specification document before implementation begins. Specifications MUST include user scenarios and acceptance criteria.

Rationale: Ensures alignment on requirements before coding, reduces rework, and maintains documentation.

### V. Import and File Organization

- ALL imports MUST use the `@/*` path alias for absolute imports (no relative imports like `../../`).
- Files MUST be organized by feature/domain, not by type alone.
- Component files MUST be co-located with their specific hooks and types when feature-specific.

Rationale: Improves code navigation, reduces merge conflicts, and scales better as the codebase grows.

## Technology Constraints

| Constraint | Requirement |
|------------|-------------|
| Framework | Next.js 16+ with App Router |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 only |
| Components | shadcn/ui (new-york style, zinc base) |
| Icons | lucide-react |
| Forms | react-hook-form + zod |
| React Version | React 19+ |

Adding new dependencies MUST be justified and approved. Prefer built-in Next.js features over third-party alternatives.

## Development Workflow

### Code Quality Gates

Before merging any code:

1. `npm run lint` MUST pass with no errors.
2. `npm run build` MUST complete successfully.
3. All TypeScript errors MUST be resolved.
4. New features MUST follow the spec-driven workflow.

### Commit Standards

- Commits SHOULD be atomic and focused on a single change.
- Commit messages SHOULD follow conventional commit format.
- Breaking changes MUST be documented in commit messages.

## Governance

This constitution supersedes all other development practices in the repository. All code contributions MUST comply with these principles.

### Amendment Process

1. Propose amendment with rationale.
2. Document impact on existing code.
3. Update constitution version per semantic versioning:
   - MAJOR: Principle removal or incompatible redefinition
   - MINOR: New principle or significant expansion
   - PATCH: Clarification or wording improvement
4. Update dependent templates if affected.

### Compliance

- All pull requests MUST verify compliance with constitution principles.
- Violations require explicit justification and approval.
- Use CLAUDE.md for day-to-day development reference.

**Version**: 1.0.0 | **Ratified**: 2025-12-04 | **Last Amended**: 2025-12-04
