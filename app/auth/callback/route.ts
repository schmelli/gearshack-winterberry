/**
 * Auth Callback Route Handler
 *
 * Feature: 040-supabase-migration
 * Task: T022
 *
 * Handles magic link callback by exchanging the auth code for a session.
 * This route is called when users click the magic link in their email.
 *
 * Community Section Restructure:
 * Fetches user's start page preference after successful auth.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Get the user's preferred start page from their profile
 */
async function getStartPageRedirect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  locale: string
): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return `/${locale}/inventory`;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('start_page')
      .eq('id', user.id)
      .single();

    if (error || !profile?.start_page) {
      // Default to inventory if preference not found
      return `/${locale}/inventory`;
    }

    // Map start page to URL
    const startPageUrls: Record<string, string> = {
      inventory: `/${locale}/inventory`,
      loadouts: `/${locale}/loadouts`,
      community: `/${locale}/community`,
    };

    return startPageUrls[profile.start_page] || `/${locale}/inventory`;
  } catch (err) {
    console.error('Error fetching start page preference:', err);
    return `/${locale}/inventory`;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const locale = 'en'; // Default locale

  // Handle error from Supabase (e.g., expired link)
  if (errorParam) {
    console.error('Auth callback error:', errorParam, errorDescription);
    // Redirect to login with error message
    const errorMessage = errorDescription || 'auth_error';
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=${encodeURIComponent(errorMessage)}`
    );
  }

  // Exchange code for session
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful auth - redirect to intended destination or user's start page
      let redirectUrl: string;

      if (next) {
        // Open redirect protection: validate that redirect stays on same origin
        try {
          const redirectTarget = new URL(next, origin);
          // Only allow redirects to same origin
          if (redirectTarget.origin !== origin) {
            console.warn('[Auth] Blocked open redirect attempt to:', next);
            redirectUrl = await getStartPageRedirect(supabase, locale);
          } else {
            // Use the pathname only to ensure we stay on same origin
            redirectUrl = redirectTarget.pathname + redirectTarget.search;
          }
        } catch {
          // Invalid URL - validate it's a safe relative path
          // Block protocol-relative URLs (//evil.com) and paths with colons (javascript:)
          if (next.startsWith('/') && !next.startsWith('//') && !next.includes(':')) {
            redirectUrl = next;
          } else {
            console.warn('[Auth] Blocked potentially unsafe redirect:', next);
            redirectUrl = await getStartPageRedirect(supabase, locale);
          }
        }
      } else {
        // Otherwise, get the user's start page preference
        redirectUrl = await getStartPageRedirect(supabase, locale);
      }

      return NextResponse.redirect(`${origin}${redirectUrl}`);
    }

    // Log error for debugging
    console.error('Error exchanging code for session:', error);

    // T028: Handle expired magic link error
    if (error.message.includes('expired')) {
      return NextResponse.redirect(
        `${origin}/${locale}/login?error=link_expired`
      );
    }
  }

  // No code provided or error occurred - redirect to login with error
  return NextResponse.redirect(`${origin}/${locale}/login?error=auth_failed`);
}
