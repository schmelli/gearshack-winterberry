/**
 * PricingPreview Component
 *
 * Feature: 028-landing-page-i18n
 * T014: Pricing preview section with tier comparison
 * FR-004: Display a pricing preview section with tier comparison
 * FR-014: Use emerald accent colors for interactive elements
 *
 * This is a stateless presentational component - receives translation function via props.
 */

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface PricingPreviewProps {
  /** Translation function from parent (Landing namespace) */
  t: (key: string) => string;
}

const TIERS = [
  {
    id: 'basecamp',
    highlighted: false,
    featureKeys: [
      'pricing.basecamp.features.items',
      'pricing.basecamp.features.loadouts',
      'pricing.basecamp.features.images',
      'pricing.basecamp.features.community',
    ],
  },
  {
    id: 'trailblazer',
    highlighted: true,
    featureKeys: [
      'pricing.trailblazer.features.items',
      'pricing.trailblazer.features.loadouts',
      'pricing.trailblazer.features.images',
      'pricing.trailblazer.features.community',
      'pricing.trailblazer.features.analytics',
      'pricing.trailblazer.features.export',
    ],
  },
] as const;

export function PricingPreview({ t }: PricingPreviewProps) {
  return (
    <section className="bg-zinc-950 px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            {t('pricing.title')}
          </h2>
          <p className="text-lg text-zinc-400">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {TIERS.map((tier) => (
            <Card
              key={tier.id}
              className={cn(
                'relative border-zinc-800 bg-zinc-900/50',
                tier.highlighted && 'border-emerald-500 ring-1 ring-emerald-500'
              )}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                  Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl text-white">
                  {t(`pricing.${tier.id}.name`)}
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {t(`pricing.${tier.id}.description`)}
                </CardDescription>
                <p className="mt-4 text-4xl font-bold text-white">
                  {t(`pricing.${tier.id}.price`)}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tier.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex items-center gap-2 text-zinc-300">
                      <Check className="h-5 w-5 text-emerald-500" />
                      {t(featureKey)}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className={cn(
                    'w-full',
                    tier.highlighted
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  )}
                >
                  <Link href="/login">
                    {tier.id === 'basecamp' ? t('ctaStartTrial') : t('ctaStartTrial')}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
