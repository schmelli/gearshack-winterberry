/**
 * VIP Directory Page
 *
 * Feature: 052-vip-loadouts
 * Task: T030
 *
 * Displays searchable grid of all VIP profiles.
 * Public page - no authentication required.
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';

// ISR: Revalidate every 5 minutes for public page performance
export const revalidate = 300;
import { getTranslations } from 'next-intl/server';
import { Users } from 'lucide-react';
import { VipDirectoryContent } from '@/components/vip/VipDirectoryContent';

// =============================================================================
// Loading Skeleton
// =============================================================================

function VipDirectorySkeleton() {
  return (
    <div className="space-y-6">
      {/* Search skeleton */}
      <div className="h-10 w-full max-w-md bg-muted rounded-lg animate-pulse" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Page Component
// =============================================================================

export default async function VipDirectoryPage() {
  const t = await getTranslations('vip');

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold text-foreground">
            {t('directory.title')}
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          {t('directory.description')}
        </p>
      </div>

      {/* Directory Content */}
      <Suspense fallback={<VipDirectorySkeleton />}>
        <VipDirectoryContent />
      </Suspense>
    </div>
  );
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale = 'en' } = await params;
  const t = await getTranslations({ locale, namespace: 'vip' });

  const title = t('directory.metaTitle');
  const description = t('directory.metaDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Gearshack',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}
