/**
 * VIP Profile Page
 *
 * Feature: 052-vip-loadouts
 * Task: T031
 *
 * Displays VIP profile with loadouts grid.
 * Public page - no authentication required for viewing.
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { VipProfileContent } from '@/components/vip/VipProfileContent';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Types
// =============================================================================

interface VipProfilePageProps {
  params: Promise<{ slug: string; locale: string }>;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function VipProfileSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full max-w-md bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Loadouts skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Page Component
// =============================================================================

export default async function VipProfilePage({ params }: VipProfilePageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Check if VIP exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vip, error } = await (supabase as any)
    .from('vip_accounts')
    .select('id, name')
    .eq('slug', slug)
    .is('archived_at', null)
    .single();

  if (error || !vip) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Suspense fallback={<VipProfileSkeleton />}>
        <VipProfileContent slug={slug} />
      </Suspense>
    </div>
  );
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata({ params }: VipProfilePageProps) {
  const { slug } = await params;
  const t = await getTranslations('vip');
  const supabase = await createClient();

  // Get VIP name for meta title
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vip } = await (supabase as any)
    .from('vip_accounts')
    .select('name, bio')
    .eq('slug', slug)
    .is('archived_at', null)
    .single();

  if (!vip) {
    return {
      title: t('profile.notFound'),
    };
  }

  const title = t('profile.metaTitle', { name: vip.name });
  const description = vip.bio?.substring(0, 160) || t('profile.metaDescription', { name: vip.name });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      siteName: 'GearShack',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}
