/**
 * useMerchantProfile Hook
 *
 * Feature: 053-merchant-integration
 * Task: T014
 *
 * Provides merchant profile CRUD operations.
 * Handles merchant application, profile updates, and logo management.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import {
  fetchMerchantByUserId,
  createMerchantApplication,
  updateMerchant,
  updateMerchantLogo,
} from '@/lib/supabase/merchant-queries';
import type {
  Merchant,
  MerchantApplicationInput,
  MerchantUpdateInput,
} from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export type ProfileOperationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseMerchantProfileReturn {
  /** Current merchant profile */
  merchant: Merchant | null;
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Operation status for mutations */
  operationStatus: ProfileOperationStatus;
  /** Error message if operation failed */
  error: string | null;
  /** Submit merchant application */
  submitApplication: (input: MerchantApplicationInput) => Promise<boolean>;
  /** Update merchant profile */
  updateProfile: (input: MerchantUpdateInput) => Promise<boolean>;
  /** Upload and update logo */
  uploadLogo: (file: File) => Promise<boolean>;
  /** Refresh merchant data */
  refresh: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_LOGO_SIZE_MB = 2;
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// =============================================================================
// Hook Implementation
// =============================================================================

export function useMerchantProfile(): UseMerchantProfileReturn {
  const { user } = useSupabaseAuth();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [operationStatus, setOperationStatus] = useState<ProfileOperationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Fetch merchant profile on mount
  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setMerchant(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchMerchantByUserId(user.id);
      setMerchant(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Submit new merchant application
  const submitApplication = useCallback(
    async (input: MerchantApplicationInput): Promise<boolean> => {
      if (!user?.id) {
        setError('Must be logged in to apply');
        return false;
      }

      if (merchant) {
        setError('Merchant account already exists');
        return false;
      }

      setOperationStatus('loading');
      setError(null);

      try {
        const newMerchant = await createMerchantApplication(user.id, input);
        setMerchant(newMerchant);
        setOperationStatus('success');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Application failed';
        setError(message);
        setOperationStatus('error');
        return false;
      }
    },
    [user?.id, merchant]
  );

  // Update existing merchant profile
  const updateProfile = useCallback(
    async (input: MerchantUpdateInput): Promise<boolean> => {
      if (!merchant?.id) {
        setError('No merchant profile to update');
        return false;
      }

      setOperationStatus('loading');
      setError(null);

      try {
        const updatedMerchant = await updateMerchant(merchant.id, input);
        setMerchant(updatedMerchant);
        setOperationStatus('success');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Update failed';
        setError(message);
        setOperationStatus('error');
        return false;
      }
    },
    [merchant?.id]
  );

  // Upload logo to Cloudinary and update merchant
  const uploadLogo = useCallback(
    async (file: File): Promise<boolean> => {
      if (!merchant?.id) {
        setError('No merchant profile');
        return false;
      }

      // Validate file type
      if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
        setError('Logo must be JPEG, PNG, or WebP');
        return false;
      }

      // Validate file size
      if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
        setError(`Logo must be under ${MAX_LOGO_SIZE_MB}MB`);
        return false;
      }

      setOperationStatus('loading');
      setError(null);

      try {
        // Upload to Cloudinary via unsigned upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '');
        formData.append('folder', `merchants/${merchant.id}`);

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;

        const uploadResponse = await fetch(cloudinaryUrl, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload logo');
        }

        const uploadData = await uploadResponse.json();
        const logoUrl = uploadData.secure_url;

        // Update merchant with new logo URL
        await updateMerchantLogo(merchant.id, logoUrl);

        // Update local state
        setMerchant((prev) =>
          prev ? { ...prev, logoUrl } : prev
        );

        setOperationStatus('success');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Logo upload failed';
        setError(message);
        setOperationStatus('error');
        return false;
      }
    },
    [merchant?.id]
  );

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
    setOperationStatus('idle');
  }, []);

  return {
    merchant,
    isLoading,
    operationStatus,
    error,
    submitApplication,
    updateProfile,
    uploadLogo,
    refresh: fetchProfile,
    clearError,
  };
}

// =============================================================================
// Form Helpers
// =============================================================================

/**
 * Hook for merchant application form state
 */
export function useMerchantApplicationForm() {
  const {
    merchant,
    isLoading,
    operationStatus,
    error,
    submitApplication,
    clearError,
  } = useMerchantProfile();

  const [formData, setFormData] = useState<MerchantApplicationInput>({
    businessName: '',
    businessType: 'local',
    contactEmail: '',
    contactPhone: '',
    website: '',
    description: '',
    taxId: '',
  });

  const handleChange = useCallback(
    <K extends keyof MerchantApplicationInput>(
      field: K,
      value: MerchantApplicationInput[K]
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      clearError();
    },
    [clearError]
  );

  const handleSubmit = useCallback(async () => {
    return submitApplication(formData);
  }, [submitApplication, formData]);

  const canSubmit =
    operationStatus !== 'loading' &&
    formData.businessName.length >= 2 &&
    formData.contactEmail.includes('@') &&
    !merchant;

  return {
    formData,
    setFormData,
    handleChange,
    handleSubmit,
    canSubmit,
    isLoading,
    isSubmitting: operationStatus === 'loading',
    error,
    hasExistingAccount: merchant !== null,
  };
}
