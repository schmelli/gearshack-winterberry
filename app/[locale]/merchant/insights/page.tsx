/**
 * Merchant Insights Page
 *
 * Feature: 053-merchant-integration
 * Task: T051
 *
 * Page for viewing wishlist demand insights and creating offers.
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MerchantInsightsClient } from './MerchantInsightsClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MerchantInsights' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default function MerchantInsightsPage() {
  return <MerchantInsightsClient />;
}
