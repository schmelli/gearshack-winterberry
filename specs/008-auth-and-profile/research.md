# Research: Identity & Access with Profile Management

**Feature**: 008-auth-and-profile
**Date**: 2025-12-05

## Research Topics

### 1. Firebase Auth with Next.js App Router

**Decision**: Use Firebase JS SDK v9+ (modular) with client-side authentication

**Rationale**:
- Next.js 16+ App Router requires client-side Firebase Auth for OAuth flows
- Modular SDK provides tree-shaking for smaller bundle size
- `onAuthStateChanged` listener provides reactive auth state
- Session persistence handled by Firebase SDK automatically

**Alternatives Considered**:
- Firebase Admin SDK (server-side): Rejected - requires server actions for every auth operation, incompatible with OAuth popup flows
- NextAuth.js: Rejected - adds unnecessary abstraction layer when using Firebase directly
- Firebase Auth REST API: Rejected - more complex than SDK, no built-in state management

**Implementation Pattern**:
```typescript
// Client-side auth provider pattern
'use client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 2. Route Protection in Next.js App Router

**Decision**: Use client-side protection with redirect via `useRouter`

**Rationale**:
- App Router middleware cannot access Firebase Auth state (client-side only)
- Client-side redirect provides immediate feedback during loading
- Can show loading skeleton while checking auth state
- Simpler than server-side session verification for MVP

**Alternatives Considered**:
- Next.js Middleware with cookies: Rejected - requires session cookie management, more complex
- Server Components with redirect(): Rejected - Firebase Auth state not available server-side
- Layout-based protection: Considered - but component-based is more flexible

**Implementation Pattern**:
```typescript
'use client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, loading, router]);

  if (loading) return <LoadingSkeleton />;
  if (!user) return null;
  return <>{children}</>;
}
```

### 3. Firestore Profile Integration

**Decision**: Fetch profile on auth state change, merge with Auth data in hook

**Rationale**:
- Single source of truth for merged user data
- Automatic profile creation for new users
- Preserves existing fields during updates (spread operator)
- Real-time updates via `onSnapshot` (optional, can add later)

**Alternatives Considered**:
- Fetch on every page load: Rejected - unnecessary network calls
- Store profile in Auth custom claims: Rejected - limited to 1000 bytes, requires Admin SDK
- Local storage cache: Considered - can add for offline support later

**Implementation Pattern**:
```typescript
// Firestore document structure at userBase/{uid}
interface UserProfile {
  avatarUrl?: string;
  displayName: string;
  trailName?: string;
  bio?: string;
  location?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  website?: string;
  isVIP?: boolean;
  first_launch?: Timestamp;
}

// Merge function preserving system fields
function mergeProfileUpdate(
  existing: UserProfile,
  updates: Partial<UserProfile>
): UserProfile {
  const { isVIP, first_launch, ...rest } = existing;
  return {
    ...rest,
    ...updates,
    isVIP, // Preserve
    first_launch, // Preserve
  };
}
```

### 4. Firebase Storage Background Images

**Decision**: List files from `backgrounds/hd` folder, preload images for smooth rotation

**Rationale**:
- `listAll()` provides dynamic image discovery
- Preloading prevents visible loading during rotation
- Fallback gradient ensures graceful degradation
- 5-10 second rotation provides immersive experience

**Alternatives Considered**:
- Hardcoded image URLs: Rejected - not dynamic, requires code changes to add images
- Single static background: Rejected - spec requires rotation
- CSS-only transitions: Used - simpler than JS animation libraries

**Implementation Pattern**:
```typescript
// Storage path: backgrounds/hd/
// Expected files: nature1.jpg, nature2.jpg, etc.

async function fetchBackgroundUrls(): Promise<string[]> {
  const storageRef = ref(storage, 'backgrounds/hd');
  const result = await listAll(storageRef);
  const urls = await Promise.all(
    result.items.map((item) => getDownloadURL(item))
  );
  return urls;
}
```

### 5. Next.js Image Configuration

**Decision**: Configure `next.config.ts` with Firebase and Google domains

**Rationale**:
- Required for Next.js Image optimization
- Firebase Storage domain for backgrounds and user uploads
- Google domain for OAuth profile photos

**Implementation**:
```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};
```

### 6. Form Validation with Zod

**Decision**: Use Zod schemas integrated with react-hook-form

**Rationale**:
- Consistent with existing project patterns (gear-schema, loadout-schema)
- Type-safe validation with TypeScript inference
- Clear error messages for users
- Reusable across components

**Implementation Pattern**:
```typescript
import { z } from 'zod';

export const profileSchema = z.object({
  displayName: z.string().min(2).max(50),
  trailName: z.string().min(2).max(30).optional().or(z.literal('')),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
  facebook: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
```

## Dependencies to Add

| Package | Version | Purpose |
|---------|---------|---------|
| firebase | ^10.x | Auth, Firestore, Storage |

**Installation**: `npm install firebase`

## Environment Variables Required

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Security Considerations

1. **Firebase Security Rules**: Assume Firestore rules allow authenticated users to read/write their own `userBase/{uid}` document
2. **Environment Variables**: Use `NEXT_PUBLIC_` prefix for client-side Firebase config (safe to expose)
3. **Error Messages**: Never reveal if email exists in password reset flow (already in spec)
4. **URL Validation**: Validate avatar and social URLs to prevent XSS
