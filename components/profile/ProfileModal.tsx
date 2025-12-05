/**
 * ProfileModal Component
 *
 * Feature: 008-auth-and-profile
 * T029: Profile modal using shadcn Dialog
 * T034: View/edit mode toggle
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { ProfileView } from '@/components/profile/ProfileView';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import type { ProfileFormData } from '@/lib/validations/profile-schema';

// =============================================================================
// Types
// =============================================================================

type ProfileMode = 'view' | 'edit';

interface ProfileModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { profile } = useAuthContext();
  const { mergedUser, updateProfile, refreshProfile } = profile;
  const [mode, setMode] = useState<ProfileMode>('view');

  // Handle save (T036: preserves isVIP and first_launch in firestore utility)
  const handleSave = useCallback(async (data: ProfileFormData) => {
    await updateProfile(data);
    await refreshProfile();
    setMode('view');
  }, [updateProfile, refreshProfile]);

  // Handle cancel (T037)
  const handleCancel = useCallback(() => {
    setMode('view');
  }, []);

  // Handle close - reset to view mode
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setMode('view');
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  // Don't render if no user data
  if (!mergedUser) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'view' ? 'Profile' : 'Edit Profile'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'view' ? (
          <ProfileView
            user={mergedUser}
            onEditClick={() => setMode('edit')}
          />
        ) : (
          <ProfileEditForm
            user={mergedUser}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
