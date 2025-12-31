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

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CommunityHub, fetchAnnouncementsServer } from '@/components/community/CommunityHub';
import { BulletinBoard } from '@/components/bulletin/BulletinBoard';

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
  const announcements = await fetchAnnouncementsServer();

  return (
    <CommunityHub initialAnnouncements={announcements}>
      <BulletinBoard />
    </CommunityHub>
  );
}
