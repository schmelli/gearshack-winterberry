/**
 * Next.js Middleware
 *
 * Feature 050: Security & Performance
 * Handles:
 * 1. i18n routing (next-intl)
 * 2. Supabase session refresh (@supabase/ssr)
 * 3. Security headers
 */

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

// Create i18n middleware
const i18nMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export async function middleware(request: NextRequest) {
  // Step 1: Run i18n middleware to handle locale routing
  const response = i18nMiddleware(request);

  // Step 2: Update Supabase session (must use updateSession pattern)
  const supabaseResponse = await updateSession(request, response);

  // Step 3: Add security headers
  addSecurityHeaders(supabaseResponse);

  return supabaseResponse;
}

/**
 * Updates Supabase session using the @supabase/ssr updateSession pattern
 * This refreshes the auth token and ensures the session stays valid
 */
async function updateSession(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase is not configured, just return the response
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // This will refresh the session if needed
    // IMPORTANT: Call getUser() to trigger session refresh
    await supabase.auth.getUser();

    return response;
  } catch (error) {
    // If session refresh fails, log but don't block the request
    console.error('[Middleware] Supabase session refresh failed:', error);
    return response;
  }
}

/**
 * Adds security headers to the response
 */
function addSecurityHeaders(response: NextResponse): void {
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer policy for privacy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy to disable unnecessary browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
  );

  // Content Security Policy (basic - can be enhanced later)
  // Allow self, Supabase, Cloudinary, Google (for maps/auth), Vercel analytics
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://res.cloudinary.com https://lh3.googleusercontent.com https://encrypted-tbn0.gstatic.com https://encrypted-tbn1.gstatic.com https://encrypted-tbn2.gstatic.com https://encrypted-tbn3.gstatic.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.cloudinary.com https://vercel.live wss://*.supabase.co",
      "frame-src 'self' https://upload-widget.cloudinary.com",
      "worker-src 'self' blob:",
    ].join('; ')
  );
}

export const config = {
  // Match all routes except static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
