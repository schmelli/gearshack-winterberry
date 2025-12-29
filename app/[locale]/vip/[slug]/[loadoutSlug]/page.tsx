/**
 * VIP Loadout Detail Page
 *
 * Feature: 052-vip-loadouts
 * Task: T032
 *
 * Displays full loadout with items, weight breakdown, and source attribution.
 * Public page - no authentication required for viewing.
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { VipLoadoutContent } from '@/components/vip/VipLoadoutContent';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Types
// =============================================================================

interface VipLoadoutPageProps {
  params: Promise<{ slug: string; loadoutSlug: string; locale: string }>;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function VipLoadoutSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back link skeleton */}
      <div className="h-4 w-32 bg-muted rounded animate-pulse" />

      {/* Header card skeleton */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="flex gap-4">
          <div className="h-6 w-20 bg-muted rounded animate-pulse" />
          <div className="h-6 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Weight breakdown skeleton */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="h-4 w-full bg-muted rounded-full animate-pulse" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-full bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Items skeleton */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 w-full bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Page Component
// =============================================================================

export default async function VipLoadoutPage({ params }: VipLoadoutPageProps) {
  const { slug, loadoutSlug } = await params;
  const supabase = await createClient();

  // Verify VIP and loadout exist
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vip, error: vipError } = await (supabase as any)
    .from('vip_accounts')
    .select('id')
    .eq('slug', slug)
    .is('archived_at', null)
    .single();

  if (vipError || !vip) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: loadout, error: loadoutError } = await (supabase as any)
    .from('vip_loadouts')
    .select('id')
    .eq('vip_id', vip.id)
    .eq('slug', loadoutSlug)
    .eq('status', 'published')
    .single();

  if (loadoutError || !loadout) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Suspense fallback={<VipLoadoutSkeleton />}>
        <VipLoadoutContent vipSlug={slug} loadoutSlug={loadoutSlug} />
      </Suspense>
    </div>
  );
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata({ params }: VipLoadoutPageProps) {
  const { slug, loadoutSlug } = await params;
  const t = await getTranslations('vip');
  const supabase = await createClient();

  // Get VIP and loadout for meta
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vip } = await (supabase as any)
    .from('vip_accounts')
    .select('id, name')
    .eq('slug', slug)
    .is('archived_at', null)
    .single();

  if (!vip) {
    return { title: t('loadout.notFound') };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: loadout } = await (supabase as any)
    .from('vip_loadouts')
    .select('name, description')
    .eq('vip_id', vip.id)
    .eq('slug', loadoutSlug)
    .eq('status', 'published')
    .single();

  if (!loadout) {
    return { title: t('loadout.notFound') };
  }

  const title = t('loadout.metaTitle', { loadoutName: loadout.name, vipName: vip.name });
  const description = loadout.description?.substring(0, 160) ||
    t('loadout.metaDescription', { loadoutName: loadout.name, vipName: vip.name });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'GearShack',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}
