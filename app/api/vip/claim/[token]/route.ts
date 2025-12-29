/**
 * VIP Claim Verification API Route
 *
 * Feature: 052-vip-loadouts
 * Task: T079
 *
 * GET /api/vip/claim/[token] - Get claim invitation details
 * POST /api/vip/claim/[token] - Complete the claim process
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// GET - Get claim invitation details
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Find invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from('claim_invitations')
      .select(`
        id,
        vip_id,
        email,
        status,
        expires_at,
        vip_accounts (
          id,
          name,
          slug,
          avatar_url,
          bio,
          status
        )
      `)
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired claim link' },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      // Update status to expired if not already
      if (invitation.status === 'pending') {
        await supabase
          .from('claim_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);
      }
      return NextResponse.json(
        { error: 'This claim link has expired' },
        { status: 410 }
      );
    }

    // Check if already claimed
    if (invitation.status === 'claimed') {
      return NextResponse.json(
        { error: 'This VIP account has already been claimed' },
        { status: 400 }
      );
    }

    const vipData = invitation.vip_accounts as Record<string, unknown>;

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expires_at,
      },
      vip: {
        id: vipData.id,
        name: vipData.name,
        slug: vipData.slug,
        avatarUrl: vipData.avatar_url,
        bio: vipData.bio,
        status: vipData.status,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/vip/claim/[token]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Complete the claim process
// =============================================================================

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to claim your VIP account' },
        { status: 401 }
      );
    }

    // Find invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from('claim_invitations')
      .select(`
        id,
        vip_id,
        email,
        status,
        expires_at
      `)
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired claim link' },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      if (invitation.status === 'pending') {
        await supabase
          .from('claim_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);
      }
      return NextResponse.json(
        { error: 'This claim link has expired' },
        { status: 410 }
      );
    }

    // Check if already claimed
    if (invitation.status === 'claimed') {
      return NextResponse.json(
        { error: 'This VIP account has already been claimed' },
        { status: 400 }
      );
    }

    // Verify email matches (optional - depends on requirements)
    // For now, we allow any authenticated user to claim
    // In a real implementation, you might want to verify the email matches

    // Get VIP account to ensure it's still claimable
    const { data: vip, error: vipError } = await supabase
      .from('vip_accounts')
      .select('id, name, slug, status, claimed_by_user_id')
      .eq('id', invitation.vip_id)
      .single();

    if (vipError || !vip) {
      return NextResponse.json(
        { error: 'VIP account not found' },
        { status: 404 }
      );
    }

    if (vip.claimed_by_user_id) {
      return NextResponse.json(
        { error: 'This VIP account has already been claimed by another user' },
        { status: 400 }
      );
    }

    // Update VIP account to claimed status
    const { error: updateVipError } = await supabase
      .from('vip_accounts')
      .update({
        status: 'claimed',
        claimed_by_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vip.id);

    if (updateVipError) {
      console.error('Error updating VIP account:', updateVipError);
      return NextResponse.json(
        { error: 'Failed to complete claim process' },
        { status: 500 }
      );
    }

    // Update invitation status
    const { error: updateInvitationError } = await supabase
      .from('claim_invitations')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateInvitationError) {
      console.error('Error updating invitation:', updateInvitationError);
      // Don't fail the whole operation, VIP is already claimed
    }

    // Create notification for VIP's followers (optional)
    // This could be done via a database trigger or here
    try {
      await supabase.rpc('notify_vip_claimed', {
        p_vip_id: vip.id,
        p_vip_name: vip.name,
      });
    } catch {
      // Notification failure shouldn't block the claim
      console.warn('Failed to notify followers about VIP claim');
    }

    return NextResponse.json({
      success: true,
      vip: {
        id: vip.id,
        name: vip.name,
        slug: vip.slug,
      },
      message: 'VIP account successfully claimed!',
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/vip/claim/[token]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
