/**
 * Wiki Management Admin Page
 *
 * Feature: Admin Section Enhancement
 *
 * Provides wiki analytics and AI-powered article generation.
 */

import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WikiManagementContent } from './WikiManagementContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Admin.wiki' });
  return {
    title: t('pageTitle'),
  };
}

export default async function WikiManagementPage() {
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

  return <WikiManagementContent />;
}
