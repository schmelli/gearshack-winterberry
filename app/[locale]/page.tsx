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
import { redirect } from 'next/navigation';

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

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Coming Soon mode: always redirect to pre-announcement page
  // To disable: remove this redirect and uncomment the hostname-based logic below
  redirect(`/${locale}/coming-soon`);

  // --- Post-launch logic (currently disabled) ---
  // Check hostname to determine behavior
  // const headersList = await headers();
  // const host = headersList.get('host') || '';
  // const isWww = host.startsWith('www.');

  // If non-www domain (gearshack.app), redirect logged-in users to inventory
  // if (!isWww) {
  //   try {
  //     const supabase = await createClient();
  //     const { data: { user }, error } = await supabase.auth.getUser();
  //     if (error) {
  //       console.error('[Home] Auth check failed:', error.message);
  //     } else if (user) {
  //       redirect('/inventory');
  //     }
  //   } catch (error) {
  //     console.error('[Home] Critical error:', error instanceof Error ? error.message : 'Unknown error');
  //   }
  // }
  // return <LandingPage />;
}
