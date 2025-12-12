/**
 * Combined Middleware: i18n + Supabase Session
 *
 * Features: 027-i18n-next-intl, 040-supabase-migration
 * Tasks: T016 (Supabase session refresh)
 *
 * Handles:
 * - Supabase session refresh on every request
 * - Browser language detection (Accept-Language header)
 * - Redirect root URL (/) to default locale (/en/)
 * - Redirect non-prefixed paths (/inventory) to locale-prefixed (/en/inventory)
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

// i18n middleware configuration
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'de'],
  defaultLocale: 'en',
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip i18n middleware for API routes and auth callback
  const isApiRoute = pathname.startsWith('/api') || pathname.startsWith('/auth');

  // First, run the intl middleware to get the response with locale handling
  // But skip it for API routes
  let response: NextResponse;

  if (isApiRoute) {
    response = NextResponse.next({ request });
  } else {
    response = intlMiddleware(request);
    // If intl middleware didn't produce a response, create one
    if (!response) {
      response = NextResponse.next({ request });
    }
  }

  // Create Supabase client for session refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update cookies on the request (for downstream code)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Update cookies on the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - this is the key Supabase middleware function
  // IMPORTANT: Do not remove this - it refreshes the auth token
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Match internationalized pathnames and exclude static files
  // Combined matcher for i18n and Supabase
  matcher: [
    '/',
    '/(de|en)/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
