'use client';

/**
 * Post Skeleton Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T047
 *
 * Loading skeleton for bulletin board posts.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PostSkeletonProps {
  count?: number;
}

export function PostSkeleton({ count = 3 }: PostSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="py-4">
            {/* Header: Avatar + Author info */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>

            {/* Tag badge */}
            <div className="mt-3">
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>

            {/* Content lines */}
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>

            {/* Footer: Reply count */}
            <div className="mt-4">
              <Skeleton className="h-8 w-24 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
