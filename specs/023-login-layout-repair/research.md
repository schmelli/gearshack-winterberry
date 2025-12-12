# Research: Login Repair & Layout Architecture Sprint

**Feature**: 023-login-layout-repair | **Date**: 2025-12-06

## Problem Statement

Three bugs affecting the login page: (1) SiteHeader/SiteFooter appear when they shouldn't, (2) Form buttons are not clickable, (3) Background shows black instead of fallback image on timeout.

## Decision Records

### DR-001: Conditional Shell Component Pattern

**Decision**: Create a `Shell` client component that uses `usePathname()` to conditionally render SiteHeader/SiteFooter

**Alternatives Considered**:
1. ❌ Route Groups (e.g., `(auth)` folder) - Rejected per user constraint (no file restructuring)
2. ❌ CSS hiding via route-specific classes - Fragile, components still render
3. ❌ Per-page layout override - Would require duplicate layout code
4. ✅ Conditional Shell component - Clean, centralized, no restructuring needed

**Implementation**:
```tsx
'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

const AUTH_ROUTES = ['/login', '/register'];

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
```

**Rationale**: Most flexible approach that doesn't require restructuring the app directory. Easy to extend with more routes. Keeps layout logic centralized.

### DR-002: Z-Index Layering Strategy

**Decision**: Use explicit z-index values with `pointer-events-none` on background overlay

**Analysis**:
- Current BackgroundRotator: `fixed inset-0 -z-10` (below content)
- Current overlay: `absolute inset-0 bg-black/30` (no pointer-events setting)
- Login form container: No explicit positioning

**Problem**: Even with negative z-index, the overlay may intercept clicks if it's positioned above content in the stacking context.

**Solution**:
1. Form container: Add `relative z-10`
2. Background overlay: Add `pointer-events-none`

**Implementation**:
```tsx
// In login/page.tsx - form container
<div className="relative z-10 flex min-h-screen items-center justify-center p-4">

// In BackgroundRotator.tsx - overlay
<div className="absolute inset-0 bg-black/30 pointer-events-none" />
```

**Rationale**: Belt-and-suspenders approach. Explicit z-index ensures proper stacking, pointer-events-none guarantees click passthrough.

### DR-003: Fallback Image URL Strategy

**Decision**: Use a static Unsplash image URL as fallback instead of empty array

**Current Behavior**:
```tsx
// On timeout or error
setImages([]);  // Results in gradient-only display
```

**Problem**: If gradient doesn't render (CSS issue, dark mode conflict), screen appears black.

**Solution**: Return a fallback image URL that matches the brand aesthetic
```tsx
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80';

// On timeout or error
setImages([FALLBACK_IMAGE_URL]);
```

**Image Selection Criteria**:
- Nature/outdoor theme (matches Gearshack brand)
- High resolution (1920px width)
- Good quality compression (q=80)
- Unsplash allows hotlinking for free

**Rationale**: Ensures a visual background always appears. Gradient remains as secondary fallback if image also fails to load.

### DR-004: Timeout Value Change

**Decision**: Reduce timeout from 2.0s to 1.5s

**Current Value**: `IMAGE_FETCH_TIMEOUT_MS = 2000` (Feature 022)

**New Value**: `IMAGE_FETCH_TIMEOUT_MS = 1500`

**Rationale**: Per spec FR-007, users should see fallback within 1.5 seconds. Faster feedback improves perceived performance.

### DR-005: Debug Logging Approach

**Decision**: Add `console.log` at the start of `onSubmit` handlers

**Implementation**:
```tsx
// LoginForm.tsx
async function onSubmit(data: LoginFormData) {
  console.log('[LoginForm] onSubmit triggered', { email: data.email });
  // ... existing code
}

// RegistrationForm.tsx
async function onSubmit(data: RegistrationFormData) {
  console.log('[RegistrationForm] onSubmit triggered', { email: data.email });
  // ... existing code
}
```

**Rationale**:
- Prefix with component name for easy filtering
- Include email (not password) for identification
- Placed at start of function to confirm handler is called even if subsequent code fails

**Note**: These logs are for debugging and should be removed in a future cleanup sprint.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         RootLayout                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Providers (Theme, Auth, Sync)                           │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │ Shell Component                                   │   │ │
│  │  │  if (pathname === '/login' || '/register'):       │   │ │
│  │  │    → render only {children}                       │   │ │
│  │  │  else:                                            │   │ │
│  │  │    → render Header + {children} + Footer          │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Login Page Z-Index Stack:
┌─────────────────────────────┐
│ z-10: Form Container        │ ← Receives clicks
│  - Card with login form     │
│  - Buttons, inputs          │
├─────────────────────────────┤
│ z-0: Background Container   │ ← Does not intercept clicks
│  - Gradient (always)        │
│  - Image (when loaded)      │
│  - Overlay (pointer-none)   │
└─────────────────────────────┘
```

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Shell causes hydration mismatch | Low | Medium | usePathname is client-safe |
| Unsplash image unavailable | Low | Low | Gradient fallback remains |
| pointer-events-none breaks intended interactions | Low | Low | Only applied to overlay, not entire background |
| Debug logs shipped to production | Medium | Low | Documented for future cleanup |

## Dependencies

- No new npm packages required
- Uses existing Next.js `usePathname` hook
- Unsplash allows free hotlinking (no API key needed)

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `components/layout/Shell.tsx` | CREATE | Conditional layout wrapper |
| `app/layout.tsx` | MODIFY | Use Shell instead of direct header/footer |
| `app/login/page.tsx` | MODIFY | Add z-10 to form container |
| `components/auth/BackgroundRotator.tsx` | MODIFY | Add pointer-events-none to overlay |
| `hooks/useBackgroundImages.ts` | MODIFY | Add fallback URL, reduce timeout |
| `components/auth/LoginForm.tsx` | MODIFY | Add debug console.log |
| `components/auth/RegistrationForm.tsx` | MODIFY | Add debug console.log |
