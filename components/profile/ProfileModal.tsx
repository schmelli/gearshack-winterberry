/**
 * ProfileModal Component
 *
 * Feature: 008-auth-and-profile
 * T029: Profile modal using shadcn Dialog
 * T034: View/edit mode toggle
 * Design: Soft shadow, gradient header, no border
 * Stats tiles, favorites carousel, edit icon
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { useGearItems } from '@/hooks/useGearItems';
import { useLoadouts } from '@/hooks/useLoadouts';
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
  const { user, profile } = useAuthContext();
  const { mergedUser, updateProfile, refreshProfile } = profile;
  const [mode, setMode] = useState<ProfileMode>('view');

  // Get gear items and loadouts for stats
  const { items: gearItems } = useGearItems(user?.uid ?? null);
  const { loadouts } = useLoadouts(user?.uid ?? null);

  // Compute stats
  const stats = useMemo(() => ({
    itemCount: gearItems.length,
    loadoutCount: loadouts.length,
    shakedownCount: 0, // Placeholder - shakedowns feature not yet implemented
  }), [gearItems.length, loadouts.length]);

  // Get favorite items - filter by isFavourite flag
  const favorites = useMemo(() => {
    return gearItems
      .filter(item => item.isFavourite)
      .slice(0, 10) // Limit to 10 favourites in carousel
      .map(item => ({
        id: item.id,
        name: item.name,
        imageUrl: item.primaryImageUrl,
      }));
  }, [gearItems]);

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
      <DialogContent
        className="max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-w-md border-0 shadow-2xl p-0"
      >
        {mode === 'view' ? (
          <ProfileView
            user={mergedUser}
            onEditClick={() => setMode('edit')}
            stats={stats}
            favorites={favorites}
          />
        ) : (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
            <ProfileEditForm
              user={mergedUser}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
