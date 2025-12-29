/**
 * Merchant Loadouts List Page
 *
 * Feature: 053-merchant-integration
 * Task: T040
 *
 * List of all loadouts for the current merchant.
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MerchantLoadoutsListClient } from './MerchantLoadoutsListClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MerchantLoadouts' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default function MerchantLoadoutsListPage() {
  return <MerchantLoadoutsListClient />;
}
