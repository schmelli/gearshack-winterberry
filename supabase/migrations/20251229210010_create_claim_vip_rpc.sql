/**
 * VIP Claim RPC Function
 *
 * Feature: 052-vip-loadouts
 *
 * Atomic function to claim a VIP account, ensuring both the VIP account
 * and claim invitation are updated together or not at all.
 */

-- =============================================================================
-- Function: claim_vip_account
-- =============================================================================

CREATE OR REPLACE FUNCTION claim_vip_account(
  p_invitation_id UUID,
  p_vip_id UUID,
  p_user_id UUID,
  p_user_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_vip RECORD;
  v_result JSONB;
BEGIN
  -- Get invitation with row lock
  SELECT * INTO v_invitation
  FROM claim_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  -- Check invitation exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVITATION_NOT_FOUND',
      'message', 'Claim invitation not found'
    );
  END IF;

  -- Verify email matches (security requirement)
  IF v_invitation.email != p_user_email THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMAIL_MISMATCH',
      'message', 'Email does not match invitation'
    );
  END IF;

  -- Check invitation status
  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVITATION_NOT_PENDING',
      'message', 'Invitation is not in pending status'
    );
  END IF;

  -- Check expiration
  IF v_invitation.expires_at < NOW() THEN
    -- Update to expired
    UPDATE claim_invitations
    SET status = 'expired'
    WHERE id = p_invitation_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVITATION_EXPIRED',
      'message', 'Claim invitation has expired'
    );
  END IF;

  -- Get VIP account with row lock
  SELECT * INTO v_vip
  FROM vip_accounts
  WHERE id = p_vip_id
  FOR UPDATE;

  -- Check VIP exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VIP_NOT_FOUND',
      'message', 'VIP account not found'
    );
  END IF;

  -- Check VIP not already claimed
  IF v_vip.claimed_by_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VIP_ALREADY_CLAIMED',
      'message', 'VIP account has already been claimed'
    );
  END IF;

  -- Atomic updates: Both succeed or both fail

  -- Update VIP account
  UPDATE vip_accounts
  SET
    status = 'claimed',
    claimed_by_user_id = p_user_id,
    updated_at = NOW()
  WHERE id = p_vip_id;

  -- Update invitation
  UPDATE claim_invitations
  SET
    status = 'claimed',
    claimed_at = NOW()
  WHERE id = p_invitation_id;

  -- Build success response
  v_result := jsonb_build_object(
    'success', true,
    'vip', jsonb_build_object(
      'id', v_vip.id,
      'name', v_vip.name,
      'slug', v_vip.slug,
      'status', 'claimed'
    )
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CLAIM_FAILED',
      'message', 'Failed to claim VIP account',
      'details', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION claim_vip_account TO authenticated;

-- Add comment
COMMENT ON FUNCTION claim_vip_account IS 'Atomically claims a VIP account with email verification and proper locking';
