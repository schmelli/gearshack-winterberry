/**
 * Share Password Management API
 *
 * Feature: Share Management
 *
 * POST: Set password for a share (requires bcrypt hashing)
 * DELETE: Remove password from a share
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

// =============================================================================
// POST: Set password for a share
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = params;
    const body = await request.json();
    const { password } = body as { password?: string };

    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify user is authenticated and owns this share
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const { data: share, error: fetchError } = await supabase
      .from('loadout_shares')
      .select('owner_id')
      .eq('share_token', token)
      .single();

    if (fetchError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    if (share.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update the share
    const { error: updateError } = await supabase
      .from('loadout_shares')
      .update({ password_hash: passwordHash })
      .eq('share_token', token);

    if (updateError) {
      console.error('[shares/password] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[shares/password] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// DELETE: Remove password from a share
// =============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Verify user is authenticated and owns this share
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const { data: share, error: fetchError } = await supabase
      .from('loadout_shares')
      .select('owner_id')
      .eq('share_token', token)
      .single();

    if (fetchError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    if (share.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Remove the password
    const { error: updateError } = await supabase
      .from('loadout_shares')
      .update({ password_hash: null })
      .eq('share_token', token);

    if (updateError) {
      console.error('[shares/password] Delete error:', updateError);
      return NextResponse.json({ error: 'Failed to remove password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[shares/password] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
