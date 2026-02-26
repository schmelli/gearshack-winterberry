/**
 * Merchant Settings Page
 *
 * Feature: 053-merchant-integration
 * Task: T044
 *
 * Settings page for merchant profile and store locations.
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MerchantSettingsClient } from './MerchantSettingsClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MerchantSettings' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default function MerchantSettingsPage() {
  return <MerchantSettingsClient />;
}
