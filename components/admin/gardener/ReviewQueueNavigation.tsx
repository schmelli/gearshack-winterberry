/**
 * ReviewQueueNavigation Component
 *
 * Extracted from ReviewQueue.tsx
 * Provides pagination controls: first, previous, position display, jump-to, next, last.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ReviewQueueNavigationProps {
  /** Current position in the queue (0-indexed) */
  position: number;
  /** Total number of items */
  total: number;
  /** Whether an operation is processing (disables navigation) */
  isProcessing: boolean;
  /** Navigate to the first item */
  onGoToFirst: () => void;
  /** Navigate to the previous item */
  onGoToPrevious: () => void;
  /** Navigate to the next item */
  onGoToNext: () => void;
  /** Navigate to the last item */
  onGoToLast: () => void;
  /** Navigate to a specific position (0-indexed) */
  onGoToPosition: (position: number) => void;
}

// =============================================================================
// Component
// =============================================================================

export function ReviewQueueNavigation({
  position,
  total,
  isProcessing,
  onGoToFirst,
  onGoToPrevious,
  onGoToNext,
  onGoToLast,
  onGoToPosition,
}: ReviewQueueNavigationProps) {
  const t = useTranslations('Admin.gardener.review');
  const [jumpToPosition, setJumpToPosition] = useState('');

  const handleJumpTo = () => {
    const pos = parseInt(jumpToPosition, 10);
    if (Number.isFinite(pos) && pos >= 1 && pos <= total) {
      onGoToPosition(pos - 1); // Convert to 0-indexed
      setJumpToPosition('');
    }
  };

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onGoToFirst}
              disabled={position === 0 || isProcessing}
              title={t('goToFirst')}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onGoToPrevious}
              disabled={position === 0 || isProcessing}
              title={t('previous')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {t('position', { current: position + 1, total })}
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={total}
                value={jumpToPosition}
                onChange={(e) => setJumpToPosition(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJumpTo()}
                placeholder={t('jumpTo')}
                className="w-20 text-center"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleJumpTo}
                disabled={!jumpToPosition}
              >
                {t('go')}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onGoToNext}
              disabled={position >= total - 1 || isProcessing}
              title={t('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onGoToLast}
              disabled={position >= total - 1 || isProcessing}
              title={t('goToLast')}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
