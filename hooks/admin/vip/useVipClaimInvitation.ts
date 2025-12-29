/**
 * useVipClaimInvitation Hook
 *
 * Feature: 052-vip-loadouts
 * Task: T075
 *
 * Admin hook for managing claim invitations for VIP accounts.
 * Handles creating, fetching, and revoking claim invitations.
 */

'use client';

import { useState, useCallback } from 'react';
import type { ClaimInvitation, ClaimInvitationStatus } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface ClaimInvitationWithVip extends ClaimInvitation {
  vipName: string;
  vipSlug: string;
}

interface UseVipClaimInvitationState {
  status: 'idle' | 'loading' | 'creating' | 'revoking' | 'success' | 'error';
  invitations: ClaimInvitationWithVip[];
  currentInvitation: ClaimInvitationWithVip | null;
  error: string | null;
}

interface CreateInvitationParams {
  vipId: string;
  email: string;
}

interface UseVipClaimInvitationReturn extends UseVipClaimInvitationState {
  fetchInvitations: (vipId: string) => Promise<void>;
  createInvitation: (params: CreateInvitationParams) => Promise<ClaimInvitationWithVip | null>;
  revokeInvitation: (invitationId: string) => Promise<boolean>;
  resendInvitation: (invitationId: string) => Promise<boolean>;
  clearError: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useVipClaimInvitation(): UseVipClaimInvitationReturn {
  const [state, setState] = useState<UseVipClaimInvitationState>({
    status: 'idle',
    invitations: [],
    currentInvitation: null,
    error: null,
  });

  /**
   * Fetch all invitations for a VIP account
   */
  const fetchInvitations = useCallback(async (vipId: string) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await fetch(`/api/admin/vip/${vipId}/invitations`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch invitations');
      }

      const data = await response.json();

      setState({
        status: 'success',
        invitations: data.invitations || [],
        currentInvitation: null,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch invitations';
      console.error('Error fetching claim invitations:', err);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: message,
      }));
    }
  }, []);

  /**
   * Create a new claim invitation for a VIP
   */
  const createInvitation = useCallback(
    async (params: CreateInvitationParams): Promise<ClaimInvitationWithVip | null> => {
      setState((prev) => ({ ...prev, status: 'creating', error: null }));

      try {
        const response = await fetch(`/api/admin/vip/${params.vipId}/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: params.email }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // Return error code for client to map to i18n message
          throw new Error(errorData.error || 'INVITATION_CREATE_FAILED');
        }

        const data = await response.json();
        const newInvitation = data.invitation as ClaimInvitationWithVip;

        setState((prev) => ({
          ...prev,
          status: 'success',
          invitations: [newInvitation, ...prev.invitations],
          currentInvitation: newInvitation,
        }));

        return newInvitation;
      } catch (err) {
        const errorCode = err instanceof Error ? err.message : 'INVITATION_CREATE_FAILED';
        console.error('Error creating claim invitation:', err);
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: errorCode,
        }));
        return null;
      }
    },
    []
  );

  /**
   * Revoke a pending claim invitation
   */
  const revokeInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, status: 'revoking', error: null }));

    try {
      const response = await fetch(`/api/admin/vip/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to revoke invitation');
      }

      setState((prev) => ({
        ...prev,
        status: 'success',
        invitations: prev.invitations.filter((inv) => inv.id !== invitationId),
      }));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke invitation';
      console.error('Error revoking claim invitation:', err);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: message,
      }));
      return false;
    }
  }, []);

  /**
   * Resend a pending claim invitation
   */
  const resendInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await fetch(`/api/admin/vip/invitations/${invitationId}/resend`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to resend invitation');
      }

      setState((prev) => ({ ...prev, status: 'success' }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend invitation';
      console.error('Error resending claim invitation:', err);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: message,
      }));
      return false;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    fetchInvitations,
    createInvitation,
    revokeInvitation,
    resendInvitation,
    clearError,
  };
}

export default useVipClaimInvitation;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get display status for claim invitation
 */
export function getInvitationStatusDisplay(status: ClaimInvitationStatus): {
  label: string;
  variant: 'default' | 'secondary' | 'success' | 'destructive';
} {
  switch (status) {
    case 'pending':
      return { label: 'Pending', variant: 'secondary' };
    case 'verified':
      return { label: 'Verified', variant: 'default' };
    case 'claimed':
      return { label: 'Claimed', variant: 'success' };
    case 'expired':
      return { label: 'Expired', variant: 'destructive' };
    default:
      return { label: 'Unknown', variant: 'secondary' };
  }
}

/**
 * Check if invitation can be revoked
 */
export function canRevokeInvitation(status: ClaimInvitationStatus): boolean {
  return status === 'pending' || status === 'verified';
}

/**
 * Check if invitation can be resent
 */
export function canResendInvitation(status: ClaimInvitationStatus): boolean {
  return status === 'pending';
}
