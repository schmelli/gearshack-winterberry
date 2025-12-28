# Supabase Type Regeneration Guide

## Overview

After running database migrations (especially for new tables like the social graph system), you should regenerate TypeScript types from your Supabase schema to ensure type safety.

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Access to your Supabase project credentials
- The project ID for your Supabase instance

## Steps to Regenerate Types

### 1. Link Your Local Project to Supabase

```bash
supabase link --project-ref <your-project-id>
```

You'll be prompted for your database password.

### 2. Generate TypeScript Types

```bash
npx supabase gen types typescript --linked > types/supabase.ts
```

This command:
- Connects to your linked Supabase project
- Introspects the database schema
- Generates TypeScript types for all tables, views, and functions
- Outputs to `types/supabase.ts`

### 3. Alternative: Generate from Project ID Directly

If you don't want to link the project, you can generate types directly:

```bash
npx supabase gen types typescript --project-id <your-project-id> > types/supabase.ts
```

### 4. Update Client Imports

After regenerating types, update the Supabase client to use the new types:

```typescript
// Before (temporary workaround)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSocialClient(): any {
  return createClient();
}

// After (proper typing)
import { Database } from '@/types/supabase';

function getSocialClient() {
  return createClient<Database>();
}
```

## When to Regenerate Types

Regenerate types whenever you:
- Add new tables or columns
- Modify existing table schemas
- Add or update database functions (RPC)
- Add or update database views
- Make any structural changes to the database

## Feature-Specific Type Regeneration

### Social Graph (Feature 001)

After running the social graph migrations (`20251228100001_*.sql` through `20251228100010_*.sql`), regenerate types to get proper typing for:

- `friend_requests` table
- `friendships` table
- `user_follows` table
- `friend_activities` table
- RPC functions:
  - `has_message_exchange()`
  - `send_friend_request()`
  - `respond_to_friend_request()`
  - `can_send_friend_request()`
  - `get_mutual_friends()`
  - `get_friend_activity_feed()`
  - `check_rate_limit_only()`
  - `cleanup_old_friend_requests()`

### Remove Temporary Type Workarounds

Search for and remove these temporary workarounds after regenerating:

```bash
# Find all instances of the temporary workaround
grep -r "getSocialClient" lib/
```

Update them to use proper types from `types/supabase.ts`.

## Troubleshooting

### Error: "Could not connect to Supabase"

- Check your internet connection
- Verify your project ID is correct
- Ensure you have the correct database password

### Error: "Permission denied"

- Make sure you have admin access to the Supabase project
- Check that your Supabase CLI is logged in: `supabase login`

### Types are outdated

If types don't reflect recent migrations:
1. Ensure migrations have been applied to the database
2. Check you're connected to the correct environment (dev/staging/prod)
3. Re-run the type generation command

## Best Practices

1. **Version Control**: Commit the generated `types/supabase.ts` file to git
2. **CI/CD**: Add type generation to your deployment pipeline
3. **Type Checking**: Run `npm run type-check` after regenerating types
4. **Documentation**: Update type documentation when adding new tables/functions

## Environment-Specific Types

If you have multiple environments (dev, staging, prod), generate types for each:

```bash
# Development
supabase gen types typescript --project-id <dev-project-id> > types/supabase.dev.ts

# Production
supabase gen types typescript --project-id <prod-project-id> > types/supabase.prod.ts
```

Then conditionally import based on environment.

## References

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Type Generation Docs](https://supabase.com/docs/guides/api/generating-types)
- [TypeScript Support](https://supabase.com/docs/guides/database/full-text-search#typescript-support)
