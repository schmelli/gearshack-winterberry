# Quickstart: Login Rescue Sprint

**Feature**: 022-login-rescue | **Estimated Tasks**: 8

## Prerequisites

- [ ] Read `spec.md` - understand the 4 user stories
- [ ] Read `plan.md` - understand root cause analysis
- [ ] Read `research.md` - understand decisions and architecture

## Implementation Checklist

### Phase 1: Auth Timeout (User Story 2)

**File**: `hooks/useAuth.ts`

- [ ] Add timeout constant `AUTH_TIMEOUT_MS = 3000`
- [ ] In `useEffect`, add `setTimeout` that sets `loading` to `false` after 3 seconds
- [ ] Clear timeout when `onAuthStateChanged` fires or on cleanup
- [ ] Ensure no memory leaks (clearTimeout in cleanup)

**Verification**: Auth hook will timeout if Firebase is slow

### Phase 2: Background Image Timeout (User Story 3)

**File**: `hooks/useBackgroundImages.ts`

- [ ] Add timeout constant `IMAGE_FETCH_TIMEOUT_MS = 2000`
- [ ] Wrap `fetchImages` in `Promise.race()` with timeout promise
- [ ] Catch timeout errors and fall back to empty images
- [ ] Ensure `setLoading(false)` called in all paths

**Verification**: Images timeout gracefully, fallback gradient used

### Phase 3: Remove Blocking Gate (User Story 1 - PRIMARY FIX)

**File**: `app/login/page.tsx`

- [ ] DELETE lines 55-62 (the `if (loading || user)` block with spinner)
- [ ] The existing `useEffect` redirect (lines 44-48) handles authenticated users
- [ ] Form will now always render immediately

**Verification**: Login form visible within 1 second, no infinite spinner

### Phase 4: Background Fade-In (User Story 3)

**File**: `components/auth/BackgroundRotator.tsx`

- [ ] Add state `const [imageLoaded, setImageLoaded] = useState(false)`
- [ ] Always render gradient as base layer
- [ ] Render image with `onLoad={() => setImageLoaded(true)}`
- [ ] Use `transition-opacity duration-500` and `opacity-0`/`opacity-100` based on `imageLoaded`
- [ ] Remove conditional early return for loading state

**Verification**: Gradient shows immediately, image fades in smoothly

### Phase 5: Logo Verification (User Story 4)

**File**: `app/login/page.tsx`

- [ ] Verify logo `<Image>` at lines 74-81 has no filter classes
- [ ] Confirm no `brightness-0`, `invert`, or similar CSS filters

**Verification**: Logo displays with original brand colors

### Phase 6: Validation

- [ ] Run `npm run lint` - must pass
- [ ] Run `npm run build` - must succeed
- [ ] Manual test: Navigate to /login, verify form visible < 1 second
- [ ] Manual test: Hard refresh while logged in, verify redirect works
- [ ] Manual test: Check background gradient/image transition

## Success Criteria Checklist

From spec.md:

- [ ] SC-001: Login form visible within 1 second in 100% of scenarios
- [ ] SC-002: Users can begin entering credentials within 2 seconds
- [ ] SC-003: Zero instances of infinite loading spinner
- [ ] SC-004: Background loading failures do not prevent form access
- [ ] SC-005: All changes pass lint and build validation
- [ ] SC-006: Login page works when external services are slow/unavailable

## Key Code Patterns

### Auth Timeout Pattern (useAuth.ts)

```tsx
useEffect(() => {
  const timeout = setTimeout(() => {
    setLoading(false);
  }, AUTH_TIMEOUT_MS);

  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    clearTimeout(timeout);
    if (firebaseUser) {
      setUser(mapFirebaseUser(firebaseUser));
    } else {
      setUser(null);
    }
    setLoading(false);
  });

  return () => {
    clearTimeout(timeout);
    unsubscribe();
  };
}, []);
```

### Image Fetch Timeout Pattern (useBackgroundImages.ts)

```tsx
const timeoutPromise = new Promise<string[]>((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), IMAGE_FETCH_TIMEOUT_MS)
);

try {
  const urls = await Promise.race([fetchImagesAsync(), timeoutPromise]);
  setImages(urls);
} catch {
  setImages([]); // Fallback to empty, triggers gradient
} finally {
  setLoading(false);
}
```

### Background Fade-In Pattern (BackgroundRotator.tsx)

```tsx
return (
  <div className="fixed inset-0 -z-10">
    {/* Always-visible gradient */}
    <div className="absolute inset-0" style={{ background: FALLBACK_GRADIENT }} />

    {/* Image with fade-in */}
    {selectedImage && (
      <Image
        src={selectedImage}
        onLoad={() => setImageLoaded(true)}
        className={cn(
          'object-cover transition-opacity duration-500',
          imageLoaded ? 'opacity-100' : 'opacity-0'
        )}
        fill
      />
    )}
  </div>
);
```

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `hooks/useAuth.ts` | Add 3-second timeout |
| `hooks/useBackgroundImages.ts` | Add 2-second timeout |
| `app/login/page.tsx` | Remove blocking render gate |
| `components/auth/BackgroundRotator.tsx` | Add fade-in transition |

## Common Pitfalls

1. **Don't forget cleanup** - Always `clearTimeout` in useEffect cleanup
2. **Promise.race typing** - Ensure return type matches expected
3. **State ordering** - Set `loading` to `false` AFTER setting other state
4. **Transition classes** - Use both `transition-opacity` AND `duration-*`
