/**
 * VIP Claim Page
 *
 * Feature: 052-vip-loadouts
 * Task: T077
 *
 * Landing page for VIPs to claim their curated accounts.
 * Shows VIP info and allows authenticated users to complete the claim.
 */

import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { VipClaimContent } from '@/components/vip/VipClaimContent';

// =============================================================================
// Types
// =============================================================================

interface VipClaimPageProps {
  params: Promise<{ token: string; locale: string }>;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function ClaimSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-full bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

// =============================================================================
// Page Component
// =============================================================================

export default async function VipClaimPage({ params }: VipClaimPageProps) {
  const { token } = await params;

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <Suspense fallback={<ClaimSkeleton />}>
        <VipClaimContent token={token} />
      </Suspense>
    </div>
  );
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata({ params }: VipClaimPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'vip.claim' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    robots: {
      index: false,
      follow: false,
    },
  };
}
