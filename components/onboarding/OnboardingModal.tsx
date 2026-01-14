/**
 * OnboardingModal Component
 *
 * Feature: User Onboarding
 *
 * Responsive modal for the onboarding flow.
 * Uses Dialog on desktop, Sheet on mobile for optimal UX.
 * Renders step components based on current step.
 */

'use client';

import { useTranslations } from 'next-intl';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { OnboardingStep } from '@/types/onboarding';
import {
  WelcomeStep,
  InventoryStep,
  LoadoutsStep,
  CommunityStep,
  ProfileStep,
  BetaFeedbackStep,
} from './steps';

// =============================================================================
// Types
// =============================================================================

interface OnboardingModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler to close the modal */
  onOpenChange: (open: boolean) => void;
  /** Current step ID */
  currentStepId: OnboardingStep;
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
  /** Current step number (1-based) */
  stepNumber: number;
  /** Total number of steps */
  totalSteps: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether completion is in progress */
  isLoading: boolean;
}

// =============================================================================
// Step Renderer
// =============================================================================

function StepContent({
  stepId,
  onSkip,
  onComplete,
}: {
  stepId: OnboardingStep;
  onSkip: () => void;
  onComplete: () => void;
}) {
  switch (stepId) {
    case 'welcome':
      return <WelcomeStep onSkip={onSkip} />;
    case 'inventory':
      return <InventoryStep onSkip={onSkip} />;
    case 'loadouts':
      return <LoadoutsStep onSkip={onSkip} />;
    case 'community':
      return <CommunityStep onSkip={onSkip} />;
    case 'profile':
      return <ProfileStep onSkip={onSkip} />;
    case 'beta':
      return <BetaFeedbackStep onComplete={onComplete} />;
    default:
      return null;
  }
}

// =============================================================================
// Navigation Footer
// =============================================================================

function NavigationFooter({
  onPrevious,
  onNext,
  onComplete,
  isFirstStep,
  isLastStep,
  stepNumber,
  totalSteps,
  isLoading,
}: Pick<
  OnboardingModalProps,
  | 'onPrevious'
  | 'onNext'
  | 'onComplete'
  | 'isFirstStep'
  | 'isLastStep'
  | 'stepNumber'
  | 'totalSteps'
  | 'isLoading'
>) {
  const t = useTranslations('Onboarding');

  return (
    <div className="flex items-center justify-between w-full">
      {/* Previous button */}
      <Button
        variant="ghost"
        onClick={onPrevious}
        disabled={isFirstStep || isLoading}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">{t('previous')}</span>
      </Button>

      {/* Step indicator */}
      <span className="text-sm text-muted-foreground">
        {stepNumber} / {totalSteps}
      </span>

      {/* Next/Complete button */}
      {isLastStep ? (
        <Button onClick={onComplete} disabled={isLoading} className="gap-1">
          <Check className="h-4 w-4" />
          {t('complete')}
        </Button>
      ) : (
        <Button onClick={onNext} disabled={isLoading} className="gap-1">
          {t('next')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingModal({
  isOpen,
  onOpenChange,
  currentStepId,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  isFirstStep,
  isLastStep,
  stepNumber,
  totalSteps,
  progress,
  isLoading,
}: OnboardingModalProps) {
  const t = useTranslations('Onboarding');
  const isMobile = useMediaQuery('(max-width: 640px)');

  // Shared content
  const content = (
    <>
      {/* Progress bar */}
      <div className="px-4 sm:px-6">
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <StepContent stepId={currentStepId} onSkip={onSkip} onComplete={onComplete} />
      </div>
    </>
  );

  const footer = (
    <NavigationFooter
      onPrevious={onPrevious}
      onNext={onNext}
      onComplete={onComplete}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      isLoading={isLoading}
    />
  );

  // Mobile: Full-screen sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[90vh] flex flex-col rounded-t-2xl"
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="sr-only">{t('title')}</SheetTitle>
          </SheetHeader>
          {content}
          <SheetFooter className="pt-2 border-t">{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Centered dialog
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="sr-only">{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex flex-col overflow-hidden">{content}</div>
        <DialogFooter className="p-6 pt-4 border-t">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
