/**
 * Edit Merchant Loadout Page
 *
 * Feature: 053-merchant-integration
 * Task: T042
 *
 * Page for editing an existing merchant loadout via wizard.
 */

import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EditLoadoutClient } from './EditLoadoutClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MerchantLoadouts.wizard' });

  return {
    title: t('editTitle'),
  };
}

interface EditLoadoutPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLoadoutPage({ params }: EditLoadoutPageProps) {
  const { id } = await params;
  return <EditLoadoutClient loadoutId={id} />;
}
