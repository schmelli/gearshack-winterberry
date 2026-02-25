/**
 * FeatureGrid Component
 *
 * Feature: 028-landing-page-i18n
 * T012: Feature grid showing 3 key product benefits with icons
 * FR-002: Display a feature grid showing 3 key product benefits with icons
 * FR-007: Fully responsive (mobile-first design)
 *
 * This is a stateless presentational component - receives translation function via props.
 */

import { Package, Scale, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FeatureGridProps {
  /** Translation function from parent (Landing namespace) */
  t: (key: string) => string;
}

const FEATURES = [
  {
    titleKey: 'features.organize.title',
    descriptionKey: 'features.organize.description',
    icon: Package,
  },
  {
    titleKey: 'features.loadouts.title',
    descriptionKey: 'features.loadouts.description',
    icon: Scale,
  },
  {
    titleKey: 'features.share.title',
    descriptionKey: 'features.share.description',
    icon: Users,
  },
] as const;

export function FeatureGrid({ t }: FeatureGridProps) {
  return (
    <section className="bg-zinc-950 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.titleKey}
                className="border-zinc-800 bg-zinc-900/50 transition-colors hover:border-emerald-500/50"
              >
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Icon className="h-6 w-6 text-emerald-500" />
                  </div>
                  <CardTitle className="text-xl text-white">
                    {t(feature.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-zinc-400">
                    {t(feature.descriptionKey)}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
