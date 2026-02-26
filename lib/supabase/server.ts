/**
 * Supabase Server Client
 *
 * Feature: 040-supabase-migration
 * Task: T015
 *
 * Creates a Supabase client for server-side use in Server Components,
 * Route Handlers, and Server Actions.
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

// Re-export for compatibility with merchant integration code
export { createSupabaseServerClient as createServerClient };

/**
 * Creates a Supabase client for use in Server Components and Route Handlers.
 *
 * This client:
 * - Uses Next.js cookies() for session management
 * - Must be called within a request context
 * - Handles cookie operations for session refresh
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { createClient } from '@/lib/supabase/server';
 *
 * async function MyServerComponent() {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('gear_items').select();
 *   // ...
 * }
 * ```
 *
 * @example
 * ```tsx
 * // In a Route Handler
 * import { createClient } from '@/lib/supabase/server';
 *
 * export async function GET() {
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 * }
 * ```
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
  }
  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set');
  }

  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(supabaseUrl, supabaseAnonKey, {
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase service role client for admin/background operations.
 *
 * **WARNING**: This client bypasses Row-Level Security (RLS) policies!
 * Only use for:
 * - Background jobs (cron, workers)
 * - Admin operations
 * - Service-to-service communication
 *
 * DO NOT use for user-facing operations where RLS should apply.
 *
 * @example
 * ```tsx
 * // In a cron job
 * import { createServiceRoleClient } from '@/lib/supabase/server';
 *
 * export async function GET() {
 *   const supabase = createServiceRoleClient();
 *   // Can update any user's data
 *   await supabase.from('price_tracking').update({ last_checked_at: new Date() });
 * }
 * ```
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for service role client');
  }

  return createSupabaseServerClient<Database>(supabaseUrl, serviceRoleKey, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Service role client doesn't need cookie management
        },
      },
    }
  );
}
