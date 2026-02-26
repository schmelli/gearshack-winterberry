/**
 * ReviewQueueHeader Component
 *
 * Extracted from ReviewQueue.tsx
 * Displays the queue title, item count badge, and refresh button.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ReviewQueueHeaderProps {
  /** Total number of items in the review queue */
  total: number;
  /** Whether the queue is currently loading */
  isLoading: boolean;
  /** Callback to refresh the queue */
  onRefresh: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function ReviewQueueHeader({
  total,
  isLoading,
  onRefresh,
}: ReviewQueueHeaderProps) {
  const t = useTranslations('Admin.gardener.review');

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <Badge variant="secondary" className="text-sm">
          {total.toLocaleString()} {t('itemsRemaining')}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          title={t('refresh')}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
