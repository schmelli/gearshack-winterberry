/**
 * CommunityHub Component
 *
 * Feature: Community Hub Enhancement
 *
 * Main layout wrapper for the Community page:
 * - Announcements banner at top
 * - Navigation tabs (Board, Shakedowns, VIP Loadouts, Marketplace)
 * - Two-column layout: Main content (2/3) + Sidebar (1/3)
 * - Responsive: single column on mobile
 */

'use client';

import { cn } from '@/lib/utils';
import { AnnouncementsBanner } from '@/components/community/AnnouncementsBanner';
import { CommunityNavTabs } from '@/components/community/CommunityNavTabs';
import { CommunitySidebar } from '@/components/community/CommunitySidebar';
import type { CommunityHubProps, CommunityAnnouncement } from '@/types/community';

interface CommunityHubLayoutProps extends CommunityHubProps {
  children: React.ReactNode;
}

export function CommunityHub({
  children,
  initialAnnouncements,
}: CommunityHubLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Announcements Banner */}
      <div className="container mx-auto px-4 pt-4">
        <AnnouncementsBanner announcements={initialAnnouncements} />
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-40 mt-4">
        <div className="container mx-auto px-4">
          <CommunityNavTabs />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content - 2/3 on desktop */}
          <main className="flex-1 min-w-0 lg:max-w-[66.666%]">
            {children}
          </main>

          {/* Sidebar - 1/3 on desktop, below content on mobile */}
          <aside className="w-full lg:w-[320px] lg:flex-shrink-0">
            {/* On mobile, show sidebar panels at bottom */}
            <div className="lg:sticky lg:top-20">
              <CommunitySidebar collapsedOnMobile />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to fetch announcements on the server side
 * Note: Uses type casting as community_announcements table is new
 */
export async function fetchAnnouncementsServer(): Promise<CommunityAnnouncement[]> {
  // This will be called from the server component
  // Import dynamically to avoid client-side bundle issues
  const { createClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;

  const { data, error } = await supabase
    .from('community_announcements')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch announcements:', error);
    return [];
  }

  return (data ?? []) as CommunityAnnouncement[];
}

export default CommunityHub;
