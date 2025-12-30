/**
 * Merchant Dashboard Page
 *
 * Feature: 053-merchant-integration
 * Task: T039
 *
 * Main dashboard for merchant portal.
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MerchantDashboardClient } from './MerchantDashboardClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MerchantDashboard' });

  return {
    title: t('welcome', { name: 'Merchant' }),
    description: t('subtitle'),
  };
}

export default function MerchantDashboardPage() {
  return <MerchantDashboardClient />;
}
