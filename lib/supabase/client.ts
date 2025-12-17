/**
 * Supabase Browser Client
 *
 * Feature: 040-supabase-migration
 * Task: T014
 *
 * Creates a Supabase client for browser/client-side use.
 * Uses @supabase/ssr for proper cookie handling in Next.js.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

/**
 * Creates a Supabase client for use in Client Components.
 *
 * This client:
 * - Uses browser cookies for session management
 * - Is safe to use in Client Components
 * - Automatically refreshes sessions
 *
 * @example
 * ```tsx
 * 'use client';
 * import { createClient } from '@/lib/supabase/client';
 *
 * function MyComponent() {
 *   const supabase = createClient();
 *   // Use supabase...
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
