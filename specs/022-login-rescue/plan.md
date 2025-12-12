# Implementation Plan: Login Rescue Sprint

**Branch**: `022-login-rescue` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-login-rescue/spec.md`

## Summary

Fix the infinite loading spinner bug on the /login page by restructuring the render logic to always show the login form immediately, adding timeout failsafes for background image loading (2s) and authentication checks (3s), and ensuring the form layer remains visible regardless of loading states.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, Firebase Auth, Firebase Storage, shadcn/ui
**Storage**: Firebase Storage (`backgrounds/hd`) for background images
**Testing**: Visual verification + `npm run lint` + `npm run build`
**Target Platform**: Web (modern browsers)
**Project Type**: Web application (Next.js)
**Performance Goals**: Login form visible within 1 second of page load
**Constraints**: 3-second auth timeout, 2-second image timeout
**Scale/Scope**: Single page fix with hook modifications

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | ✅ PASS | Logic stays in hooks (useAuth, useBackgroundImages), UI in components |
| II. TypeScript Strict Mode | ✅ PASS | All new code will be typed, no `any` types |
| III. Design System Compliance | ✅ PASS | Using existing shadcn/ui Card, no new base components |
| IV. Spec-Driven Development | ✅ PASS | Following spec.md requirements |
| V. Import and File Organization | ✅ PASS | Using @/* imports, feature-organized |

## Project Structure

### Documentation (this feature)

```text
specs/022-login-rescue/
├── plan.md              # This file
├── research.md          # Phase 0 output - architecture decisions
├── quickstart.md        # Phase 1 output - implementation checklist
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
└── login/
    └── page.tsx         # MODIFY: Remove blocking loading gate, add form-first render

components/
└── auth/
    └── BackgroundRotator.tsx  # MODIFY: Add timeout handling and fade-in transitions

hooks/
├── useAuth.ts           # MODIFY: Add auth timeout with force-display flag
└── useBackgroundImages.ts    # MODIFY: Add 2-second timeout for image fetching
```

**Structure Decision**: Modifications to existing files only. No new files needed. All changes follow the existing Feature-Sliced Light pattern.

## Root Cause Analysis

### Issue 1: Page-Level Loading Block (PRIMARY CAUSE)

**File**: `app/login/page.tsx` lines 55-62

```tsx
// Show nothing while checking auth or if already authenticated
if (loading || user) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
```

**Problem**: This blocks the ENTIRE page (including the form) while auth is checking. If Firebase Auth is slow or hangs, the form never appears.

**Solution**: Remove this blocking gate. Handle redirect via `useEffect` only. Always render the form.

### Issue 2: No Timeout in Background Image Loading

**File**: `hooks/useBackgroundImages.ts`

```tsx
const result = await listAll(storageRef);
// Can hang indefinitely if Firebase Storage is slow
```

**Problem**: No timeout - if Firebase Storage is slow or unavailable, loading state persists forever.

**Solution**: Add a 2-second timeout using `Promise.race()` with timeout fallback.

### Issue 3: Background Component Blocks on Loading

**File**: `components/auth/BackgroundRotator.tsx` lines 32-38

```tsx
if (loading || images.length === 0) {
  return (
    <div style={{ background: FALLBACK_GRADIENT }} />
  );
}
```

**Problem**: Returns different component based on loading state, causing potential flicker. No fade-in transition.

**Solution**: Always render both gradient and image layers. Use CSS opacity/transitions for smooth fade-in.

## Implementation Strategy

### Approach: Form-First, Non-Blocking

1. **Always render the login form** - Remove the blocking `if (loading || user)` gate
2. **Add timeout failsafes** - Auth (3s), Images (2s) to prevent infinite loading
3. **Layer backgrounds behind form** - Use CSS z-index and transitions
4. **Graceful degradation** - Fallback gradient is always visible as base layer

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth timeout mechanism | `setTimeout` + `forceDisplay` flag in hook | Simple, predictable, testable |
| Image timeout | `Promise.race()` with timeout promise | Standard pattern for async timeouts |
| Background layering | CSS fixed positioning + z-index | Already implemented, just need transitions |
| Fade-in effect | CSS `transition` on opacity | No JS dependencies, GPU accelerated |

## Complexity Tracking

> **No violations** - All changes are minimal and follow existing patterns.

| Aspect | Assessment |
|--------|------------|
| New files | 0 - All modifications to existing files |
| Lines changed | ~50 estimated |
| New dependencies | 0 |
| Breaking changes | 0 - Behavior improves without API changes |
