/**
 * Onboarding Types
 *
 * Feature: User Onboarding
 * Type definitions for the onboarding flow
 */

/**
 * Onboarding step identifiers
 */
export type OnboardingStep =
  | 'welcome'
  | 'inventory'
  | 'loadouts'
  | 'community'
  | 'profile'
  | 'beta';

/**
 * Configuration for a single onboarding step
 */
export interface OnboardingStepConfig {
  id: OnboardingStep;
  /** Translation key prefix for this step */
  translationKey: string;
  /** Whether this step should be shown (used for beta step) */
  isVisible?: boolean;
}

/**
 * Onboarding state
 */
export interface OnboardingState {
  /** Whether onboarding modal is open */
  isOpen: boolean;
  /** Current step index */
  currentStepIndex: number;
  /** Whether onboarding has been completed */
  isCompleted: boolean;
  /** Whether onboarding is loading */
  isLoading: boolean;
}

/**
 * Onboarding actions
 */
export interface OnboardingActions {
  /** Go to the next step */
  nextStep: () => void;
  /** Go to the previous step */
  previousStep: () => void;
  /** Skip to a specific step */
  goToStep: (index: number) => void;
  /** Complete the onboarding */
  complete: () => Promise<void>;
  /** Skip/dismiss the onboarding */
  skip: () => Promise<void>;
  /** Open the onboarding modal */
  open: () => void;
  /** Close the onboarding modal */
  close: () => void;
}

/**
 * Hook return type combining state and actions
 */
export interface UseOnboardingReturn extends OnboardingState, OnboardingActions {
  /** Current step configuration */
  currentStep: OnboardingStepConfig;
  /** All step configurations */
  steps: OnboardingStepConfig[];
  /** Total number of visible steps */
  totalSteps: number;
  /** Whether the user is on the first step */
  isFirstStep: boolean;
  /** Whether the user is on the last step */
  isLastStep: boolean;
  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * Props for individual step components
 */
export interface OnboardingStepProps {
  /** Handler to go to next step */
  onNext: () => void;
  /** Handler to go to previous step */
  onPrevious: () => void;
  /** Handler to skip onboarding */
  onSkip: () => void;
  /** Handler to complete onboarding */
  onComplete: () => void;
  /** Whether this is the first step */
  isFirstStep: boolean;
  /** Whether this is the last step */
  isLastStep: boolean;
  /** Current step index (1-based for display) */
  stepNumber: number;
  /** Total number of steps */
  totalSteps: number;
}

/**
 * Environment flag for beta mode
 */
export const IS_BETA_MODE = true;
