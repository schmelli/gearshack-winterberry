/**
 * useOnboarding Hook
 *
 * Feature: User Onboarding
 *
 * Manages onboarding state and logic following Feature-Sliced Light architecture.
 * All business logic is contained in this hook, keeping UI components stateless.
 */

'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  OnboardingStep,
  OnboardingStepConfig,
  UseOnboardingReturn,
  OnboardingState,
} from '@/types/onboarding';
import { IS_BETA_MODE } from '@/types/onboarding';

// =============================================================================
// Constants
// =============================================================================

/**
 * Step configurations for the onboarding flow
 * Order matters - this defines the progression
 */
const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  { id: 'welcome', translationKey: 'welcome' },
  { id: 'inventory', translationKey: 'inventory' },
  { id: 'loadouts', translationKey: 'loadouts' },
  { id: 'community', translationKey: 'community' },
  { id: 'profile', translationKey: 'profile' },
  { id: 'beta', translationKey: 'beta', isVisible: IS_BETA_MODE },
];

/** localStorage key for skipped onboarding */
const ONBOARDING_SKIPPED_KEY = 'gearshack_onboarding_skipped';

/** localStorage key for completed onboarding */
const ONBOARDING_COMPLETED_KEY = 'gearshack_onboarding_completed';

// =============================================================================
// Hook Implementation
// =============================================================================

interface UseOnboardingOptions {
  /** User ID for marking onboarding complete */
  userId: string | null;
  /** Whether user has completed onboarding (first_launch is set) */
  hasCompletedOnboarding: boolean;
  /** Callback after onboarding is completed */
  onComplete?: () => void;
}

export function useOnboarding({
  userId,
  hasCompletedOnboarding,
  onComplete,
}: UseOnboardingOptions): UseOnboardingReturn {
  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  // Filter steps based on visibility
  const visibleSteps = useMemo(
    () => ONBOARDING_STEPS.filter((step) => step.isVisible !== false),
    []
  );

  // State
  const [state, setState] = useState<OnboardingState>({
    isOpen: false,
    currentStepIndex: 0,
    isCompleted: hasCompletedOnboarding,
    isLoading: false,
  });

  // Check if onboarding should show on mount
  useEffect(() => {
    if (userId && !hasCompletedOnboarding) {
      // Check if user has skipped onboarding before
      const wasSkipped = localStorage.getItem(ONBOARDING_SKIPPED_KEY);
      if (!wasSkipped) {
        // Small delay to let the page render first
        const timer = setTimeout(() => {
          setState((prev) => ({ ...prev, isOpen: true }));
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [userId, hasCompletedOnboarding]);

  // Computed values
  const currentStep = visibleSteps[state.currentStepIndex] || visibleSteps[0];
  const totalSteps = visibleSteps.length;
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === totalSteps - 1;
  const progress = ((state.currentStepIndex + 1) / totalSteps) * 100;

  // Actions
  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.min(prev.currentStepIndex + 1, visibleSteps.length - 1),
    }));
  }, [visibleSteps.length]);

  const previousStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(prev.currentStepIndex - 1, 0),
    }));
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < visibleSteps.length) {
        setState((prev) => ({ ...prev, currentStepIndex: index }));
      }
    },
    [visibleSteps.length]
  );

  const markOnboardingComplete = useCallback(async () => {
    if (!userId) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Update profile with first_launch timestamp
      const { error } = await supabase
        .from('profiles')
        .update({ first_launch: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('[useOnboarding] Failed to mark onboarding complete:', error);
        // Continue anyway - onboarding UX shouldn't be blocked
      }

      // Mark as completed in localStorage (primary storage until DB migration)
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      // Clear any skipped flag
      localStorage.removeItem(ONBOARDING_SKIPPED_KEY);

      setState((prev) => ({
        ...prev,
        isCompleted: true,
        isOpen: false,
        isLoading: false,
      }));

      onComplete?.();
    } catch (err) {
      console.error('[useOnboarding] Unexpected error:', err);
      setState((prev) => ({ ...prev, isLoading: false, isOpen: false }));
    }
  }, [userId, supabase, onComplete]);

  const complete = useCallback(async () => {
    await markOnboardingComplete();
  }, [markOnboardingComplete]);

  const skip = useCallback(async () => {
    // Mark as skipped in localStorage (user can revisit later)
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');

    // Also mark as complete in database so it doesn't show again
    await markOnboardingComplete();
  }, [markOnboardingComplete]);

  const open = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true, currentStepIndex: 0 }));
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    // State
    ...state,
    // Computed
    currentStep,
    steps: visibleSteps,
    totalSteps,
    isFirstStep,
    isLastStep,
    progress,
    // Actions
    nextStep,
    previousStep,
    goToStep,
    complete,
    skip,
    open,
    close,
  };
}
