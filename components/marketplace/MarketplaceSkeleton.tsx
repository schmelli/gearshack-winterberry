/**
 * Marketplace Loading Skeleton
 *
 * Feature: 056-community-hub-enhancements
 * Task: T018
 *
 * Displays a grid of skeleton cards while marketplace data loads.
 */

'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { MARKETPLACE_CONSTANTS } from '@/types/marketplace';

interface MarketplaceSkeletonProps {
  count?: number;
}

export function MarketplaceSkeleton({
  count = MARKETPLACE_CONSTANTS.ITEMS_PER_PAGE,
}: MarketplaceSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          {/* Image skeleton */}
          <Skeleton className="aspect-square w-full" />

          <CardContent className="space-y-3 p-4">
            {/* Title */}
            <Skeleton className="h-5 w-3/4" />

            {/* Brand */}
            <Skeleton className="h-4 w-1/2" />

            {/* Price and condition row */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>

            {/* Seller info */}
            <div className="flex items-center gap-2 pt-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Message button */}
            <Skeleton className="mt-2 h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
