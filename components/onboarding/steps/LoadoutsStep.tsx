/**
 * LoadoutsStep Component
 *
 * Feature: User Onboarding
 *
 * Explains the loadout/packing list feature
 */

'use client';

import { useTranslations } from 'next-intl';
import { ClipboardList, Scale, Calendar, Sparkles } from 'lucide-react';
import type { OnboardingStepProps } from '@/types/onboarding';

interface LoadoutsStepProps extends Pick<OnboardingStepProps, 'onSkip'> {}

export function LoadoutsStep({ onSkip }: LoadoutsStepProps) {
  const t = useTranslations('Onboarding');

  return (
    <div className="flex flex-col items-center text-center px-4 py-6 sm:px-6 sm:py-8">
      {/* Icon */}
      <div className="mb-6 rounded-full bg-blue-500/10 p-4">
        <ClipboardList className="h-12 w-12 text-blue-500" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t('loadouts.title')}
      </h2>

      {/* Subtitle */}
      <p className="mt-3 text-muted-foreground max-w-md">
        {t('loadouts.subtitle')}
      </p>

      {/* Feature cards */}
      <div className="mt-8 grid gap-3 w-full max-w-sm">
        <FeatureCard
          icon={<Scale className="h-5 w-5" />}
          title={t('loadouts.feature1.title')}
          description={t('loadouts.feature1.description')}
        />
        <FeatureCard
          icon={<Calendar className="h-5 w-5" />}
          title={t('loadouts.feature2.title')}
          description={t('loadouts.feature2.description')}
        />
        <FeatureCard
          icon={<Sparkles className="h-5 w-5" />}
          title={t('loadouts.feature3.title')}
          description={t('loadouts.feature3.description')}
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

function FeatureCard({
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
      <div className="flex-shrink-0 rounded-md bg-muted p-2">{icon}</div>
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
