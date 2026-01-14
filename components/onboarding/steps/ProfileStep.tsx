/**
 * ProfileStep Component
 *
 * Feature: User Onboarding
 *
 * Explains profile and settings features
 */

'use client';

import { useTranslations } from 'next-intl';
import { User, Settings, Bell, Shield } from 'lucide-react';
import type { OnboardingStepProps } from '@/types/onboarding';

interface ProfileStepProps extends Pick<OnboardingStepProps, 'onSkip'> {}

export function ProfileStep({ onSkip }: ProfileStepProps) {
  const t = useTranslations('Onboarding');

  return (
    <div className="flex flex-col items-center text-center px-4 py-6 sm:px-6 sm:py-8">
      {/* Icon */}
      <div className="mb-6 rounded-full bg-amber-500/10 p-4">
        <User className="h-12 w-12 text-amber-500" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t('profile.title')}
      </h2>

      {/* Subtitle */}
      <p className="mt-3 text-muted-foreground max-w-md">
        {t('profile.subtitle')}
      </p>

      {/* Feature cards */}
      <div className="mt-8 grid gap-3 w-full max-w-sm">
        <FeatureCard
          icon={<User className="h-5 w-5" />}
          title={t('profile.feature1.title')}
          description={t('profile.feature1.description')}
        />
        <FeatureCard
          icon={<Settings className="h-5 w-5" />}
          title={t('profile.feature2.title')}
          description={t('profile.feature2.description')}
        />
        <FeatureCard
          icon={<Bell className="h-5 w-5" />}
          title={t('profile.feature3.title')}
          description={t('profile.feature3.description')}
        />
        <FeatureCard
          icon={<Shield className="h-5 w-5" />}
          title={t('profile.feature4.title')}
          description={t('profile.feature4.description')}
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
