/**
 * New Shakedown Request Page
 *
 * Feature: 001-community-shakedowns
 * Task: T021
 * Route: /community/shakedowns/new
 *
 * Page for creating a new shakedown request.
 * Supports pre-selecting a loadout via ?loadoutId query parameter.
 * If no loadoutId provided, shows a loadout selector first.
 *
 * Architecture: Feature-Sliced Light
 * - Server component wrapper for metadata
 * - Client component for interactive content
 */

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { NewShakedownContent } from './NewShakedownContent';

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale = 'en' } = await params;
  const t = await getTranslations({ locale, namespace: 'Shakedowns' });

  return {
    title: t('requestShakedown'),
    description: t('subtitle'),
  };
}

// =============================================================================
// Page Component
// =============================================================================

export default function NewShakedownPage() {
  return <NewShakedownContent />;
}
