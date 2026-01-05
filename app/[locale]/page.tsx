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

import { LandingPage } from '@/components/landing/LandingPage';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  // Check hostname to determine behavior
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isWww = host.startsWith('www.');

  // If non-www domain (gearshack.app), redirect logged-in users to inventory
  if (!isWww) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      redirect('/inventory');
    }
  }

  // Show landing page for:
  // - www.gearshack.app (always)
  // - gearshack.app (only if not logged in)
  return <LandingPage />;
}
