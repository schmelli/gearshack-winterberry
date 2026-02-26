/**
 * Graph Gardener Admin Page
 *
 * Provides a chat interface to interact with the GearGraph
 * Head Gardener AI for graph maintenance and analysis.
 */

import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GardenerTabs } from './GardenerTabs';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Admin.gardener' });
  return {
    title: t('pageTitle'),
  };
}

export default async function GardenerPage() {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/');
  }

  return <GardenerTabs />;
}
