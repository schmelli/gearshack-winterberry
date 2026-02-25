# Authentication System

**Status**: ✅ Active
**Feature**: 040-supabase-migration (replaced Firebase Auth)
**Primary Hook**: `hooks/useSupabaseAuth.ts`
**Provider**: `components/auth/SupabaseAuthProvider.tsx`
**Database**: `auth.users`, `public.profiles` tables

## Overview

Das Authentication System von Gearshack basiert auf **Supabase Auth** und bietet Email/Password-basierte Authentifizierung mit Magic Links (OTP) als Alternative. Das System wurde während der Supabase-Migration (Feature 040) von Firebase Auth auf Supabase Auth umgestellt, wobei volle API-Kompatibilität beibehalten wurde.

### Core Features
- Email/Password Registration & Login
- Magic Link (OTP) Authentication
- Session Management mit Cookies (@supabase/ssr)
- Protected Routes mit automatischer Redirect-Logik
- User Profiles mit erweiterten Metadaten
- Row-Level Security (RLS) Policies für Datenschutz
- Auto-refresh von Sessions (ohne user action)
- Auth State Listener mit 3s Timeout Failsafe
- Return URL Preservation (nach Login)
- Parallel Data Fetching (Gear Items + Loadouts) beim Login

---

## Core Concepts

### Auth User vs Profile

**Auth User** (`auth.users` table):
- Von Supabase Auth verwaltet
- Enthält: `id`, `email`, `email_confirmed_at`, `user_metadata`
- Automatisch erstellt bei Sign-up
- Immutable (außer email, password)

**Profile** (`public.profiles` table):
- App-spezifische User-Daten
- Enthält: `display_name`, `avatar_url`, `bio`, `location`, Social Links, etc.
- Manuell erstellt/aktualisiert
- Vollständig kontrolliert vom User

**Merged User**:
- Kombination aus Auth User + Profile
- Wird im Frontend für UI genutzt
- Avatar Precedence: Custom Avatar > Provider Avatar

```typescript
interface AuthUser {
  uid: string;           // From auth.users.id
  email: string | null;  // From auth.users.email
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

interface UserProfile {
  displayName: string;
  avatarUrl?: string;
  trailName?: string;
  bio?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  // Social Links
  instagram?: string;
  facebook?: string;
  youtube?: string;
  website?: string;
}

interface MergedUser extends AuthUser {
  // Profile overrides
  displayName: string;  // From profile.display_name (or fallback)
  avatarUrl: string | null;
  providerAvatarUrl: string | null;  // From OAuth provider
  trailName: string | null;
  bio: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  // Social
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  website: string | null;
  // Permissions
  isVIP: boolean;
  isAdmin: boolean;  // From profiles.role = 'admin'
}
```

---

## Authentication Flow

### Email/Password Registration

**Step 1: User fills registration form**
```tsx
<RegistrationForm />  // components/auth/RegistrationForm.tsx
```

**Step 2: Submit to Supabase**
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

**Step 3: Handle responses**

**Case A: Email Confirmation Required** (default Supabase config):
```typescript
if (data.user && !data.session) {
  const isNewUser = data.user.identities && data.user.identities.length > 0;

  if (isNewUser) {
    // User created, needs email confirmation
    throw new Error('CONFIRMATION_REQUIRED');  // Caught by form
  } else {
    // User already exists (Supabase fake success for security)
    throw new Error('Account already exists. Please sign in.');
  }
}
```

→ Show message: "Check your email and click the confirmation link."
→ User klickt Link → Email verifiziert → Auto-Login

**Case B: No Email Confirmation** (disabled in Supabase config):
```typescript
if (data.user && data.session) {
  // User created AND logged in
  // Profile row auto-created via Database Trigger
  router.push('/inventory');
}
```

**Step 4: Profile Creation** (Automatic)

Supabase Trigger erstellt automatisch Profile-Row:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### Email/Password Login

**Step 1: User fills login form**
```tsx
<LoginForm />  // components/auth/LoginForm.tsx
```

**Step 2: Submit to Supabase**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

**Step 3: Handle responses**

**Success**:
```typescript
if (data.session && data.user) {
  // Session created, user logged in
  // SupabaseAuthProvider fetches gear items + loadouts (parallel)
  router.push(returnUrl || '/inventory');
}
```

**Error Cases**:
```typescript
// Email not confirmed
if (error.message.includes('Email not confirmed')) {
  throw new Error('Please check your email and click the confirmation link.');
}

// Invalid credentials
if (error.message.includes('Invalid login credentials')) {
  throw new Error('Invalid email or password. Please try again.');
}

// Generic error
throw new Error(error.message);
```

### Magic Link (OTP) Login

**Alternative to password**: User bekommt Login-Link via Email.

**Step 1: User gibt Email ein**
```tsx
<ForgotPasswordForm />  // components/auth/ForgotPasswordForm.tsx
```

**Step 2: Request Magic Link**
```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

**Step 3: Check email**
→ User klickt Link → Auto-Login → Session created

**Use Cases**:
- Passwort vergessen
- Passwordless Login
- Secure login ohne Password-Manager

### Sign Out

**Simple logout**:
```typescript
await supabase.auth.signOut();
```

**Effect**:
- Session invalidiert (cookie deleted)
- `user` state → `null`
- Redirect to `/login` (via auth listener)
- Gear Items + Loadouts cleared from store

---

## Session Management

### Cookie-based Sessions

Supabase SSR nutzt HTTP-only cookies für Session-Management:

**Client-Side** (`lib/supabase/client.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

→ Auto-manages cookies via browser APIs
→ Session refresh handled automatically
→ No manual token management needed

**Server-Side** (`lib/supabase/server.ts`):
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component limitation - ignore
          }
        },
      },
    }
  );
}
```

→ Reads cookies from Next.js `cookies()`
→ Writes cookies for session refresh
→ Compatible with Server Components + Route Handlers

### Auth State Listener

**Problem**: Wie wissen wir, wenn sich der Auth State ändert?

**Solution**: `onAuthStateChange` Listener

```typescript
// hooks/useSupabaseAuth.ts
useEffect(() => {
  // Failsafe timeout (3 seconds)
  const timeout = setTimeout(() => {
    setIsLoading(false);
  }, 3000);

  // Get initial session
  const getInitialSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      setError(error);
    } else {
      setSession(session);
      setUser(session?.user ?? null);
    }

    clearTimeout(timeout);
    setIsLoading(false);
  };

  getInitialSession();

  // Subscribe to auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, newSession) => {
      clearTimeout(timeout);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    }
  );

  return () => {
    clearTimeout(timeout);
    subscription.unsubscribe();
  };
}, [supabase.auth]);
```

**Events**:
- `SIGNED_IN` - User logged in
- `SIGNED_OUT` - User logged out
- `TOKEN_REFRESHED` - Session refreshed (automatic, hourly)
- `USER_UPDATED` - User metadata changed
- `PASSWORD_RECOVERY` - Password reset initiated

**Timeout Failsafe**:
- Verhindert unendliches Loading
- Nach 3s wird `isLoading = false` gesetzt (auch wenn kein Event kam)
- Matches existing Firebase behavior

### Session Refresh

**Automatic Refresh**:
- Supabase refresht Sessions automatisch jede Stunde
- Kein manueller Code nötig
- Läuft im Hintergrund via `@supabase/ssr`

**Manual Refresh** (falls nötig):
```typescript
const { data, error } = await supabase.auth.refreshSession();
```

---

## Protected Routes

### ProtectedRoute Component

**Wrapper** für pages die Auth erfordern:

```tsx
// app/[locale]/inventory/page.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <InventoryContent />
    </ProtectedRoute>
  );
}
```

**Implementation**:
```typescript
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuthContext();

  useEffect(() => {
    if (loading) return;  // Wait for auth check

    if (!user) {
      // Store return URL for redirect after login (FR-009)
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
    }
  }, [user, loading, router, pathname]);

  // Show loading spinner while checking auth
  if (loading) {
    return <>{fallback || <LoadingSpinner />}</>;
  }

  // Don't render if not authenticated (redirect happens)
  if (!user) {
    return <>{fallback || <LoadingSpinner />}</>;
  }

  // User authenticated, render children
  return <>{children}</>;
}
```

**Return URL Feature**:
1. User navigates to `/inventory` (unauthenticated)
2. ProtectedRoute redirects to `/login?returnUrl=%2Finventory`
3. User logs in
4. Redirect to `/inventory` (preserved URL)

**Custom Fallback**:
```tsx
<ProtectedRoute fallback={<CustomLoadingState />}>
  <Content />
</ProtectedRoute>
```

### AdminRoute Component

**Für Admin-only Pages**:

```tsx
// app/[locale]/admin/page.tsx
import { AdminRoute } from '@/components/auth/AdminRoute';

export default function AdminPage() {
  return (
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  );
}
```

**Check**: `profile.role === 'admin'`

**Implementation**:
```typescript
export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (profile.loading) return;

    if (!profile.mergedUser?.isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      router.replace('/inventory');
    }
  }, [profile.loading, profile.mergedUser, router]);

  if (profile.loading) {
    return <LoadingSpinner />;
  }

  if (!profile.mergedUser?.isAdmin) {
    return <LoadingSpinner />;  // Redirect happens
  }

  return <>{children}</>;
}
```

---

## Row-Level Security (RLS)

### Concept

**RLS** = PostgreSQL Feature für Row-basierte Zugriffskontrolle.

**Vorteil**:
- Kein application-level filtering nötig
- Sicher (selbst bei SQL Injection)
- Applies to ALL queries (including direct DB access)

### auth.uid() Function

**Magic Function** für RLS Policies:

```sql
auth.uid()  -- Returns current user's ID (from JWT token)
```

**Example Policy**:
```sql
CREATE POLICY "Users can view own gear items" ON gear_items
  FOR SELECT USING (user_id = auth.uid());
```

→ User kann nur eigene Items sehen (automatisch gefiltert)

### Common RLS Patterns

**1. Own Records Only**:
```sql
-- Read
CREATE POLICY "Users view own loadouts" ON loadouts
  FOR SELECT USING (user_id = auth.uid());

-- Create
CREATE POLICY "Users create own loadouts" ON loadouts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update
CREATE POLICY "Users update own loadouts" ON loadouts
  FOR UPDATE USING (user_id = auth.uid());

-- Delete
CREATE POLICY "Users delete own loadouts" ON loadouts
  FOR DELETE USING (user_id = auth.uid());
```

**2. Public Read, Own Write**:
```sql
-- Anyone can read public loadouts
CREATE POLICY "Public loadouts visible" ON loadouts
  FOR SELECT USING (
    is_public = true OR user_id = auth.uid()
  );

-- But only owner can update
CREATE POLICY "Users update own loadouts" ON loadouts
  FOR UPDATE USING (user_id = auth.uid());
```

**3. Shared Access (Junction Table)**:
```sql
-- Users can read loadouts they're invited to
CREATE POLICY "Users view shared loadouts" ON loadouts
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM loadout_shares
      WHERE loadout_shares.loadout_id = loadouts.id
      AND loadout_shares.shared_with_user_id = auth.uid()
    )
  );
```

**4. Admin Override**:
```sql
CREATE POLICY "Admins view all loadouts" ON loadouts
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### Service Role Client (Bypass RLS)

**Use Case**: Background jobs, admin operations, cron tasks.

**Warning**: ⚠️ **Bypasses ALL RLS policies!** Nur für trusted code.

```typescript
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServiceRoleClient();

  // Can update ANY user's data (no RLS)
  await supabase
    .from('price_tracking')
    .update({ last_checked_at: new Date() })
    .eq('status', 'active');
}
```

**When to use**:
- ✅ Cron jobs (price tracking, email notifications)
- ✅ Admin operations (bulk updates, data cleanup)
- ✅ Service-to-service communication
- ❌ User-facing operations (always use regular client with RLS)

---

## Parallel Data Fetching

### Problem

**Original Flow** (Waterfall):
```
1. User logs in (500ms)
   ↓
2. Auth state updates (100ms)
   ↓
3. Fetch gear items (200ms)
   ↓
4. Fetch loadouts (300ms)
   ↓
Total: ~1100ms
```

### Solution: Parallel Fetching

**New Flow** (Feature 040):
```
1. User logs in (500ms)
   ↓
2. Auth state updates (100ms)
   ↓
3. Fetch gear items + loadouts in parallel (300ms)
   ↓
Total: ~900ms (20% faster)
```

**Implementation** (`SupabaseAuthProvider.tsx`):
```typescript
useEffect(() => {
  const userId = user?.id;
  if (!userId) {
    setRemoteGearItems([]);
    setRemoteLoadouts([]);
    return;
  }

  let isCancelled = false;  // Race condition protection

  const fetchUserData = async () => {
    const supabase = createClient();

    // 🚀 Parallel fetch: gear items AND loadouts at the same time
    const [gearResult, loadoutsResult] = await Promise.all([
      supabase
        .from('gear_items')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'own')
        .order('created_at', { ascending: false }),

      supabase
        .from('loadouts')
        .select(`*, generated_images!loadouts_hero_image_id_fkey (cloudinary_url)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    if (isCancelled) return;  // User changed or component unmounted

    // Process results
    if (!gearResult.error) {
      setRemoteGearItems(gearResult.data.map(gearItemFromDb));
    }

    if (!loadoutsResult.error) {
      // Fetch loadout items (after we have loadout IDs)
      const loadoutIds = loadoutsResult.data.map(l => l.id);
      const { data: itemsData } = await supabase
        .from('loadout_items')
        .select('*')
        .in('loadout_id', loadoutIds);

      if (!isCancelled) {
        setRemoteLoadouts(transformLoadouts(loadoutsResult.data, itemsData));
      }
    }
  };

  fetchUserData();

  return () => { isCancelled = true; };  // Cleanup
}, [user?.id, setRemoteGearItems, setRemoteLoadouts]);
```

**Race Condition Protection**:
- `isCancelled` flag verhindert stale data
- Wenn User ID sich ändert (z.B. Logout während Fetch) → fetch ignorieren

**Performance Impact**:
- Initial load time: **-200 to -400ms** (20-40% faster)
- User Experience: Items sofort sichtbar nach Login

---

## User Profile Management

### Profile Structure

**Database** (`public.profiles`):
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Basic Info
  display_name TEXT,
  avatar_url TEXT,
  trail_name TEXT,
  bio TEXT,

  -- Location
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Social Links
  instagram TEXT,
  facebook TEXT,
  youtube TEXT,
  website TEXT,

  -- Permissions
  role TEXT DEFAULT 'user',  -- 'user' | 'admin'

  -- Stats (Feature 001-community-shakedowns, T071)
  shakedown_request_count INTEGER DEFAULT 0,
  shakedown_response_count INTEGER DEFAULT 0,
  helpful_response_count INTEGER DEFAULT 0
);
```

### Updating Profile

**Hook**: `useSupabaseProfile.ts`

```typescript
const { updateProfile } = useAuthContext().profile;

await updateProfile({
  displayName: 'John Doe',
  bio: 'Thru-hiker from Oregon',
  trailName: 'Wanderer',
  locationName: 'Portland, OR',
  latitude: 45.5152,
  longitude: -122.6784,
  instagram: 'john_hiker',
  website: 'https://johnhiker.com',
});
```

**Implementation**:
```typescript
export function useSupabaseProfile(userId: string | null) {
  const updateProfile = async (data: Partial<ProfileUpdate>) => {
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        trail_name: data.trail_name,
        bio: data.bio,
        location_name: data.location_name,
        latitude: data.latitude,
        longitude: data.longitude,
        instagram: data.instagram,
        facebook: data.facebook,
        youtube: data.youtube,
        website: data.website,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    await refreshProfile();  // Refetch to update UI
    return { error: null };
  };

  return { updateProfile, ... };
}
```

**RLS Policy**:
```sql
-- Users can update own profile
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());
```

---

## Auth Callback Route

### Purpose

**Callback URL** für Email Confirmation Links und Magic Links.

**Route**: `/auth/callback`

**Flow**:
1. User klickt Email-Link (Confirmation oder Magic Link)
2. Supabase redirects zu `/auth/callback?token_hash=...&type=...`
3. Route Handler verarbeitet Token
4. Session wird erstellt
5. Redirect zu ursprünglicher URL (oder `/inventory`)

**Implementation** (`app/auth/callback/route.ts`):
```typescript
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/inventory';

  if (tokenHash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type: type as 'email' | 'magiclink' | 'signup',
      token_hash: tokenHash,
    });

    if (!error) {
      // Success - redirect to next URL
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    // Error - redirect to login with error message
    return NextResponse.redirect(
      new URL(`/login?error=verification_failed`, requestUrl.origin)
    );
  }

  // No token - redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
```

---

## Error Handling

### User-Friendly Error Messages

**Problem**: Supabase error messages sind zu technisch.

**Solution**: Custom error mapping.

```typescript
// Sign In Errors
if (error.message.includes('Email not confirmed')) {
  throw new Error('Please check your email and click the confirmation link.');
}
if (error.message.includes('Invalid login credentials')) {
  throw new Error('Invalid email or password. Please try again.');
}

// Sign Up Errors
if (error.message.includes('User already registered')) {
  throw new Error('Account already exists. Please sign in instead.');
}
if (error.message.includes('Password should be')) {
  throw new Error('Password must be at least 6 characters long.');
}
if (error.message.includes('Invalid email')) {
  throw new Error('Please enter a valid email address.');
}
```

### Duplicate Account Detection

**Problem**: Supabase returniert fake success bei existing users (security feature).

**Solution**: Check `identities` array.

```typescript
if (result.user && !result.session) {
  const isNewUser = result.user.identities && result.user.identities.length > 0;

  if (isNewUser) {
    // New user created, needs email confirmation
    throw new Error('CONFIRMATION_REQUIRED');
  } else {
    // User already exists (Supabase fake success)
    throw new Error('Account already exists. Please sign in.');
  }
}
```

---

## Security Best Practices

### Environment Variables

**Required**:
```bash
# Public (exposed to client)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Secret (server-only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # For admin ops
```

**Validation** (fails early):
```typescript
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}
```

### HTTPS Only

**Supabase** enforces HTTPS für alle API calls.

**Development**: `localhost` erlaubt HTTP (automatisch).

**Production**: Vercel enforces HTTPS (automatisch).

### Password Requirements

**Supabase Default**:
- Minimum 6 characters
- No complexity requirements (für bessere UX)

**Custom Requirements** (optional, via Supabase Dashboard):
- Min length (6-72)
- Uppercase required
- Lowercase required
- Number required
- Special character required

**Current Gearshack Config**: 6 characters minimum (no complexity).

### Email Confirmation

**Enabled by default** für zusätzliche Sicherheit.

**Flow**:
1. User signs up
2. Email sent mit Confirmation Link
3. User klickt Link
4. Email verified → Can log in

**Disable** (via Supabase Dashboard → Authentication → Settings → Enable email confirmations).

---

## Integration Points

### AI Assistant

**User Context** für AI Assistant:

```typescript
const { mergedUser } = useAuthContext().profile;

// AI can access:
// - mergedUser.displayName
// - mergedUser.trailName
// - mergedUser.locationName
// - mergedUser.isVIP
// - mergedUser.isAdmin
```

**Example**:
```
User: "What's in my inventory?"
AI: "Hi John (Wanderer from Portland)! You have 47 items in your inventory..."
```

### Social Features

**Friend Requests** require Auth:

```typescript
const { user } = useAuthContext();

// Can only send friend request if authenticated
await sendFriendRequest(user.uid, targetUserId);
```

**RLS Policy**:
```sql
CREATE POLICY "Users send own friend requests" ON friend_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());
```

### Messaging

**Conversations** require Auth:

```typescript
// Can only see conversations where user is participant
CREATE POLICY "Users view own conversations" ON conversations
  FOR SELECT USING (
    participant1_id = auth.uid() OR
    participant2_id = auth.uid()
  );
```

---

## Testing

### Manual Testing Checklist

**Registration**:
- [ ] Valid email/password creates account
- [ ] Duplicate email shows error
- [ ] Weak password shows error
- [ ] Email confirmation sent (if enabled)
- [ ] Profile row auto-created

**Login**:
- [ ] Valid credentials work
- [ ] Invalid credentials show error
- [ ] Unconfirmed email shows error (if enabled)
- [ ] Return URL preserved after login

**Magic Link**:
- [ ] Email sent successfully
- [ ] Link opens callback route
- [ ] Session created
- [ ] Redirect to correct page

**Session**:
- [ ] Session persists across page refreshes
- [ ] Session auto-refreshes (wait 1 hour)
- [ ] Multiple tabs sync auth state

**Logout**:
- [ ] Logout clears session
- [ ] Redirect to login
- [ ] Protected routes inaccessible
- [ ] Data cleared from store

### Unit Tests

**useSupabaseAuth Hook**:
```typescript
describe('useSupabaseAuth', () => {
  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useSupabaseAuth());
    expect(result.current.isLoading).toBe(true);
  });

  it('should sign up successfully', async () => {
    const { result } = renderHook(() => useSupabaseAuth());
    const response = await result.current.signUp({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(response.error).toBeNull();
  });
});
```

---

## Troubleshooting

### "Email not confirmed" Error

**Cause**: User trying to log in before confirming email.

**Fix**:
1. Check email (including spam folder)
2. Click confirmation link
3. Retry login

**Admin Fix** (via Supabase Dashboard):
→ Authentication → Users → Select user → Confirm email

### Session Lost After Refresh

**Cause**: Cookie issues (sameSite, secure flags).

**Fix**:
1. Check browser DevTools → Application → Cookies
2. Ensure `sb-*-auth-token` cookie exists
3. Check cookie flags (`HttpOnly`, `Secure`, `SameSite`)

**If missing** → Check Vercel environment variables.

### RLS Policy Blocking Query

**Symptom**: Query returns empty even though data exists.

**Cause**: RLS policy too restrictive.

**Debug**:
```sql
-- Check which policies apply
SELECT * FROM pg_policies WHERE tablename = 'gear_items';

-- Test query as specific user (via Supabase SQL Editor)
SET request.jwt.claims TO '{"sub": "user-uuid-here"}';
SELECT * FROM gear_items WHERE user_id = auth.uid();
```

**Fix**: Adjust policy or add missing condition.

---

## Future Improvements

- [ ] **Google OAuth** (currently disabled)
- [ ] **GitHub OAuth** (popular with developers)
- [ ] **Apple Sign In** (required for iOS app)
- [ ] **Two-Factor Authentication (2FA)** via Supabase Auth
- [ ] **Email Change Flow** (requires re-verification)
- [ ] **Password Strength Indicator** (zxcvbn)
- [ ] **Passwordless Login** (default, no password option)
- [ ] **Anonymous Sessions** (try-before-signup)
- [ ] **Account Deletion** (GDPR compliance)
- [ ] **Session Device Management** (see all active sessions)

---

## Related Docs

- [Database Schema](../architecture/database-schema.md) - RLS Policies
- [Tech Stack](../architecture/tech-stack.md) - Supabase Auth
- [Deployment](../guides/deployment.md) - Environment Variables
- [ADR-001: Supabase Migration](../decisions/adr-001-supabase-migration.md)

---

**Last Updated**: 2026-02-06
**Status**: Production-Ready
**Auth Method**: Email/Password + Magic Link
**Active Users**: ~800 registered users
