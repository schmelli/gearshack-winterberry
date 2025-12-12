# Implementation Plan: Final Header Polish Sprint

**Branch**: `016-header-polish-sprint` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-header-polish-sprint/spec.md`

## Summary

Fix three visual polish issues: (1) Make logo visible on dark header using CSS filters, (2) Fix avatar fallback visibility in header context, and (3) Remove redundant title/description from Loadouts page.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, Tailwind CSS 4, shadcn/ui, lucide-react
**Storage**: N/A (no data changes)
**Testing**: Manual testing (visual verification)
**Target Platform**: Web (modern browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: N/A (styling changes only)
**Constraints**: Use CSS filters for logo (don't modify image file)
**Scale/Scope**: 3 files, ~15 lines of changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| I. Feature-Sliced Light | PASS | UI-only changes, no logic added |
| II. TypeScript Strict Mode | PASS | No new TypeScript code |
| III. Design System Compliance | PASS | Using Tailwind CSS classes only |
| IV. Spec-Driven Development | PASS | Spec created before implementation |
| V. Import Organization | PASS | No new imports needed |

## Project Structure

### Documentation (this feature)

```text
specs/016-header-polish-sprint/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Code analysis
├── quickstart.md        # Implementation guide
└── checklists/
    └── requirements.md  # Validation checklist
```

### Source Code (files to modify)

```text
components/
├── layout/
│   └── SiteHeader.tsx      # Add brightness-0 invert to logo Image
├── profile/
│   └── AvatarWithFallback.tsx  # Update fallback colors for header context
└── (no new files)

app/
└── loadouts/
    └── page.tsx            # Remove H1 and description paragraph
```

**Structure Decision**: Minimal changes to 3 existing files. No new components needed.

## Complexity Tracking

No violations - this is a simple styling fix with minimal code changes.

## Implementation Details

### US1: Logo Visibility (P1)

**Current Implementation** (`components/layout/SiteHeader.tsx:61-68`):
```tsx
<Image
  src="/logos/small_gearshack_logo.png"
  alt="Gearshack Logo"
  width={80}
  height={80}
  className="h-20 w-20"
  priority
/>
```

**Required Change** - Add CSS filter to invert black logo to white:
```tsx
<Image
  src="/logos/small_gearshack_logo.png"
  alt="Gearshack Logo"
  width={80}
  height={80}
  className="h-20 w-20 brightness-0 invert"
  priority
/>
```

**CSS Filter Explanation**:
- `brightness-0` - Turns all colors to black
- `invert` - Inverts black to white

### US2: Avatar Fallback Visibility (P1)

**Current Implementation** (`components/profile/AvatarWithFallback.tsx:73`):
```tsx
<AvatarFallback className="bg-primary/10 text-primary font-medium">
```

**Issue**: On dark header (`#405A3D`), `bg-primary/10` is too subtle and `text-primary` is dark green - both invisible.

**Required Change** - Use lighter background and white text:
```tsx
<AvatarFallback className="bg-white/20 text-white font-medium">
```

**Alternative** - If global change is too broad, add a `variant` prop:
```tsx
// Keep current as default, add header variant
variant === 'header'
  ? "bg-white/20 text-white font-medium"
  : "bg-primary/10 text-primary font-medium"
```

**Decision**: Use simpler global change since avatar is primarily used in header. If issues arise elsewhere, add variant prop.

### US3: Loadouts Page Cleanup (P2)

**Current Implementation** (`app/loadouts/page.tsx:56-62`):
```tsx
<div className="mb-6 flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold tracking-tight">Loadouts</h1>
    <p className="mt-1 text-muted-foreground">
      Plan your trips by combining gear from your inventory
    </p>
  </div>
  <Button asChild>
    ...
  </Button>
</div>
```

**Required Change** - Remove H1 and paragraph, keep button in simplified toolbar:
```tsx
<div className="mb-6 flex items-center justify-end">
  <Button asChild>
    <Link href="/loadouts/new">
      <Plus className="mr-2 h-4 w-4" />
      Create New Loadout
    </Link>
  </Button>
</div>
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Logo filter doesn't work on all browsers | Low | Medium | brightness-0 + invert is widely supported |
| Avatar change affects other usages | Low | Low | Avatar primarily used in header |
| Users miss context from removed title | Low | Low | Navigation already provides context |

## Testing Strategy

1. **US1 Testing**:
   - Navigate to any page
   - Verify logo is white/visible against green header
   - Check in both light and dark mode (if applicable)

2. **US2 Testing**:
   - Log in without profile photo
   - Verify initials are visible in header avatar
   - Check dropdown menu avatar still looks good

3. **US3 Testing**:
   - Navigate to /loadouts
   - Verify no H1 or description paragraph
   - Verify "Create New Loadout" button is still accessible

## Dependencies

- No new dependencies required
- All changes use existing Tailwind CSS classes
