/**
 * Merchant Loadouts Browse Page
 *
 * Feature: 053-merchant-integration
 * Task: T025
 *
 * Public browsing page for merchant-curated loadouts.
 * Shows featured loadouts carousel and filterable grid.
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MerchantLoadoutsBrowseClient } from './MerchantLoadoutsBrowseClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MerchantLoadouts' });

  const title = t('pageTitle');
  const description = t('pageDescription');

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

export default async function MerchantLoadoutsPage() {
  return <MerchantLoadoutsBrowseClient />;
}
