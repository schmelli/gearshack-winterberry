/**
 * CommunityHub Component
 *
 * Feature: Community Hub Enhancement
 *
 * Main layout wrapper for the Community Bulletin Board page:
 * - Announcements banner at top
 * - Two-column layout: Main content (2/3) + Sidebar (1/3)
 * - Responsive: single column on mobile
 *
 * Note: Navigation tabs are now in the shared community layout (layout.tsx)
 */

'use client';

import { AnnouncementsBanner } from '@/components/community/AnnouncementsBanner';
import { BannerCarousel } from '@/components/community/BannerCarousel';
import { CommunitySidebar } from '@/components/community/CommunitySidebar';
import { DashboardSummaryCards } from '@/components/community/DashboardSummaryCards';
import type { CommunityHubProps } from '@/types/community';

interface CommunityHubLayoutProps extends CommunityHubProps {
  children: React.ReactNode;
}

export function CommunityHub({
  children,
  initialAnnouncements,
}: CommunityHubLayoutProps) {
  return (
    <>
      {/* Banner Carousel */}
      <div className="container mx-auto px-4 pt-4">
        <BannerCarousel />
      </div>

      {/* Announcements Banner */}
      <div className="container mx-auto px-4 pt-2">
        <AnnouncementsBanner announcements={initialAnnouncements} />
      </div>

      {/* Dashboard Summary Cards */}
      <div className="container mx-auto px-4 pt-4">
        <DashboardSummaryCards />
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
    </>
  );
}

export default CommunityHub;
