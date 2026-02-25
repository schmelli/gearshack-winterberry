/**
 * Messages Loading Skeleton
 *
 * Loading state for messages pages while data loads.
 * Shows conversation list sidebar + message area.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function MessagesLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-lg border">
      {/* Conversation list sidebar */}
      <div className="w-80 shrink-0 border-r p-4">
        {/* Search bar */}
        <Skeleton className="mb-4 h-10 w-full rounded-md" />

        {/* Conversation items */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-md p-2">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* Message area */}
      <div className="flex flex-1 flex-col">
        {/* Message header */}
        <div className="flex items-center gap-3 border-b p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
            >
              <Card className="max-w-[60%] p-3">
                <Skeleton className="mb-1 h-4 w-48" />
                <Skeleton className="h-3 w-16" />
              </Card>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="flex items-center gap-2 border-t p-4">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>
    </div>
  );
}
