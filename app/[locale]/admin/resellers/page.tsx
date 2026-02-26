/**
 * Admin Resellers Page
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Admin page for managing reseller catalog
 */

import { getTranslations } from 'next-intl/server';
import { AdminResellersClient } from './AdminResellersClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AdminResellers' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default function AdminResellersPage() {
  return <AdminResellersClient />;
}
