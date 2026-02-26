/**
 * Settings Loading Skeleton
 *
 * Loading state for settings pages while data loads.
 * Shows settings form skeleton with labeled inputs.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function SettingsLoading() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="mb-2 h-9 w-32" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Settings sections */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, sectionIdx) => (
          <Card key={sectionIdx}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
              {Array.from({ length: 3 }).map((_, fieldIdx) => (
                <div key={fieldIdx} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Save button */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}
