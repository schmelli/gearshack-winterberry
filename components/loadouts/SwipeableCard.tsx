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

import { cn } from '@/lib/utils';
import { SWIPE_ACTION_ICONS } from '@/lib/swipe-action-icons';
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
// Constants
// =============================================================================

/** Minimum swipe offset before showing the action icon */
const ICON_REVEAL_THRESHOLD = 40;
/** Minimum swipe offset before showing the action label */
const LABEL_REVEAL_THRESHOLD = 70;

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
            role="presentation"
            aria-hidden="true"
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 px-3',
              action.bgColor,
              action.textColor,
              isActive && 'brightness-110',
              !action.isAvailable && 'opacity-40'
            )}
          >
            {absOffset > ICON_REVEAL_THRESHOLD && (
              <>
                {SWIPE_ACTION_ICONS[action.action]}
                {absOffset > LABEL_REVEAL_THRESHOLD && (
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
            !isSwipingLeft && 'hidden'
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
            !isSwipingRight && 'hidden'
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
