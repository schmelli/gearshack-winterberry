/**
 * Admin Merchants Page
 *
 * Feature: 053-merchant-integration
 * Task: T084
 *
 * Admin page for reviewing and managing merchant applications.
 */

import { getTranslations } from 'next-intl/server';
import { AdminMerchantsClient } from './AdminMerchantsClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AdminMerchants' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default function AdminMerchantsPage() {
  return <AdminMerchantsClient />;
}
