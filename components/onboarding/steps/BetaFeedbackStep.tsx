/**
 * BetaFeedbackStep Component
 *
 * Feature: User Onboarding
 *
 * Explains the beta status and invites users to report bugs
 * This step is only shown during the beta testing phase (IS_BETA_MODE = true)
 */

'use client';

import { useTranslations } from 'next-intl';
import { FlaskConical, Bug, MessageCircle, Heart } from 'lucide-react';
import type { OnboardingStepProps } from '@/types/onboarding';

interface BetaFeedbackStepProps extends Pick<OnboardingStepProps, 'onComplete'> {}

export function BetaFeedbackStep({ onComplete }: BetaFeedbackStepProps) {
  const t = useTranslations('Onboarding');

  return (
    <div className="flex flex-col items-center text-center px-4 py-6 sm:px-6 sm:py-8">
      {/* Icon with special beta styling */}
      <div className="mb-6 relative">
        <div className="rounded-full bg-gradient-to-br from-rose-500/20 to-orange-500/20 p-4">
          <FlaskConical className="h-12 w-12 text-rose-500" />
        </div>
        {/* Beta badge */}
        <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          Beta
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t('beta.title')}
      </h2>

      {/* Subtitle */}
      <p className="mt-3 text-muted-foreground max-w-md">
        {t('beta.subtitle')}
      </p>

      {/* Beta info cards */}
      <div className="mt-8 grid gap-3 w-full max-w-sm">
        <InfoCard
          icon={<Bug className="h-5 w-5 text-rose-500" />}
          title={t('beta.feature1.title')}
          description={t('beta.feature1.description')}
        />
        <InfoCard
          icon={<MessageCircle className="h-5 w-5 text-rose-500" />}
          title={t('beta.feature2.title')}
          description={t('beta.feature2.description')}
        />
        <InfoCard
          icon={<Heart className="h-5 w-5 text-rose-500" />}
          title={t('beta.feature3.title')}
          description={t('beta.feature3.description')}
        />
      </div>

      {/* Feedback hint */}
      <div className="mt-6 rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 max-w-sm">
        <p className="text-sm text-muted-foreground">
          {t('beta.feedbackHint')}
        </p>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 items-start rounded-lg border bg-card p-3 text-left">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
