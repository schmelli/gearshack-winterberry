/**
 * SwipeableCard Component
 *
 * Stateless wrapper that renders action panels behind a card and translates
 * the card content based on swipe gesture offset. Follows iOS Mail-style
 * swipe-to-reveal pattern.
 *
 * The component is purely presentational — all gesture logic and action
 * resolution lives in useSwipeGesture and useSwipeActions hooks.
 */

'use client';

import { X, Shirt, Apple, Copy, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SwipeAction } from '@/types/settings';
import type { SwipeActionDisplay } from '@/hooks/useSwipeActions';

// =============================================================================
// Types
// =============================================================================

interface SwipeableCardProps {
  children: React.ReactNode;
  /** Current swipe offset from useSwipeGesture */
  offsetX: number;
  /** Whether the card should animate transitions */
  shouldAnimate: boolean;
  /** Whether primary threshold is reached */
  primaryReached: boolean;
  /** Whether secondary threshold is reached */
  secondaryReached: boolean;
  /** Touch event handlers from useSwipeGesture */
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  /** Actions revealed on left swipe (shown on right side) */
  leftActions: SwipeActionDisplay[];
  /** Actions revealed on right swipe (shown on left side) */
  rightActions: SwipeActionDisplay[];
}

// =============================================================================
// Icon Map
// =============================================================================

const ACTION_ICONS: Record<SwipeAction, React.ReactNode> = {
  remove: <X className="h-5 w-5" aria-hidden="true" />,
  toggleWorn: <Shirt className="h-5 w-5" aria-hidden="true" />,
  toggleConsumable: <Apple className="h-5 w-5" aria-hidden="true" />,
  duplicate: <Copy className="h-5 w-5" aria-hidden="true" />,
  viewDetails: <Eye className="h-5 w-5" aria-hidden="true" />,
  none: null,
};

// =============================================================================
// Sub-Component: Action Panel
// =============================================================================

interface ActionPanelProps {
  actions: SwipeActionDisplay[];
  absOffset: number;
  primaryReached: boolean;
  secondaryReached: boolean;
}

function ActionPanel({ actions, absOffset, primaryReached, secondaryReached }: ActionPanelProps) {
  return (
    <>
      {actions.map((action, index) => {
        const isActive =
          action.isPrimary
            ? primaryReached && !secondaryReached
            : secondaryReached;

        return (
          <div
            key={`${action.action}-${index}`}
            role="img"
            aria-label={action.label}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 px-3',
              action.bgColor,
              action.textColor,
              isActive && 'brightness-110',
              !action.isAvailable && 'opacity-40'
            )}
          >
            {absOffset > 40 && (
              <>
                {ACTION_ICONS[action.action]}
                {absOffset > 70 && (
                  <span className="text-[10px] font-medium leading-tight">
                    {action.label}
                  </span>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

// =============================================================================
// Component
// =============================================================================

export function SwipeableCard({
  children,
  offsetX,
  shouldAnimate,
  primaryReached,
  secondaryReached,
  touchHandlers,
  leftActions,
  rightActions,
}: SwipeableCardProps) {
  const isSwipingLeft = offsetX < 0;
  const isSwipingRight = offsetX > 0;
  const absOffset = Math.abs(offsetX);

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Right-side action panel (revealed on left swipe) */}
      {leftActions.length > 0 && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-stretch',
            !isSwipingLeft && absOffset === 0 && 'hidden'
          )}
          style={{ width: `${absOffset}px` }}
        >
          <ActionPanel
            actions={leftActions}
            absOffset={absOffset}
            primaryReached={primaryReached}
            secondaryReached={secondaryReached}
          />
        </div>
      )}

      {/* Left-side action panel (revealed on right swipe) */}
      {rightActions.length > 0 && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-stretch',
            !isSwipingRight && absOffset === 0 && 'hidden'
          )}
          style={{ width: `${absOffset}px` }}
        >
          <ActionPanel
            actions={rightActions}
            absOffset={absOffset}
            primaryReached={primaryReached}
            secondaryReached={secondaryReached}
          />
        </div>
      )}

      {/* Card content — translated by swipe offset */}
      {/* touch-action: pan-y allows vertical scrolling but lets JS handle horizontal */}
      <div
        {...touchHandlers}
        className={cn(shouldAnimate && 'transition-transform duration-300 ease-out')}
        style={{ transform: `translateX(${offsetX}px)`, touchAction: 'pan-y' }}
      >
        {children}
      </div>
    </div>
  );
}
