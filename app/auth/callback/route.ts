/**
 * Auth Callback Route Handler
 *
 * Feature: 040-supabase-migration
 * Task: T022
 *
 * Handles magic link callback by exchanging the auth code for a session.
 * This route is called when users click the magic link in their email.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/en/inventory';
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle error from Supabase (e.g., expired link)
  if (errorParam) {
    console.error('Auth callback error:', errorParam, errorDescription);
    // Redirect to login with error message
    const errorMessage = errorDescription || 'auth_error';
    return NextResponse.redirect(
      `${origin}/en/login?error=${encodeURIComponent(errorMessage)}`
    );
  }

  // Exchange code for session
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful auth - redirect to intended destination
      // Ensure the next URL is properly formatted
      const redirectUrl = next.startsWith('/') ? next : `/${next}`;
      return NextResponse.redirect(`${origin}${redirectUrl}`);
    }

    // Log error for debugging
    console.error('Error exchanging code for session:', error);

    // T028: Handle expired magic link error
    if (error.message.includes('expired')) {
      return NextResponse.redirect(
        `${origin}/en/login?error=link_expired`
      );
    }
  }

  // No code provided or error occurred - redirect to login with error
  return NextResponse.redirect(`${origin}/en/login?error=auth_failed`);
}
