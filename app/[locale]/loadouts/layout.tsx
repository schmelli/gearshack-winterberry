/**
 * Force dynamic rendering for loadouts routes.
 *
 * Rationale (Performance Optimization Phase 5 audit):
 * - Protected route requiring authentication (user-specific content)
 * - Uses useSearchParams() for loadout filtering and detail views
 * - User's loadout data varies per user, cannot be statically generated
 * - Kept intentionally: ISR/static generation not suitable for authenticated routes
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale = 'en' } = await params;
  const t = await getTranslations({ locale, namespace: 'Loadouts.meta' });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      siteName: 'Gearshack',
    },
    twitter: {
      card: 'summary',
      title: t('title'),
      description: t('description'),
    },
  };
}

export default function LoadoutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-4 h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    }>
      {children}
    </Suspense>
  );
}
