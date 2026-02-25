/**
 * OnboardingHandler Component
 *
 * Feature: User Onboarding
 *
 * Invisible handler component that detects first-time users and shows
 * the onboarding modal. Similar to PendingImportHandler pattern.
 *
 * Mounts in SupabaseAuthProvider after authentication.
 */

'use client';

import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingModal } from './OnboardingModal';
import type { Tables } from '@/types/supabase';

// =============================================================================
// Constants
// =============================================================================

/** localStorage key for tracking onboarding completion */
const ONBOARDING_COMPLETED_KEY = 'gearshack_onboarding_completed';

// =============================================================================
// Types
// =============================================================================

interface OnboardingHandlerProps {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** User ID */
  userId: string | null;
  /** User profile data (may include first_launch field if migration is complete) */
  profile: Tables<'profiles'> | null;
}

// =============================================================================
// Component
// =============================================================================

export function OnboardingHandler({
  isAuthenticated,
  userId,
  profile,
}: OnboardingHandlerProps) {
  // Determine if onboarding is complete
  // Check localStorage first (primary), then profile field (if database migration is complete)
  // Use type-safe property access instead of unsafe type assertion
  const hasCompletedOnboarding =
    (typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true') ||
    (profile != null && 'first_launch' in profile && profile.first_launch != null);

  const onboarding = useOnboarding({
    userId: isAuthenticated ? userId : null,
    hasCompletedOnboarding,
  });

  // Don't render if not authenticated or already completed
  if (!isAuthenticated || !userId) {
    return null;
  }

  return (
    <OnboardingModal
      isOpen={onboarding.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onboarding.close();
        }
      }}
      currentStepId={onboarding.currentStep.id}
      onNext={onboarding.nextStep}
      onPrevious={onboarding.previousStep}
      onSkip={onboarding.skip}
      onComplete={onboarding.complete}
      isFirstStep={onboarding.isFirstStep}
      isLastStep={onboarding.isLastStep}
      stepNumber={onboarding.currentStepIndex + 1}
      totalSteps={onboarding.totalSteps}
      progress={onboarding.progress}
      isLoading={onboarding.isLoading}
    />
  );
}
