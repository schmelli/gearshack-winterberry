/**
 * Gear Detail Modal Component
 *
 * Feature: 045-gear-detail-modal
 * Task: T015
 *
 * Responsive modal wrapper that renders as:
 * - Dialog on desktop (>= 768px)
 * - Sheet on mobile (< 768px)
 *
 * Stateless - receives all data via props.
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { GearDetailContent } from '@/components/gear-detail/GearDetailContent';
import type { GearItem } from '@/types/gear';
import type { YouTubeVideo } from '@/types/youtube';
import type { GearInsight } from '@/types/geargraph';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

// =============================================================================
// Types
// =============================================================================

interface GearDetailModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** The gear item to display (null if loading or not found) */
  item: GearItem | null;
  /** Whether the viewport is mobile */
  isMobile: boolean;
  /** YouTube videos (null = loading) */
  youtubeVideos?: YouTubeVideo[] | null;
  /** Whether YouTube is loading */
  youtubeLoading?: boolean;
  /** YouTube error message */
  youtubeError?: string | null;
  /** Callback to retry YouTube fetch */
  onRetryYouTube?: () => void;
  /** GearGraph insights (null = loading) */
  insights?: GearInsight[] | null;
  /** Whether insights are loading */
  insightsLoading?: boolean;
  /** Insights error message */
  insightsError?: string | null;
  /** User ID for insight feedback */
  userId?: string;
  /** Callback when insight is dismissed */
  onInsightDismissed?: (insight: GearInsight) => void;
}

// =============================================================================
// Component
// =============================================================================

export function GearDetailModal({
  open,
  onOpenChange,
  item,
  isMobile,
  youtubeVideos = null,
  youtubeLoading = false,
  youtubeError = null,
  onRetryYouTube,
  insights = null,
  insightsLoading = false,
  insightsError = null,
  userId,
  onInsightDismissed,
}: GearDetailModalProps) {
  // Don't render if no item
  if (!item) {
    return null;
  }

  // Shared content for both Dialog and Sheet
  const content = (
    <GearDetailContent
      item={item}
      youtubeVideos={youtubeVideos}
      youtubeLoading={youtubeLoading}
      youtubeError={youtubeError}
      onRetryYouTube={onRetryYouTube}
      insights={insights}
      insightsLoading={insightsLoading}
      insightsError={insightsError}
      userId={userId}
      onEditClick={() => onOpenChange(false)}
      onInsightDismissed={onInsightDismissed}
    />
  );

  // Mobile: Full-screen sheet from bottom
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          <VisuallyHidden>
            <SheetTitle>{item.name}</SheetTitle>
          </VisuallyHidden>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Centered dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>{item.name}</DialogTitle>
        </VisuallyHidden>
        {content}
      </DialogContent>
    </Dialog>
  );
}

export default GearDetailModal;
