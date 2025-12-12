/**
 * PainPointsSection Component
 *
 * Displays the "pain points" that outdoor enthusiasts face before using GearShack.
 * Uses the three landingpage images to illustrate common frustrations.
 */

import Image from 'next/image';

interface PainPointsSectionProps {
  /** Translation function from parent (Landing namespace) */
  t: (key: string) => string;
}

const PAIN_POINTS = [
  {
    imageUrl: '/images/landingpage/spreadsheet_hell.png',
    titleKey: 'painPoints.spreadsheets.title',
    descriptionKey: 'painPoints.spreadsheets.description',
  },
  {
    imageUrl: '/images/landingpage/manual_data_entry.png',
    titleKey: 'painPoints.manual.title',
    descriptionKey: 'painPoints.manual.description',
  },
  {
    imageUrl: '/images/landingpage/guessing_weight.png',
    titleKey: 'painPoints.guessing.title',
    descriptionKey: 'painPoints.guessing.description',
  },
] as const;

export function PainPointsSection({ t }: PainPointsSectionProps) {
  return (
    <section className="bg-zinc-950 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-red-400">
            {t('painPoints.eyebrow')}
          </p>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            {t('painPoints.title')}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-zinc-400">
            {t('painPoints.subtitle')}
          </p>
        </div>

        {/* Pain Points Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {PAIN_POINTS.map((painPoint, index) => (
            <div
              key={painPoint.titleKey}
              className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 transition-all hover:border-red-500/30"
            >
              {/* Image */}
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={painPoint.imageUrl}
                  alt={t(painPoint.titleKey)}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
                {/* Number badge */}
                <div className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/90 text-sm font-bold text-white">
                  {index + 1}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {t(painPoint.titleKey)}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {t(painPoint.descriptionKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
