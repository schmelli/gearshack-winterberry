/**
 * HeroSection Component
 *
 * Feature: 028-landing-page-i18n
 * T011: Hero section with headline, subtitle, and CTA
 * FR-001: Display hero section with headline, subtitle, and primary CTA button
 * FR-013: Use Deep Forest color theme (#405A3D) for backgrounds
 * FR-014: Use emerald accent colors for interactive elements
 *
 * This is a stateless presentational component - receives all data via props.
 */

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

interface HeroSectionProps {
  /** Translated hero title */
  title: string;
  /** Translated hero subtitle */
  subtitle: string;
  /** Translated CTA button label */
  ctaLabel: string;
  /** CTA button destination href */
  ctaHref: string;
}

export function HeroSection({ title, subtitle, ctaLabel, ctaHref }: HeroSectionProps) {
  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center bg-[#405A3D] px-4 py-20 text-center text-white">
      {/* Background gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl">
        <h1 className="mb-6 font-[family-name:var(--font-rock-salt)] text-3xl leading-tight tracking-tight md:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/80 md:text-xl">
          {subtitle}
        </p>
        <Button
          asChild
          size="lg"
          className="bg-emerald-500 px-8 py-6 text-lg font-semibold hover:bg-emerald-600"
        >
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </div>
    </section>
  );
}
