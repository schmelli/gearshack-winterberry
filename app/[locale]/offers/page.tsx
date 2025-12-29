/**
 * User Offers Page
 *
 * Feature: 053-merchant-integration
 * Task: T061
 *
 * Page for users to view and respond to merchant offers.
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { UserOffersClient } from './UserOffersClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'UserOffers' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default function UserOffersPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <UserOffersClient />
    </div>
  );
}
