/**
 * Merchant Loadout Detail Page
 *
 * Feature: 053-merchant-integration
 * Task: T026
 *
 * Dynamic page for viewing individual merchant loadout details.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { MerchantLoadoutDetailClient } from './MerchantLoadoutDetailClient';

/**
 * Helper to get supabase client with any typing for merchant tables
 * TODO: Remove this after running migrations and regenerating types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getMerchantServerClient(): Promise<any> {
  return createClient();
}

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'MerchantLoadouts' });

  // Fetch loadout for metadata - T093: Enhanced SEO metadata
  const supabase = await getMerchantServerClient();
  const { data: loadout } = await supabase
    .from('merchant_loadouts')
    .select(`
      name,
      description,
      hero_image_url,
      merchant:merchants(business_name, logo_url)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!loadout) {
    return {
      title: t('title'),
    };
  }

  const merchantData = loadout.merchant as { business_name?: string; logo_url?: string } | null;
  const merchantName = merchantData?.business_name;
  const title = `${loadout.name} | ${merchantName || t('title')}`;
  const description = loadout.description || t('pageDescription');
  const imageUrl = loadout.hero_image_url || merchantData?.logo_url;

  return {
    title,
    description,
    // T093: Open Graph metadata
    openGraph: {
      title,
      description,
      type: 'website',
      ...(imageUrl && {
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: loadout.name,
          },
        ],
      }),
    },
    // T093: Twitter Card metadata
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function MerchantLoadoutDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Server-side validation that loadout exists
  const supabase = await getMerchantServerClient();
  const { data: loadout } = await supabase
    .from('merchant_loadouts')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!loadout) {
    notFound();
  }

  return <MerchantLoadoutDetailClient slug={slug} />;
}
