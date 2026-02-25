/**
 * Merchant Offers List Page
 *
 * Feature: 053-merchant-integration
 * Task: T052
 *
 * Page for listing and managing merchant offers.
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MerchantOffersListClient } from './MerchantOffersListClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MerchantOffers' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default function MerchantOffersPage() {
  return <MerchantOffersListClient />;
}
