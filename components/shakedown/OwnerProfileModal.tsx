/**
 * OwnerProfileModal Component
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T051 - Owner profile modal integration
 *
 * Displays the loadout owner's profile in a modal dialog.
 * Maps SharedLoadoutOwner to MergedUser for ProfileView.
 * Shows messaging option for authenticated users if owner's privacy allows.
 */

'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProfileView } from '@/components/profile/ProfileView';
import type { SharedLoadoutOwner } from '@/types/sharing';
import type { MergedUser } from '@/types/auth';

// =============================================================================
// Types
// =============================================================================

interface OwnerProfileModalProps {
  /** The loadout owner information (null if owner unavailable) */
  owner: SharedLoadoutOwner | null;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Whether the current viewer is authenticated */
  isAuthenticated: boolean;
  /** Callback when user wants to send a message to the owner */
  onSendMessage?: (ownerId: string, ownerName: string) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps SharedLoadoutOwner to MergedUser for ProfileView consumption
 */
function mapOwnerToMergedUser(owner: SharedLoadoutOwner): MergedUser {
  return {
    uid: owner.id,
    email: null, // Not exposed in shared context
    displayName: owner.displayName || owner.trailName || 'Anonymous',
    avatarUrl: owner.avatarUrl,
    providerAvatarUrl: null, // Not available for shared owner
    trailName: owner.trailName,
    bio: owner.bio,
    location: null, // Legacy field not used
    locationName: owner.locationName,
    latitude: null, // Not exposed in shared context
    longitude: null, // Not exposed in shared context
    instagram: owner.instagram,
    facebook: owner.facebook,
    youtube: owner.youtube,
    website: owner.website,
    isVIP: false, // VIP status not exposed in shared context
    isAdmin: false, // Admin status not exposed in shared context
  };
}

/**
 * Determines if the current user can message the owner based on privacy settings
 */
function canMessage(owner: SharedLoadoutOwner, isAuthenticated: boolean): boolean {
  if (!isAuthenticated) return false;
  return owner.messagingPrivacy === 'everyone';
}

// =============================================================================
// Component
// =============================================================================

export function OwnerProfileModal({
  owner,
  open,
  onOpenChange,
  isAuthenticated,
  onSendMessage,
}: OwnerProfileModalProps) {
  const t = useTranslations('SharedLoadout');

  const handleSendMessage = useCallback(() => {
    if (!owner || !onSendMessage) return;
    const ownerName = owner.displayName || owner.trailName || 'Anonymous';
    onSendMessage(owner.id, ownerName);
    onOpenChange(false);
  }, [owner, onSendMessage, onOpenChange]);

  const showMessageButton = owner && isAuthenticated && canMessage(owner, isAuthenticated) && onSendMessage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('ownerProfile')}</DialogTitle>
        </DialogHeader>

        {/* Owner unavailable state (T053) */}
        {!owner && (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="rounded-full bg-muted/50 p-4">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">{t('ownerUnavailable')}</p>
          </div>
        )}

        {/* Owner profile available */}
        {owner && (
          <div className="flex flex-col">
            {/* ProfileView integration (T051) */}
            <ProfileView user={mapOwnerToMergedUser(owner)} />

            {/* Messaging option for authenticated users (T052) */}
            {showMessageButton && (
              <div className="border-t p-4">
                <Button onClick={handleSendMessage} className="w-full">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t('sendMessage')}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
