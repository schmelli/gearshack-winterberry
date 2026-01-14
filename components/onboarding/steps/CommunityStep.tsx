/**
 * CommunityStep Component
 *
 * Feature: User Onboarding
 *
 * Explains the community features
 */

'use client';

import { useTranslations } from 'next-intl';
import { Users, MessageSquare, Star, ShoppingBag } from 'lucide-react';
import type { OnboardingStepProps } from '@/types/onboarding';

interface CommunityStepProps extends Pick<OnboardingStepProps, 'onSkip'> {}

export function CommunityStep({ onSkip }: CommunityStepProps) {
  const t = useTranslations('Onboarding');

  return (
    <div className="flex flex-col items-center text-center px-4 py-6 sm:px-6 sm:py-8">
      {/* Icon */}
      <div className="mb-6 rounded-full bg-purple-500/10 p-4">
        <Users className="h-12 w-12 text-purple-500" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {t('community.title')}
      </h2>

      {/* Subtitle */}
      <p className="mt-3 text-muted-foreground max-w-md">
        {t('community.subtitle')}
      </p>

      {/* Feature cards */}
      <div className="mt-8 grid gap-3 w-full max-w-sm">
        <FeatureCard
          icon={<Star className="h-5 w-5" />}
          title={t('community.feature1.title')}
          description={t('community.feature1.description')}
        />
        <FeatureCard
          icon={<MessageSquare className="h-5 w-5" />}
          title={t('community.feature2.title')}
          description={t('community.feature2.description')}
        />
        <FeatureCard
          icon={<ShoppingBag className="h-5 w-5" />}
          title={t('community.feature3.title')}
          description={t('community.feature3.description')}
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
