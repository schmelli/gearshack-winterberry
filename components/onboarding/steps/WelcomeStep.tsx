/**
 * WelcomeStep Component
 *
 * Feature: User Onboarding
 *
 * The first step of onboarding - welcomes new users to Gearshack
 */

'use client';

import { useTranslations } from 'next-intl';
import { Compass } from 'lucide-react';
import type { OnboardingStepProps } from '@/types/onboarding';

interface WelcomeStepProps extends Pick<OnboardingStepProps, 'onSkip'> {}

export function WelcomeStep({ onSkip }: WelcomeStepProps) {
  const t = useTranslations('Onboarding');

  return (
    <div className="flex flex-col items-center text-center px-4 py-6 sm:px-6 sm:py-8">
      {/* Icon */}
      <div className="mb-6 rounded-full bg-primary/10 p-4">
        <Compass className="h-12 w-12 text-primary" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t('welcome.title')}
      </h2>

      {/* Subtitle */}
      <p className="mt-3 text-muted-foreground max-w-md">
        {t('welcome.subtitle')}
      </p>

      {/* Feature highlights */}
      <div className="mt-8 grid gap-4 text-left w-full max-w-sm">
        <FeatureHighlight
          emoji="🎒"
          title={t('welcome.feature1.title')}
          description={t('welcome.feature1.description')}
        />
        <FeatureHighlight
          emoji="📋"
          title={t('welcome.feature2.title')}
          description={t('welcome.feature2.description')}
        />
        <FeatureHighlight
          emoji="🌍"
          title={t('welcome.feature3.title')}
          description={t('welcome.feature3.description')}
        />
      </div>

      {/* Skip link */}
      <button
        onClick={onSkip}
        className="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
      >
        {t('skip')}
      </button>
    </div>
  );
}

function FeatureHighlight({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
