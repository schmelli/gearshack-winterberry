/**
 * Admin Dashboard Page
 *
 * Feature: Admin Section Enhancement
 *
 * Main landing page for admin panel with comprehensive statistics.
 */

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminDashboardContent } from './AdminDashboardContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Admin.dashboard' });

  const title = t('pageTitle');
  const description = t('metaDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Gearshack',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function AdminDashboardPage() {
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

  return <AdminDashboardContent />;
}
