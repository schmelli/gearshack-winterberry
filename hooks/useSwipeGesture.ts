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
const VELOCITY_MIN_DISTANCE = 30; // px - minimum distance before velocity-based triggering applies
// 30% resistance when dragging past maxDistance — gives a "stretchy" feel
const RUBBER_BAND_FACTOR = 0.3;

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
  // Mirror mutable state in refs so high-frequency handlers avoid stale closures.
  // These are updated alongside setState and read in handleTouchMove/handleTouchEnd
  // so the callbacks can remain stable (no `state` in their dependency arrays).
  const phaseRef = useRef<SwipePhase>('idle');
  const offsetXRef = useRef(0);
  const directionRef = useRef<SwipeDirection>(null);
  const primaryReachedRef = useRef(false);
  const secondaryReachedRef = useRef(false);
  // Raw (undamped) horizontal displacement — used for accurate velocity calculation
  const rawDeltaXRef = useRef(0);

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
    phaseRef.current = 'idle';
    offsetXRef.current = 0;
    directionRef.current = null;
    primaryReachedRef.current = false;
    secondaryReachedRef.current = false;
    rawDeltaXRef.current = 0;
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

      phaseRef.current = 'detecting';
      setState((prev) => ({
        ...prev,
        phase: 'detecting',
      }));
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const currentPhase = phaseRef.current;
      if (!enabled || currentPhase === 'idle' || currentPhase === 'settling') return;

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
          phaseRef.current = 'idle';
          setState(INITIAL_STATE);
          return;
        }

        isHorizontalRef.current = true;
      }

      if (!isHorizontalRef.current) return;

      // Note: e.preventDefault() is NOT called here because React 17+ registers
      // touch listeners as passive by default, making preventDefault() a no-op
      // that logs console warnings. The `touch-action: pan-y` CSS on the card
      // content div (in SwipeableCard.tsx) correctly delegates vertical scroll
      // to the browser while JS handles horizontal movement.

      const dampedOffset = applyRubberBand(deltaX);
      const absOffset = Math.abs(dampedOffset);
      const direction: SwipeDirection = dampedOffset < 0 ? 'left' : dampedOffset > 0 ? 'right' : null;
      const primaryHit = absOffset >= primaryDistance;
      const secondaryHit = absOffset >= secondaryDistance;

      // Mirror state in refs for stable handleTouchEnd (avoids `state` dependency)
      phaseRef.current = 'swiping';
      offsetXRef.current = dampedOffset;
      directionRef.current = direction;
      primaryReachedRef.current = primaryHit;
      secondaryReachedRef.current = secondaryHit;
      rawDeltaXRef.current = deltaX;

      setState({
        offsetX: dampedOffset,
        direction,
        phase: 'swiping',
        primaryReached: primaryHit,
        secondaryReached: secondaryHit,
      });
    },
    [enabled, directionThreshold, primaryDistance, secondaryDistance, applyRubberBand]
  );

  const handleTouchEnd = useCallback(() => {
    // Read from refs (not state) to avoid stale closures — handleTouchEnd
    // no longer depends on `state`, so it is not recreated per touchmove pixel.
    const currentPhase = phaseRef.current;
    const direction = directionRef.current;

    if (!enabled || currentPhase !== 'swiping' || !direction) {
      reset();
      return;
    }

    const deltaTime = Date.now() - touchStartRef.current.time;
    // Use raw (undamped) displacement for velocity — damped offset compresses
    // values past maxDistance, which would understate velocity for long swipes.
    const rawAbsDelta = Math.abs(rawDeltaXRef.current);
    const velocity = rawAbsDelta / (deltaTime / 1000);

    // Check if action thresholds were met (read from refs)
    if (secondaryReachedRef.current) {
      // Trigger secondary action
      onSecondaryAction?.(direction);
      // Haptic feedback — navigator.vibrate is not supported on iOS Safari;
      // the optional chaining handles this gracefully (no-op on iPhone).
      navigator.vibrate?.(10);
    } else if (
      primaryReachedRef.current ||
      (velocity >= VELOCITY_THRESHOLD && rawAbsDelta >= VELOCITY_MIN_DISTANCE)
    ) {
      // Trigger primary action (either by distance or by fast flick with minimum travel)
      onPrimaryAction?.(direction);
      navigator.vibrate?.(10);
    }

    // Settle back to idle
    phaseRef.current = 'settling';
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
  }, [enabled, onPrimaryAction, onSecondaryAction, reduceAnimations, reset]);

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
