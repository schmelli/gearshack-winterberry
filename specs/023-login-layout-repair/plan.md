# Implementation Plan: Login Repair & Layout Architecture Sprint

**Branch**: `023-login-layout-repair` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-login-layout-repair/spec.md`

## Summary

Fix three critical bugs on the login page: (1) Header/Footer appearing when they shouldn't (requires Shell component), (2) Buttons not receiving clicks (z-index fix), and (3) Black background on timeout (add fallback image URL). Also add debug logging to form handlers.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, shadcn/ui, Tailwind CSS 4
**Storage**: Firebase Storage (for background images - existing)
**Testing**: Visual verification + `npm run lint` + `npm run build`
**Target Platform**: Web (modern browsers)
**Project Type**: Web application (Next.js)
**Performance Goals**: Fallback background visible within 1.5 seconds
**Constraints**: 1.5-second timeout for image fetching, no file/directory restructuring
**Scale/Scope**: 4 files modified, 1 new file created

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | ✅ PASS | Shell is a layout component (stateless), receives children via props. Route logic uses `usePathname()` which is navigation state, not business logic. |
| II. TypeScript Strict Mode | ✅ PASS | All new code will be typed, no `any` types |
| III. Design System Compliance | ✅ PASS | Using existing Tailwind classes, no new base components |
| IV. Spec-Driven Development | ✅ PASS | Following spec.md requirements |
| V. Import and File Organization | ✅ PASS | Using @/* imports, component in layout folder |

**Note on Principle I**: The Shell component uses `usePathname()` which is a Next.js navigation hook. This is acceptable because:
- It's not business logic, it's layout control based on route
- The component is still stateless regarding data
- No `useState` or `useEffect` with side effects
- Purely conditional rendering based on current URL

## Project Structure

### Documentation (this feature)

```text
specs/023-login-layout-repair/
├── plan.md              # This file
├── research.md          # Phase 0 output - decisions
├── quickstart.md        # Phase 1 output - implementation steps
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
├── layout.tsx           # MODIFY: Wrap children in Shell component
└── login/
    └── page.tsx         # MODIFY: Fix z-index on form container

components/
├── layout/
│   ├── Shell.tsx        # CREATE: Conditional layout wrapper (new file)
│   ├── SiteHeader.tsx   # EXISTING: No changes needed
│   └── SiteFooter.tsx   # EXISTING: No changes needed
└── auth/
    ├── LoginForm.tsx         # MODIFY: Add console.log to onSubmit
    ├── RegistrationForm.tsx  # MODIFY: Add console.log to onSubmit
    └── BackgroundRotator.tsx # EXISTING: Uses hook (no changes needed)

hooks/
└── useBackgroundImages.ts   # MODIFY: Add fallback image URL, reduce timeout to 1.5s
```

**Structure Decision**: Using existing Next.js App Router structure. One new file (Shell.tsx) in components/layout/. All other changes are modifications to existing files.

## Root Cause Analysis

### Issue 1: Header/Footer on Login Page

**File**: `app/layout.tsx` lines 46-54

```tsx
<div className="flex min-h-screen flex-col">
  <SiteHeader />
  <main className="flex-1">
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </main>
  <SiteFooter />
</div>
```

**Problem**: SiteHeader and SiteFooter are unconditionally rendered for ALL routes, including /login.

**Solution**: Create a Shell component that conditionally renders header/footer based on pathname.

### Issue 2: Buttons Not Clickable

**File**: `app/login/page.tsx`

The form container doesn't have explicit z-index positioning. The background overlay in BackgroundRotator may be intercepting clicks.

**Current BackgroundRotator**: Uses `fixed inset-0 -z-10` which should be below content, but the overlay `bg-black/30` may need `pointer-events-none`.

**Solution**: Add `relative z-10` to the form container div in login/page.tsx and ensure background overlay has `pointer-events-none`.

### Issue 3: Black Background on Timeout

**File**: `hooks/useBackgroundImages.ts`

When Firebase Storage times out or fails, `setImages([])` is called, resulting in no images and the BackgroundRotator showing only the gradient. If the gradient doesn't render properly, the screen appears black.

**Solution**: Return a fallback image URL array instead of empty array. Use Unsplash Source or similar for a nature-themed fallback.

## Implementation Strategy

### Approach: Minimal Changes, Maximum Impact

1. **Create Shell component** - Conditional wrapper using `usePathname()`
2. **Update layout.tsx** - Wrap content in Shell instead of direct header/footer
3. **Fix z-index in login page** - Add `relative z-10` to form container
4. **Add pointer-events-none** - To background overlay to ensure clicks pass through
5. **Add fallback image URL** - In useBackgroundImages hook
6. **Reduce timeout** - From 2s to 1.5s per spec
7. **Add debug logs** - To LoginForm and RegistrationForm onSubmit handlers

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Shell component location | `components/layout/Shell.tsx` | Co-located with SiteHeader/SiteFooter |
| Shell uses usePathname | Client Component | Next.js App Router pattern for client-side routing |
| Fallback image source | Unsplash Source URL | Free, reliable, nature-themed options available |
| Z-index strategy | Form z-10, Background z-0 | Simple, clear layering |
| Debug logs | console.log in onSubmit | Temporary for debugging, easy to remove later |

## Complexity Tracking

> **No violations** - All changes are minimal and follow existing patterns.

| Aspect | Assessment |
|--------|------------|
| New files | 1 - Shell.tsx |
| Modified files | 5 - layout.tsx, login/page.tsx, useBackgroundImages.ts, LoginForm.tsx, RegistrationForm.tsx |
| New dependencies | 0 |
| Breaking changes | 0 - Layout change is transparent to pages |
