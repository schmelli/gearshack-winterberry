/**
 * SolutionSection Component
 *
 * Displays GearShack's solutions to the pain points.
 * Uses feature card images to showcase app capabilities.
 */

import Image from 'next/image';
import { Check } from 'lucide-react';

interface SolutionSectionProps {
  /** Translation function from parent (Landing namespace) */
  t: (key: string) => string;
}

const SOLUTIONS = [
  {
    imageUrl: '/images/cards/gear.jpeg',
    titleKey: 'solutions.inventory.title',
    descriptionKey: 'solutions.inventory.description',
    benefits: [
      'solutions.inventory.benefit1',
      'solutions.inventory.benefit2',
      'solutions.inventory.benefit3',
    ],
  },
  {
    imageUrl: '/images/cards/loadouts_card.jpeg',
    titleKey: 'solutions.loadouts.title',
    descriptionKey: 'solutions.loadouts.description',
    benefits: [
      'solutions.loadouts.benefit1',
      'solutions.loadouts.benefit2',
      'solutions.loadouts.benefit3',
    ],
  },
  {
    imageUrl: '/images/cards/community_card.jpeg',
    titleKey: 'solutions.community.title',
    descriptionKey: 'solutions.community.description',
    benefits: [
      'solutions.community.benefit1',
      'solutions.community.benefit2',
      'solutions.community.benefit3',
    ],
  },
  {
    imageUrl: '/images/cards/wishlist_card.jpeg',
    titleKey: 'solutions.wishlist.title',
    descriptionKey: 'solutions.wishlist.description',
    benefits: [
      'solutions.wishlist.benefit1',
      'solutions.wishlist.benefit2',
      'solutions.wishlist.benefit3',
    ],
  },
] as const;

export function SolutionSection({ t }: SolutionSectionProps) {
  return (
    <section className="bg-[#405A3D] px-4 py-20">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-300">
            {t('solutions.eyebrow')}
          </p>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            {t('solutions.title')}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            {t('solutions.subtitle')}
          </p>
        </div>

        {/* Solutions - Alternating Layout */}
        <div className="space-y-16">
          {SOLUTIONS.map((solution, index) => {
            const isEven = index % 2 === 0;
            return (
              <div
                key={solution.titleKey}
                className={`flex flex-col items-center gap-8 md:flex-row ${
                  isEven ? '' : 'md:flex-row-reverse'
                }`}
              >
                {/* Image */}
                <div className="w-full md:w-1/2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl">
                    <Image
                      src={solution.imageUrl}
                      alt={t(solution.titleKey)}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    {/* Subtle overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                </div>

                {/* Content */}
                <div className="w-full md:w-1/2">
                  <h3 className="mb-3 text-2xl font-bold text-white md:text-3xl">
                    {t(solution.titleKey)}
                  </h3>
                  <p className="mb-6 text-lg leading-relaxed text-white/80">
                    {t(solution.descriptionKey)}
                  </p>
                  <ul className="space-y-3">
                    {solution.benefits.map((benefitKey) => (
                      <li
                        key={benefitKey}
                        className="flex items-start gap-3 text-white/90"
                      >
                        <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <span>{t(benefitKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
