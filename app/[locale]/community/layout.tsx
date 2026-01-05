/**
 * Community Layout
 *
 * Feature: Community Hub Enhancement
 *
 * Shared layout for all community pages:
 * - Dashboard (Bulletin Board)
 * - Shakedowns
 * - VIP Loadouts (Merchant Loadouts)
 * - Marketplace
 * - Wiki
 *
 * Community Section Restructure:
 * - Navigation tabs removed - navigation now handled by header dropdown menu
 * - Provides consistent styling and global modals for community sub-sections
 */

import { VipProfileModal } from '@/components/vip/VipProfileModal';

interface CommunityLayoutProps {
  children: React.ReactNode;
}

export default function CommunityLayout({ children }: CommunityLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Page Content */}
      {children}

      {/* VIP Profile Modal - rendered globally for community pages */}
      <VipProfileModal />
    </div>
  );
}
