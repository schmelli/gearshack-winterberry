/**
 * Shared icon map for swipe actions.
 *
 * Used by both SwipeableCard (action panels) and SwipeActionSelector (settings UI)
 * to avoid icon definition duplication.
 */

import { X, Shirt, Apple, Copy, Eye } from 'lucide-react';
import type { SwipeAction } from '@/types/settings';

/** Standard-size icons for action panels (swipeable card reveals) */
export const SWIPE_ACTION_ICONS: Record<SwipeAction, React.ReactNode> = {
  remove: <X className="h-5 w-5" aria-hidden="true" />,
  toggleWorn: <Shirt className="h-5 w-5" aria-hidden="true" />,
  toggleConsumable: <Apple className="h-5 w-5" aria-hidden="true" />,
  duplicate: <Copy className="h-5 w-5" aria-hidden="true" />,
  viewDetails: <Eye className="h-5 w-5" aria-hidden="true" />,
  none: null,
};

/** Compact icons for settings dropdowns */
export const SWIPE_ACTION_ICONS_SM: Record<SwipeAction, React.ReactNode> = {
  remove: <X className="h-4 w-4" />,
  toggleWorn: <Shirt className="h-4 w-4" />,
  toggleConsumable: <Apple className="h-4 w-4" />,
  duplicate: <Copy className="h-4 w-4" />,
  viewDetails: <Eye className="h-4 w-4" />,
  none: null,
};
