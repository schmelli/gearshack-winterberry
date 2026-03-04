/**
 * useSwipeGesture Hook
 *
 * Custom touch gesture detection for horizontal swipe-to-reveal actions.
 * Follows the same touch handling pattern as MobileBottomSheet.tsx.
 *
 * Features:
 * - Horizontal swipe detection with vertical scroll conflict prevention
 * - Primary/secondary action thresholds (short vs long swipe)
 * - Velocity-based action triggering (fast flick = primary action)
 * - Rubber-band damping past max distance
 * - Respects reduceAnimations preference
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export type SwipeDirection = 'left' | 'right' | null;
export type SwipePhase = 'idle' | 'detecting' | 'swiping' | 'settling';

export interface SwipeState {
  /** Current horizontal offset in pixels (negative = left, positive = right) */
  offsetX: number;
  /** Direction of current swipe */
  direction: SwipeDirection;
  /** Current phase of the swipe interaction */
  phase: SwipePhase;
  /** Whether the primary action threshold is reached */
  primaryReached: boolean;
  /** Whether the secondary action threshold is reached */
  secondaryReached: boolean;
}

interface UseSwipeGestureOptions {
  /** Minimum horizontal movement to confirm horizontal swipe intent (default: 10px) */
  directionThreshold?: number;
  /** Distance to reveal primary action (default: 80px) */
  primaryDistance?: number;
  /** Distance to reveal secondary action (default: 160px) */
  secondaryDistance?: number;
  /** Maximum swipe distance (default: 200px) */
  maxDistance?: number;
  /** Whether swipe is enabled */
  enabled?: boolean;
  /** Whether to use instant transitions (reduceAnimations) */
  reduceAnimations?: boolean;
  /** Called when primary action threshold is crossed on release */
  onPrimaryAction?: (direction: 'left' | 'right') => void;
  /** Called when secondary action threshold is crossed on release */
  onSecondaryAction?: (direction: 'left' | 'right') => void;
}

export interface UseSwipeGestureReturn {
  state: SwipeState;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  /** Whether the card should animate transitions (false during active swiping) */
  shouldAnimate: boolean;
  /** Reset swipe state to idle */
  reset: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_DIRECTION_THRESHOLD = 10;
const DEFAULT_PRIMARY_DISTANCE = 80;
const DEFAULT_SECONDARY_DISTANCE = 160;
const DEFAULT_MAX_DISTANCE = 200;
const VELOCITY_THRESHOLD = 500; // px/s - fast flick triggers primary action
const RUBBER_BAND_FACTOR = 0.3; // Resistance when past max distance

// =============================================================================
// Hook
// =============================================================================

const INITIAL_STATE: SwipeState = {
  offsetX: 0,
  direction: null,
  phase: 'idle',
  primaryReached: false,
  secondaryReached: false,
};

export function useSwipeGesture(options: UseSwipeGestureOptions = {}): UseSwipeGestureReturn {
  const {
    directionThreshold = DEFAULT_DIRECTION_THRESHOLD,
    primaryDistance = DEFAULT_PRIMARY_DISTANCE,
    secondaryDistance = DEFAULT_SECONDARY_DISTANCE,
    maxDistance = DEFAULT_MAX_DISTANCE,
    enabled = true,
    reduceAnimations = false,
    onPrimaryAction,
    onSecondaryAction,
  } = options;

  const [state, setState] = useState<SwipeState>(INITIAL_STATE);

  const touchStartRef = useRef<{ x: number; y: number; time: number }>({
    x: 0,
    y: 0,
    time: 0,
  });
  // Track whether we've determined swipe direction (horizontal vs vertical)
  const directionLockedRef = useRef(false);
  const isHorizontalRef = useRef(false);
  // Track settle timeout to clear on unmount
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    directionLockedRef.current = false;
    isHorizontalRef.current = false;
  }, []);

  const applyRubberBand = useCallback(
    (offset: number): number => {
      const absOffset = Math.abs(offset);
      if (absOffset <= maxDistance) return offset;
      const overflow = absOffset - maxDistance;
      const dampened = maxDistance + overflow * RUBBER_BAND_FACTOR;
      return offset > 0 ? dampened : -dampened;
    },
    [maxDistance]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;

      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      directionLockedRef.current = false;
      isHorizontalRef.current = false;

      setState((prev) => ({
        ...prev,
        phase: 'detecting',
      }));
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || state.phase === 'idle' || state.phase === 'settling') return;

      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartRef.current.y;

      // Direction lock: determine horizontal vs vertical intent
      if (!directionLockedRef.current) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Wait until we've moved enough to determine direction
        if (absDeltaX < directionThreshold && absDeltaY < directionThreshold) {
          return;
        }

        directionLockedRef.current = true;

        if (absDeltaY > absDeltaX) {
          // Vertical scroll intent - abort swipe and let ScrollArea handle it
          isHorizontalRef.current = false;
          setState(INITIAL_STATE);
          return;
        }

        isHorizontalRef.current = true;
      }

      if (!isHorizontalRef.current) return;

      // Prevent vertical scroll while swiping horizontally
      e.preventDefault();

      const dampedOffset = applyRubberBand(deltaX);
      const absOffset = Math.abs(dampedOffset);
      const direction: SwipeDirection = dampedOffset < 0 ? 'left' : dampedOffset > 0 ? 'right' : null;

      setState({
        offsetX: dampedOffset,
        direction,
        phase: 'swiping',
        primaryReached: absOffset >= primaryDistance,
        secondaryReached: absOffset >= secondaryDistance,
      });
    },
    [enabled, state.phase, directionThreshold, primaryDistance, secondaryDistance, applyRubberBand]
  );

  const handleTouchEnd = useCallback(() => {
    if (!enabled || state.phase !== 'swiping' || !state.direction) {
      reset();
      return;
    }

    const deltaTime = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(state.offsetX) / (deltaTime / 1000);
    const direction = state.direction;

    // Check if action thresholds were met
    if (state.secondaryReached) {
      // Trigger secondary action
      onSecondaryAction?.(direction);
      // Haptic feedback
      navigator.vibrate?.(10);
    } else if (state.primaryReached || velocity >= VELOCITY_THRESHOLD) {
      // Trigger primary action (either by distance or velocity)
      onPrimaryAction?.(direction);
      // Haptic feedback
      navigator.vibrate?.(10);
    }

    // Settle back to idle
    setState((prev) => ({
      ...prev,
      phase: 'settling',
    }));

    // After animation, reset to idle (clear previous timeout if any)
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
    }
    const settleTime = reduceAnimations ? 0 : 300;
    settleTimeoutRef.current = setTimeout(() => {
      settleTimeoutRef.current = null;
      reset();
    }, settleTime);
  }, [enabled, state, onPrimaryAction, onSecondaryAction, reduceAnimations, reset]);

  const shouldAnimate = state.phase === 'settling' || state.phase === 'idle';

  return {
    state: state.phase === 'settling' ? { ...state, offsetX: 0 } : state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    shouldAnimate: reduceAnimations ? false : shouldAnimate,
    reset,
  };
}
