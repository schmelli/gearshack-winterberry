/**
 * Inventory Loading Skeleton
 *
 * Loading state for inventory pages while data loads.
 * Shows search bar skeleton + 3-column grid of gear cards.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function InventoryLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-9 w-40" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      {/* Search bar + filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Gear cards grid (3 columns) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardContent className="space-y-2 pt-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
