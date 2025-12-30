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
// Error Codes for i18n
// =============================================================================

const ERROR_CODES = {
  INVITATION_NOT_FOUND: 'Claim invitation not found',
  EMAIL_MISMATCH: 'Email does not match invitation',
  INVITATION_NOT_PENDING: 'Invitation is not in pending status',
  INVITATION_EXPIRED: 'Claim invitation has expired',
  VIP_NOT_FOUND: 'VIP account not found',
  VIP_ALREADY_CLAIMED: 'VIP account has already been claimed',
  CLAIM_FAILED: 'Failed to claim VIP account',
} as const;

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
    const { data: invitation, error: invitationError } = await (supabase as any)
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
        await (supabase as any)
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
        { error: 'AUTHENTICATION_REQUIRED', message: 'Please sign in to claim your VIP account' },
        { status: 401 }
      );
    }

    // Get user email for verification
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'EMAIL_REQUIRED', message: 'User email is required for verification' },
        { status: 400 }
      );
    }

    // Find invitation by token
    const { data: invitation, error: invitationError } = await (supabase as any)
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
        { error: 'INVALID_TOKEN', message: 'Invalid or expired claim link' },
        { status: 404 }
      );
    }

    // Use atomic RPC function to claim VIP with email verification
    // This ensures both VIP account and invitation are updated together
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error: rpcError } = await (supabase as any).rpc('claim_vip_account', {
      p_invitation_id: invitation.id,
      p_vip_id: invitation.vip_id,
      p_user_id: user.id,
      p_user_email: userEmail,
    });

    if (rpcError) {
      console.error('Error in claim_vip_account RPC:', rpcError);
      return NextResponse.json(
        { error: 'CLAIM_FAILED', message: 'Failed to complete claim process' },
        { status: 500 }
      );
    }

    // Check result from RPC function
    const claimResult = result as { success: boolean; error?: string; message?: string; vip?: { id: string; name: string; slug: string } };

    if (!claimResult.success) {
      const errorCode = claimResult.error || 'CLAIM_FAILED';
      const errorMessage = ERROR_CODES[errorCode as keyof typeof ERROR_CODES] || claimResult.message || 'Claim failed';

      // Return appropriate status code based on error type
      let statusCode = 400;
      if (errorCode === 'INVITATION_NOT_FOUND' || errorCode === 'VIP_NOT_FOUND') {
        statusCode = 404;
      } else if (errorCode === 'INVITATION_EXPIRED') {
        statusCode = 410;
      } else if (errorCode === 'EMAIL_MISMATCH') {
        statusCode = 403;
      }

      return NextResponse.json(
        { error: errorCode, message: errorMessage },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      vip: claimResult.vip,
      message: 'VIP account successfully claimed!',
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/vip/claim/[token]:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
