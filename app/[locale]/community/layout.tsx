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
 *
 * Feature: Admin Feature Activation
 * - Uses FeatureGate to protect community pages based on feature flags
 */

import { Suspense } from 'react';
import { VipProfileModal } from '@/components/vip/VipProfileModal';
import { FeatureGate } from '@/components/feature-flags/FeatureGate';
import { Skeleton } from '@/components/ui/skeleton';

interface CommunityLayoutProps {
  children: React.ReactNode;
}

export default function CommunityLayout({ children }: CommunityLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Feature Gate: Protect community pages */}
      <FeatureGate featureKey="community">
        {/* Page Content */}
        <Suspense fallback={
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="mb-4 h-8 w-48" />
            <Skeleton className="mb-3 h-4 w-72" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        }>
          {children}
        </Suspense>

        {/* VIP Profile Modal - rendered globally for community pages */}
        <VipProfileModal />
      </FeatureGate>
    </div>
  );
}
