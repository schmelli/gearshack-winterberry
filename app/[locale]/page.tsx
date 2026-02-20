/**
 * Home Page (Landing Page)
 *
 * Feature: 028-landing-page-i18n
 * T016: Render LandingPage component
 * FR-006: Shows "Start Free Trial" for guests (via LandingPage)
 * FR-005: Shows "Go to Dashboard" for authenticated users (via LandingPage)
 *
 * Hostname-based routing:
 * - www.gearshack.app → Always show landing page
 * - gearshack.app → Redirect to inventory if logged in
 */

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LandingPage } from '@/components/landing/LandingPage';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale = 'en' } = await params;
  const t = await getTranslations({ locale, namespace: 'Landing.meta' });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      siteName: 'Gearshack',
    },
    twitter: {
      card: 'summary',
      title: t('title'),
      description: t('description'),
    },
  };
}

export default async function Home() {
  // Check hostname to determine behavior
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isWww = host.startsWith('www.');

  // If non-www domain (gearshack.app), redirect logged-in users to inventory
  if (!isWww) {
    try {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        // Auth check failed - log and continue to show landing page
        console.error('[Home] Auth check failed:', error.message);
      } else if (user) {
        redirect('/inventory');
      }
    } catch (error) {
      // Critical error in Supabase client - log and continue to show landing page
      console.error('[Home] Critical error:', error instanceof Error ? error.message : 'Unknown error');
      // Continue to show landing page as safe fallback
    }
  }

  // Show landing page for:
  // - www.gearshack.app (always)
  // - gearshack.app (only if not logged in)
  return <LandingPage />;
}
