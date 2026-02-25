# Research: Login Rescue Sprint

**Feature**: 022-login-rescue | **Date**: 2025-12-06

## Problem Statement

Users experience an infinite loading spinner when visiting the /login page. The login form never appears, preventing access to the application.

## Root Cause Investigation

### Finding 1: Blocking Render Gate

**Location**: `app/login/page.tsx` lines 55-62

The login page has a conditional render that blocks the entire page content when either:
- `loading` is true (auth state is being determined)
- `user` is truthy (user is already authenticated)

```tsx
if (loading || user) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full ..." />
    </div>
  );
}
```

**Impact**: HIGH - This is the primary cause. If Firebase Auth's `onAuthStateChanged` is slow to fire (network issues, Firebase SDK initialization delays), the `loading` state remains `true` indefinitely.

### Finding 2: No Timeout in Auth Hook

**Location**: `hooks/useAuth.ts`

The `useAuth` hook listens for auth state via Firebase's `onAuthStateChanged`:

```tsx
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    // Sets loading to false only when callback fires
    setLoading(false);
  });
  return unsubscribe;
}, []);
```

**Impact**: MEDIUM - The callback depends entirely on Firebase SDK. No timeout or fallback ensures `loading` eventually becomes `false`.

### Finding 3: No Timeout in Background Image Fetching

**Location**: `hooks/useBackgroundImages.ts`

```tsx
const result = await listAll(storageRef);
const urls = await Promise.all(
  result.items.map((item) => getDownloadURL(item))
);
```

**Impact**: MEDIUM - If Firebase Storage is slow or unavailable, the `loading` state persists. While this doesn't block the form (it's in BackgroundRotator), it contributes to poor UX.

### Finding 4: Existing Redirect Logic is Correct

**Location**: `app/login/page.tsx` lines 44-48

```tsx
useEffect(() => {
  if (!loading && user) {
    router.replace(decodeURIComponent(returnUrl));
  }
}, [user, loading, router, returnUrl]);
```

**Assessment**: This is the correct pattern - redirect via effect, not blocking render. The problem is the redundant blocking gate above.

## Decision Records

### DR-001: Remove Blocking Render Gate

**Decision**: Remove the `if (loading || user)` block entirely from `app/login/page.tsx`

**Alternatives Considered**:
1. ❌ Add a timeout to the gate - Still blocks form, just for less time
2. ❌ Show form with overlay spinner - More complex, less clean
3. ✅ Remove gate, rely on useEffect redirect - Simple, form always accessible

**Rationale**: The redirect is already handled by `useEffect`. The blocking gate is redundant and causes the bug. Removing it means:
- Form always renders immediately
- Users can interact while auth resolves
- Already-authenticated users get redirected via effect

### DR-002: Add Auth Timeout with Force Display

**Decision**: Add a 3-second timeout to `useAuth` hook that sets `loading` to `false` regardless of Firebase response

**Implementation**:
```tsx
useEffect(() => {
  // Force loading to false after 3 seconds
  const timeout = setTimeout(() => {
    setLoading(false);
  }, 3000);

  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    clearTimeout(timeout);
    // ... existing logic
    setLoading(false);
  });

  return () => {
    clearTimeout(timeout);
    unsubscribe();
  };
}, []);
```

**Rationale**: This ensures the auth hook never hangs indefinitely. 3 seconds allows reasonable time for Firebase to respond while providing a failsafe.

### DR-003: Add Image Loading Timeout

**Decision**: Add 2-second timeout to `useBackgroundImages` using `Promise.race()`

**Implementation**:
```tsx
const FETCH_TIMEOUT_MS = 2000;

async function fetchImages() {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), FETCH_TIMEOUT_MS);
    });

    const fetchPromise = async () => {
      const storageRef = ref(storage, BACKGROUNDS_PATH);
      const result = await listAll(storageRef);
      // ...
    };

    const urls = await Promise.race([fetchPromise(), timeoutPromise]);
    // ...
  } catch (err) {
    // Timeout or error - use fallback
    setImages([]);
  } finally {
    setLoading(false);
  }
}
```

**Rationale**: Standard timeout pattern. 2 seconds is enough for fast connections; slow connections get fallback gradient.

### DR-004: Background Fade-In Transition

**Decision**: Modify `BackgroundRotator` to always render gradient base + image overlay with opacity transition

**Implementation**:
```tsx
return (
  <div className="fixed inset-0 -z-10">
    {/* Base gradient - always visible */}
    <div className="absolute inset-0" style={{ background: FALLBACK_GRADIENT }} />

    {/* Image overlay - fades in when loaded */}
    {selectedImage && (
      <div className={cn(
        'absolute inset-0 transition-opacity duration-500',
        imageLoaded ? 'opacity-100' : 'opacity-0'
      )}>
        <Image
          src={selectedImage}
          onLoad={() => setImageLoaded(true)}
          // ...
        />
      </div>
    )}
  </div>
);
```

**Rationale**: Smooth UX - gradient shows immediately, image fades in when ready. No jarring transitions.

### DR-005: Logo Filter Check

**Decision**: Verify logo has no CSS filters applied in login card

**Finding**: The logo in `app/login/page.tsx` lines 74-81 has no filter classes - it's a clean `<Image>` component.

```tsx
<Image
  src="/logos/small_gearshack_logo.png"
  alt="Gearshack Logo"
  width={64}
  height={64}
  className="h-16 w-16"  // No brightness-0 invert
  priority
/>
```

**Assessment**: ✅ PASS - Logo already displays correctly. Feature 021 may have addressed any previous issues.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Login Page                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Background Layer (z-index: -10)                         │ │
│  │  ┌────────────────┐  ┌────────────────────────────┐     │ │
│  │  │ Gradient Base  │  │ Image Overlay (fade-in)    │     │ │
│  │  │ (always shown) │  │ (when loaded, or timeout)  │     │ │
│  │  └────────────────┘  └────────────────────────────┘     │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Form Layer (z-index: auto, above background)            │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │ Glassmorphism Card                                │   │ │
│  │  │  - Logo (no filters)                              │   │ │
│  │  │  - Login/Register/Forgot forms                    │   │ │
│  │  │  - Google Sign-In button                          │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Timeline:
0ms      - Page loads, gradient shown, form visible
1000ms   - Form interactive (target)
2000ms   - Image timeout (fallback gradient stays)
3000ms   - Auth timeout (form usable regardless)
```

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Firebase Auth never responds | Low | High | 3-second timeout ensures form access |
| Firebase Storage unavailable | Low | Low | 2-second timeout + gradient fallback |
| Hydration mismatch | Low | Medium | All state initialized client-side in useEffect |
| Flash of unauthenticated content | Medium | Low | Acceptable - form renders briefly before redirect |

## Dependencies

- No new npm packages required
- All changes use existing React, Next.js, and Firebase APIs
- Timeout values (2s images, 3s auth) are configurable constants

## Testing Strategy

1. **Happy path**: Login page loads, form visible < 1s, background fades in
2. **Slow auth**: Simulate delayed Firebase response, verify form appears at 3s
3. **No images**: Remove storage access, verify gradient fallback
4. **Already authed**: Verify redirect happens via effect, not blocking
5. **Build validation**: `npm run lint && npm run build` must pass
