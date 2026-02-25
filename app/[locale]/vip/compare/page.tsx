/**
 * VIP Comparison Page
 *
 * Feature: 052-vip-loadouts
 * Task: T068
 *
 * Side-by-side loadout comparison page.
 * Allows users to compare their loadout with VIP loadouts.
 */

import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { VipCompareContent } from '@/components/vip/VipCompareContent';

// =============================================================================
// Loading Skeleton
// =============================================================================

function ComparisonSkeleton() {
  return (
    <div className="space-y-6">
      {/* Selectors skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
      </div>

      {/* Summary skeleton */}
      <div className="h-40 bg-muted rounded-lg animate-pulse" />

      {/* Category breakdown skeleton */}
      <div className="h-60 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}

// =============================================================================
// Page Component
// =============================================================================

export default function VipComparePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Suspense fallback={<ComparisonSkeleton />}>
        <VipCompareContent />
      </Suspense>
    </div>
  );
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata() {
  const t = await getTranslations('vip.compare');

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}
