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

import Image from 'next/image';
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
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-4 py-20 text-center text-white">
      {/* Background Image */}
      <Image
        src="/images/headers/headerimage1.jpeg"
        alt="Hiking gear in forest"
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/logos/small_gearshack_logo.png"
            alt="GearShack Logo"
            width={120}
            height={120}
            className="h-28 w-28 md:h-32 md:w-32"
            priority
          />
        </div>

        <h1 className="mb-6 font-[family-name:var(--font-rock-salt)] text-3xl leading-tight tracking-tight md:text-5xl lg:text-6xl drop-shadow-lg">
          {title}
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/90 md:text-xl drop-shadow-md">
          {subtitle}
        </p>
        <Button
          asChild
          size="lg"
          className="bg-emerald-500 px-8 py-6 text-lg font-semibold shadow-xl hover:bg-emerald-600"
        >
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </div>
    </section>
  );
}
