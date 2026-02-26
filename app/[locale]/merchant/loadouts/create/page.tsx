/**
 * Create Merchant Loadout Page
 *
 * Feature: 053-merchant-integration
 * Task: T041
 *
 * Page for creating a new merchant loadout via wizard.
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CreateLoadoutClient } from './CreateLoadoutClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MerchantLoadouts.wizard' });

  return {
    title: t('createTitle'),
  };
}

export default function CreateLoadoutPage() {
  return <CreateLoadoutClient />;
}
