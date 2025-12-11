# Research: Migration from Firebase to Supabase

**Feature**: 040-supabase-migration
**Date**: 2025-12-10

## Research Topics

### 1. @supabase/ssr for Next.js App Router

**Decision**: Use `@supabase/ssr` package with cookie-based session management

**Rationale**:
- Official Supabase package specifically designed for server-side rendering frameworks
- Provides `createBrowserClient` for client components and `createServerClient` for server components/actions
- Cookie-based sessions work correctly with Next.js middleware for session refresh
- Handles the complexity of sharing auth state between server and client

**Alternatives Considered**:
- `@supabase/supabase-js` alone: Would require custom session handling, no SSR support
- `@supabase/auth-helpers-nextjs`: Deprecated in favor of @supabase/ssr

**Implementation Pattern**:
```typescript
// lib/supabase/client.ts - Browser client
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts - Server client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

---

### 2. Row Level Security (RLS) Patterns

**Decision**: Enable RLS on all tables with user_id-based policies

**Rationale**:
- RLS provides database-level security that cannot be bypassed by client code
- Allows direct client access with anon key while maintaining data isolation
- Standard pattern for multi-tenant Supabase applications
- Supabase Auth integration via `auth.uid()` function

**Alternatives Considered**:
- Server-side proxy: Adds latency, complexity, and maintenance burden
- Application-level filtering: Insecure, can be bypassed

**Policy Pattern**:
```sql
-- Enable RLS
ALTER TABLE gear_items ENABLE ROW LEVEL SECURITY;

-- Select policy
CREATE POLICY "Users can view own items"
ON gear_items FOR SELECT
USING (auth.uid() = user_id);

-- Insert policy
CREATE POLICY "Users can insert own items"
ON gear_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update policy
CREATE POLICY "Users can update own items"
ON gear_items FOR UPDATE
USING (auth.uid() = user_id);

-- Delete policy
CREATE POLICY "Users can delete own items"
ON gear_items FOR DELETE
USING (auth.uid() = user_id);
```

---

### 3. Magic Link Authentication

**Decision**: Use Supabase Auth `signInWithOtp` for passwordless authentication

**Rationale**:
- Built-in support in Supabase Auth
- Configurable email templates in Supabase dashboard
- Automatic token handling and session creation
- Callback URL handling with Next.js route

**Implementation Pattern**:
```typescript
// Sign in with magic link
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: `${origin}/auth/callback`,
  },
})

// Callback route handler (app/auth/callback/route.ts)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/inventory', request.url))
}
```

---

### 4. Gear Item Status Extended Lifecycle

**Decision**: Implement status as PostgreSQL enum with 5 values

**Rationale**:
- Database-level type safety with PostgreSQL enums
- Clarification confirmed: Own/Wishlist/Sold/Lent/Retired
- Enables filtering and analytics by status
- Clean migration from existing 3-state model (active/wishlist/sold)

**Status Mapping**:
| Old Status | New Status | Notes |
|------------|------------|-------|
| active | own | Renamed for clarity |
| wishlist | wishlist | Unchanged |
| sold | sold | Unchanged |
| N/A | lent | New status |
| N/A | retired | New status |

**PostgreSQL Implementation**:
```sql
CREATE TYPE gear_status AS ENUM ('own', 'wishlist', 'sold', 'lent', 'retired');
```

---

### 5. Profile Creation Trigger

**Decision**: Use PostgreSQL trigger to auto-create profile on user signup

**Rationale**:
- Ensures profile always exists for authenticated users
- No need for application-level profile creation logic
- Standard Supabase pattern for user metadata

**Implementation Pattern**:
```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### 6. Loadout-Item Cascade Delete

**Decision**: Use foreign key with ON DELETE CASCADE for loadout items

**Rationale**:
- Edge case from spec: "deleting a gear item that exists in a loadout removes it from all loadouts automatically"
- Database-level referential integrity
- No application code needed for cleanup

**Implementation Pattern**:
```sql
CREATE TABLE loadout_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loadout_id UUID REFERENCES loadouts(id) ON DELETE CASCADE,
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  is_worn BOOLEAN DEFAULT FALSE,
  is_consumable BOOLEAN DEFAULT FALSE
);
```

---

### 7. Category Seeding Strategy

**Decision**: Seed categories from existing taxonomy data via SQL migration

**Rationale**:
- Categories are system-defined, shared across all users
- No RLS needed (public read access)
- Taxonomy structure (category > subcategory > product type) preserved
- JSON data can be loaded via Supabase seed file

**Implementation Approach**:
1. Export existing taxonomy from `data/taxonomy.json`
2. Create SQL seed file with INSERT statements
3. Run via Supabase migrations or dashboard

---

### 8. Firebase Code Removal Strategy

**Decision**: Complete removal of Firebase dependencies in single migration

**Rationale**:
- Clarification confirmed: No parallel operation or fallback
- Clean break reduces complexity
- Smaller bundle size without Firebase SDK

**Files to Remove/Modify**:
- `lib/firebase/` - Remove entire directory
- `hooks/useAuth.ts` - Replace with useSupabaseAuth
- `hooks/useGearInventory.ts` - Replace with useGearItems
- `package.json` - Remove firebase, firebase-admin dependencies
- `.env.local` - Remove FIREBASE_* variables, add SUPABASE_* variables

---

## Dependencies to Install

```bash
npm install @supabase/supabase-js @supabase/ssr
npm uninstall firebase firebase-admin
```

## Environment Variables

```env
# Remove
NEXT_PUBLIC_FIREBASE_*
FIREBASE_*

# Add
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Summary

All research topics resolved. No NEEDS CLARIFICATION items remain. Ready for Phase 1: Data Model and Contracts.
