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

      {/* Main Content Area - Grid aligned with stat tiles */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content - spans 2 columns on desktop */}
          <main className="lg:col-span-2 min-w-0">
            {children}
          </main>

          {/* Sidebar - spans 1 column on desktop, aligns with wiki stat tile */}
          <aside className="w-full">
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
