/**
 * Community Layout
 *
 * Feature: Community Hub Enhancement
 *
 * Shared layout for all community pages:
 * - Board (Bulletin Board)
 * - Shakedowns
 * - VIP Loadouts (Merchant Loadouts)
 * - Marketplace
 *
 * Provides consistent navigation tabs across all community sub-sections.
 */

import { CommunityNavTabs } from '@/components/community/CommunityNavTabs';

interface CommunityLayoutProps {
  children: React.ReactNode;
}

export default function CommunityLayout({ children }: CommunityLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Tabs - sticky below main header */}
      {/* z-40 is correct: tabs appear below main header (z-50) per CLAUDE.md hierarchy */}
      <div className="sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <CommunityNavTabs />
        </div>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
