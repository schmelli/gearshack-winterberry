# Quickstart: Supabase Migration

**Feature**: 040-supabase-migration
**Date**: 2025-12-10

## Prerequisites

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Node.js**: 18+ installed
3. **Supabase CLI** (optional but recommended):
   ```bash
   npm install -g supabase
   ```

## Step 1: Environment Setup

Create/update `.env.local`:

```env
# Remove Firebase variables
# NEXT_PUBLIC_FIREBASE_API_KEY=...
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# etc.

# Add Supabase variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these values from Supabase Dashboard > Settings > API.

## Step 2: Install Dependencies

```bash
# Remove Firebase
npm uninstall firebase firebase-admin

# Install Supabase
npm install @supabase/supabase-js @supabase/ssr
```

## Step 3: Database Setup

### Option A: Supabase Dashboard (Quick)

1. Go to Supabase Dashboard > SQL Editor
2. Run the SQL from `specs/040-supabase-migration/data-model.md`
3. Run the RLS policies from `specs/040-supabase-migration/contracts/rls-policies.sql`

### Option B: Supabase CLI (Recommended for version control)

```bash
# Initialize Supabase locally
supabase init

# Create migration file
supabase migration new initial_schema

# Copy schema SQL to supabase/migrations/TIMESTAMP_initial_schema.sql

# Push to remote
supabase db push
```

## Step 4: Generate TypeScript Types

```bash
# Generate types from database schema
npx supabase gen types typescript --project-id your-project-ref > types/database.ts
```

## Step 5: Create Supabase Clients

### Browser Client (`lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client (`lib/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

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
            // Server Component - ignore
          }
        },
      },
    }
  );
}
```

## Step 6: Middleware for Session Refresh

Create `middleware.ts` at project root:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

## Step 7: Auth Callback Route

Create `app/auth/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/inventory';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login on error
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

## Step 8: Seed Categories

Run this SQL to seed the gear categories:

```sql
-- Level 1: Main categories
INSERT INTO categories (id, parent_id, level, label) VALUES
  ('cat-shelter', NULL, 1, 'Shelter'),
  ('cat-sleep', NULL, 1, 'Sleep System'),
  ('cat-pack', NULL, 1, 'Packs & Bags'),
  ('cat-clothing', NULL, 1, 'Clothing'),
  ('cat-cooking', NULL, 1, 'Cooking'),
  ('cat-water', NULL, 1, 'Water'),
  ('cat-navigation', NULL, 1, 'Navigation'),
  ('cat-safety', NULL, 1, 'Safety & First Aid'),
  ('cat-electronics', NULL, 1, 'Electronics'),
  ('cat-accessories', NULL, 1, 'Accessories');

-- Add subcategories as needed (level 2)
-- Add product types as needed (level 3)
```

## Step 9: Configure Auth Settings

In Supabase Dashboard > Authentication > URL Configuration:

1. **Site URL**: `http://localhost:3000` (dev) or production URL
2. **Redirect URLs**: Add `http://localhost:3000/auth/callback`

In Authentication > Email Templates:

1. Customize magic link email template
2. Set "Confirm email" redirect to `{{ .SiteURL }}/auth/callback`

## Verification Checklist

- [ ] Environment variables set correctly
- [ ] Database tables created with RLS enabled
- [ ] Types generated from schema
- [ ] Browser and server clients created
- [ ] Middleware configured
- [ ] Auth callback route working
- [ ] Categories seeded
- [ ] Can sign up with email/password
- [ ] Can request magic link
- [ ] Session persists across refresh
- [ ] Can CRUD gear items
- [ ] Can CRUD loadouts
- [ ] RLS blocks cross-user access

## Common Issues

### "Invalid API key"
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- Ensure you're using the `anon` key, not the `service_role` key

### Session not persisting
- Verify middleware.ts is at project root
- Check middleware matcher includes your routes
- Ensure cookies are being set correctly

### RLS blocking all requests
- Verify user is authenticated before making requests
- Check RLS policies are created correctly
- Use Supabase Dashboard > SQL Editor to test queries

### TypeScript errors
- Regenerate types: `npx supabase gen types typescript`
- Ensure Database type is imported in client files
