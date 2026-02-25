<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump type: MINOR (Technology constraints updated to reflect Supabase migration, new patterns added)

Modified principles:
- Technology Constraints: Updated database from Firebase to Supabase (PostgreSQL)
- Technology Constraints: Added Vercel AI SDK, next-intl, Cloudinary as core dependencies
- Core Principles: Expanded Section IV to include state management patterns (Zustand, state machines)

Added sections:
- State Management Patterns subsection under Technology Constraints
- Internationalization (i18n) requirement in Technology Constraints

Removed sections: None

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

**State Management Patterns**:
- Complex async flows MUST use state machines with status tracking (idle → loading → success/error)
- Zustand SHOULD be used for global state with persist middleware for localStorage
- Optimistic updates SHOULD implement rollback on errors

Rationale: Ensures alignment on requirements before coding, reduces rework, maintains documentation, and provides predictable state transitions.

### V. Import and File Organization

- ALL imports MUST use the `@/*` path alias for absolute imports (no relative imports like `../../`).
- Files MUST be organized by feature/domain, not by type alone.
- Component files MUST be co-located with their specific hooks and types when feature-specific.

Rationale: Improves code navigation, reduces merge conflicts, and scales better as the codebase grows.

## Technology Constraints

| Constraint | Requirement |
|------------|-------------|
| Framework | Next.js 16+ with App Router |
| Language | TypeScript 5.x (strict mode) |
| Runtime | React 19+ |
| Styling | Tailwind CSS 4 only |
| Components | shadcn/ui (new-york style, zinc base) |
| Icons | lucide-react |
| Forms | react-hook-form + zod |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (email/password, Google OAuth) |
| Image Storage | Cloudinary (CDN hosting and optimization) |
| AI Generation | Vercel AI SDK (via AI Gateway) |
| Internationalization | next-intl |
| State Management | Zustand (with persist middleware) |
| Toasts | Sonner |
| Charts | recharts |

Adding new dependencies MUST be justified and approved. Prefer built-in Next.js features over third-party alternatives.

### State Management Patterns

- **Complex Async Flows**: Implement state machines with explicit status tracking
- **Database Queries**: Use Supabase client with proper error handling
- **Optimistic Updates**: Use Zustand with rollback patterns
- **Form State**: react-hook-form with Zod validation

### Image Management

- **Storage**: Cloudinary for CDN hosting and optimization
- **Background Removal**: Client-side using @imgly/background-removal (WASM)
- **AI Generation**: Vercel AI SDK with fallback to curated images
- **Contrast Compliance**: WCAG AA (4.5:1 ratio) for text overlays

### Internationalization

- **Library**: next-intl for multi-language support
- **Locales**: English (en) and German (de) as primary languages
- **URL Structure**: Locale-based routing (`/[locale]/...`)

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

**Version**: 1.1.0 | **Ratified**: 2025-12-04 | **Last Amended**: 2025-12-16
