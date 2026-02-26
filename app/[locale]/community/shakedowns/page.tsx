/**
 * Community Shakedowns Feed Page
 *
 * Feature: 001-community-shakedowns
 * Task: T034
 * Route: /community/shakedowns
 *
 * Main page for browsing community shakedowns with filtering and sorting.
 * Uses server component for metadata and client component for interactivity.
 *
 * Architecture: Feature-Sliced Light
 * - Server component wrapper for SEO metadata
 * - Client component for interactive filters and infinite scroll feed
 */

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ShakedownsFeedContent } from './ShakedownsFeedContent';

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
    title: t('title'),
    description: t('subtitle'),
  };
}

// =============================================================================
// Page Component
// =============================================================================

export default function ShakedownsFeedPage() {
  return <ShakedownsFeedContent />;
}
