/**
 * Merchant Billing Page
 *
 * Feature: 053-merchant-integration
 * Task: T071
 *
 * Page for merchants to view billing history and manage payments.
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MerchantBillingClient } from './MerchantBillingClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MerchantBilling' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default function MerchantBillingPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <MerchantBillingClient />
    </div>
  );
}
