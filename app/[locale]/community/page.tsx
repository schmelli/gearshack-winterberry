/**
 * Community Hub Page
 *
 * Feature: Community Hub Enhancement
 *
 * Main community page with:
 * - Announcements banner
 * - Navigation tabs (Board, Shakedowns, VIP Loadouts, Marketplace)
 * - Bulletin board as main content
 * - Sidebar with friends, wishlist offers, and activity feed
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { CommunityHub } from '@/components/community/CommunityHub';
import { BulletinBoard } from '@/components/bulletin/BulletinBoard';
import { fetchActiveAnnouncements } from '@/lib/server/announcements';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Community.meta');

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

export default async function CommunityPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch announcements on the server
  const announcements = await fetchActiveAnnouncements();

  return (
    <CommunityHub initialAnnouncements={announcements}>
      <BulletinBoard />
    </CommunityHub>
  );
}
