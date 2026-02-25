/**
 * Merchant Analytics Page
 *
 * Feature: 053-merchant-integration
 * Task: T070
 *
 * Page for merchants to view conversion analytics and performance metrics.
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MerchantAnalyticsClient } from './MerchantAnalyticsClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MerchantAnalytics' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default function MerchantAnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <MerchantAnalyticsClient />
    </div>
  );
}
