/**
 * Admin VIP Invite API Route
 *
 * Feature: 052-vip-loadouts
 * Task: T078
 *
 * POST /api/admin/vip/[id]/invite - Send claim invitation to VIP
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

// =============================================================================
// Validation Schema
// =============================================================================

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// =============================================================================
// POST - Send claim invitation
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vipId } = await params;
    const supabase = await createClient();

    // Verify admin authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = inviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Verify VIP exists and is not already claimed
    const { data: vip, error: vipError } = await supabase
      .from('vip_accounts')
      .select('id, name, slug, status, claimed_by_user_id')
      .eq('id', vipId)
      .single();

    if (vipError || !vip) {
      return NextResponse.json(
        { error: 'VIP account not found' },
        { status: 404 }
      );
    }

    if (vip.status === 'claimed' || vip.claimed_by_user_id) {
      return NextResponse.json(
        { error: 'VIP account is already claimed' },
        { status: 400 }
      );
    }

    // Check for existing pending invitation with same email
    const { data: existingInvitation } = await supabase
      .from('claim_invitations')
      .select('id, status')
      .eq('vip_id', vipId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation is already pending for this email' },
        { status: 400 }
      );
    }

    // Generate secure token (64 characters)
    const token = randomBytes(32).toString('hex');

    // Calculate expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create invitation
    const { data: invitation, error: insertError } = await supabase
      .from('claim_invitations')
      .insert({
        vip_id: vipId,
        email,
        token,
        status: 'pending',
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating claim invitation:', insertError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // TODO: Send email notification to VIP
    // This would integrate with an email service (SendGrid, Resend, etc.)
    // For now, we just create the invitation record
    console.log(`[VIP Claim] Invitation created for ${email} - Token: ${token}`);

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        vipId: invitation.vip_id,
        email: invitation.email,
        status: invitation.status,
        createdAt: invitation.created_at,
        expiresAt: invitation.expires_at,
        vipName: vip.name,
        vipSlug: vip.slug,
      },
      claimUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/vip/claim/${token}`,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/vip/[id]/invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
