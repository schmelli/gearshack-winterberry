/**
 * LandingPage Component
 *
 * Feature: 028-landing-page-i18n
 * T015: LandingPage orchestrator that uses hooks and passes data to sections
 * T017: Auth state check using useAuthContext (US2 - FR-005)
 *
 * This is the ONLY client component in the landing page that uses hooks.
 * All section components (HeroSection, FeatureGrid, etc.) are stateless
 * and receive data via props - following Feature-Sliced Light architecture.
 */

'use client';

import { useTranslations } from 'next-intl';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { HeroSection } from './HeroSection';
import { FeatureGrid } from './FeatureGrid';
import { SocialProof } from './SocialProof';
import { PricingPreview } from './PricingPreview';

export function LandingPage() {
  const t = useTranslations('Landing');
  const { user } = useAuthContext();

  // FR-005/FR-006: Different CTAs based on auth state
  const isAuthenticated = !!user;
  const ctaLabel = isAuthenticated ? t('ctaDashboard') : t('ctaStartTrial');
  const ctaHref = isAuthenticated ? '/inventory' : '/login';

  return (
    <main className="min-h-screen">
      {/* FR-001: Hero section with headline, subtitle, and CTA */}
      <HeroSection
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
      />

      {/* FR-002: Feature grid with 3 product benefits */}
      <FeatureGrid t={t} />

      {/* FR-003: Social proof section */}
      <SocialProof t={t} />

      {/* FR-004: Pricing preview section */}
      <PricingPreview t={t} />
    </main>
  );
}
