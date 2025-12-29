/**
 * Share Password Verification API
 *
 * Feature: Share Management
 *
 * POST: Verify password for a protected share
 * Returns a session token on success that can be stored client-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

// Session cookie name prefix
const SHARE_ACCESS_COOKIE_PREFIX = 'share_access_';

// =============================================================================
// POST: Verify password for a share
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { password } = body as { password?: string };

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch the share with password hash
    const { data: share, error: fetchError } = await (supabase as any)
      .from('loadout_shares')
      .select('password_hash, expires_at')
      .eq('share_token', token)
      .single();

    if (fetchError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
    }

    // Check if share has a password
    if (!share.password_hash) {
      return NextResponse.json({ error: 'Share is not password protected' }, { status: 400 });
    }

    // Verify the password
    const isValid = await bcrypt.compare(password, share.password_hash);

    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // Set a session cookie to remember access
    const cookieStore = await cookies();
    const cookieName = `${SHARE_ACCESS_COOKIE_PREFIX}${token}`;

    // Cookie expires in 24 hours or when share expires (whichever is sooner)
    const maxAge = share.expires_at
      ? Math.min(
          24 * 60 * 60,
          Math.floor((new Date(share.expires_at).getTime() - Date.now()) / 1000)
        )
      : 24 * 60 * 60;

    cookieStore.set(cookieName, 'verified', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Math.max(0, maxAge),
      path: '/',
    });

    return NextResponse.json({ success: true, verified: true });
  } catch (error) {
    console.error('[shares/verify-password] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// GET: Check if user has access to a password-protected share
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Fetch the share
    const { data: share, error: fetchError } = await (supabase as any)
      .from('loadout_shares')
      .select('password_hash, expires_at')
      .eq('share_token', token)
      .single();

    if (fetchError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({
        requiresPassword: false,
        expired: true,
        hasAccess: false,
      });
    }

    // If no password, always has access
    if (!share.password_hash) {
      return NextResponse.json({
        requiresPassword: false,
        expired: false,
        hasAccess: true,
      });
    }

    // Check for session cookie
    const cookieStore = await cookies();
    const cookieName = `${SHARE_ACCESS_COOKIE_PREFIX}${token}`;
    const accessCookie = cookieStore.get(cookieName);

    return NextResponse.json({
      requiresPassword: true,
      expired: false,
      hasAccess: accessCookie?.value === 'verified',
    });
  } catch (error) {
    console.error('[shares/verify-password] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
