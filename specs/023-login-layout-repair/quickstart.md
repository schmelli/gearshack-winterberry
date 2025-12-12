# Quickstart: Login Repair & Layout Architecture Sprint

**Feature**: 023-login-layout-repair | **Estimated Tasks**: 12

## Prerequisites

- [ ] Read `spec.md` - understand the 4 user stories
- [ ] Read `plan.md` - understand root cause analysis
- [ ] Read `research.md` - understand decisions and architecture

## Implementation Checklist

### Phase 1: Create Shell Component (User Story 2)

**File**: `components/layout/Shell.tsx` (NEW FILE)

- [ ] Create new file `components/layout/Shell.tsx`
- [ ] Add `'use client'` directive (required for usePathname)
- [ ] Import `usePathname` from `next/navigation`
- [ ] Import `SiteHeader` and `SiteFooter` from `@/components/layout`
- [ ] Define `AUTH_ROUTES` array: `['/login', '/register']`
- [ ] Create `Shell` component that:
  - Uses `usePathname()` to get current route
  - Returns only `{children}` for auth routes
  - Returns full layout (header + main + footer) for other routes
- [ ] Export the Shell component

**Verification**: Component created, no lint errors

### Phase 2: Update Root Layout (User Story 2)

**File**: `app/layout.tsx`

- [ ] Import `Shell` from `@/components/layout/Shell`
- [ ] Remove the `<div className="flex min-h-screen flex-col">` wrapper and direct header/footer
- [ ] Wrap `{children}` in `<Shell>{children}</Shell>`
- [ ] Remove unused imports for SiteHeader and SiteFooter from layout.tsx

**Verification**: Layout updated, login page should not show header/footer

### Phase 3: Fix Z-Index on Login Page (User Story 1)

**File**: `app/login/page.tsx`

- [ ] Find the form container div (line ~65): `<div className="relative flex min-h-screen...`
- [ ] Add `z-10` class to ensure it's above background
- [ ] Verify className is: `relative z-10 flex min-h-screen items-center justify-center p-4`

**Verification**: Form container has explicit z-index

### Phase 4: Fix Background Overlay Click-Through (User Story 1)

**File**: `components/auth/BackgroundRotator.tsx`

- [ ] Find the overlay div (line ~73): `<div className="absolute inset-0 bg-black/30" />`
- [ ] Add `pointer-events-none` class to prevent click interception
- [ ] Updated className: `absolute inset-0 bg-black/30 pointer-events-none`

**Verification**: Overlay has pointer-events-none

### Phase 5: Add Fallback Image URL (User Story 3)

**File**: `hooks/useBackgroundImages.ts`

- [ ] Add fallback image constant after existing constants:
  ```tsx
  const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80';
  ```
- [ ] Change timeout from `2000` to `1500` (FR-007)
- [ ] In catch block, change `setImages([])` to `setImages([FALLBACK_IMAGE_URL])`

**Verification**: Fallback URL defined, timeout updated, error handling uses fallback

### Phase 6: Add Debug Logging (User Story 4)

**File**: `components/auth/LoginForm.tsx`

- [ ] In `onSubmit` function, add as first line:
  ```tsx
  console.log('[LoginForm] onSubmit triggered', { email: data.email });
  ```

**File**: `components/auth/RegistrationForm.tsx`

- [ ] In `onSubmit` function, add as first line:
  ```tsx
  console.log('[RegistrationForm] onSubmit triggered', { email: data.email });
  ```

**Verification**: Console logs added to both forms

### Phase 7: Validation

- [ ] Run `npm run lint` - must pass
- [ ] Run `npm run build` - must succeed
- [ ] Manual test: Navigate to /login
  - [ ] Header and footer are NOT visible
  - [ ] Login button is clickable (console log appears)
  - [ ] Register link works
  - [ ] Background shows gradient/image (not black)
- [ ] Manual test: Navigate to /inventory
  - [ ] Header and footer ARE visible

## Success Criteria Checklist

From spec.md:

- [ ] SC-001: 100% of login/register button clicks are registered (verified via console logs)
- [ ] SC-002: Login page displays without SiteHeader and SiteFooter
- [ ] SC-003: All other pages display with SiteHeader and SiteFooter
- [ ] SC-004: Background is never black (fallback within 1.5 seconds)
- [ ] SC-005: All form elements are clickable without obstruction
- [ ] SC-006: All changes pass lint and build validation

## Key Code Patterns

### Shell Component Pattern

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

### Updated Layout Pattern

```tsx
// app/layout.tsx - body content
<ThemeProvider>
  <AuthProvider>
    <SyncProvider />
    <Shell>{children}</Shell>
    <Toaster richColors position="bottom-right" />
  </AuthProvider>
</ThemeProvider>
```

### Debug Logging Pattern

```tsx
async function onSubmit(data: LoginFormData) {
  console.log('[LoginForm] onSubmit triggered', { email: data.email });
  clearError();
  setIsLoading(true);
  // ... rest of existing code
}
```

## Files Summary

| File | Action | Key Changes |
|------|--------|-------------|
| `components/layout/Shell.tsx` | CREATE | Conditional layout wrapper |
| `app/layout.tsx` | MODIFY | Use Shell, remove direct header/footer |
| `app/login/page.tsx` | MODIFY | Add `z-10` to form container |
| `components/auth/BackgroundRotator.tsx` | MODIFY | Add `pointer-events-none` to overlay |
| `hooks/useBackgroundImages.ts` | MODIFY | Add fallback URL, reduce timeout to 1.5s |
| `components/auth/LoginForm.tsx` | MODIFY | Add debug console.log |
| `components/auth/RegistrationForm.tsx` | MODIFY | Add debug console.log |

## Common Pitfalls

1. **Forgetting 'use client'** - Shell.tsx must be a client component for usePathname
2. **Import path errors** - Use `@/components/layout/Shell` not relative paths
3. **Z-index without position** - `z-10` requires `relative` or `absolute` positioning
4. **Timeout value** - Ensure it's 1500 not 2000 (spec requirement)
5. **Unsplash URL** - Must include width and quality params for reliability
