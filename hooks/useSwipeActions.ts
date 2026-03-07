/**
 * useSwipeActions Hook
 *
 * Maps SwipeActionConfig to actual callbacks and display info for a specific loadout item.
 * Follows Feature-Sliced Light pattern: business logic in hooks, UI receives display data.
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { SwipeAction, SwipeActionConfig } from '@/types/settings';

// =============================================================================
// Types
// =============================================================================

export interface SwipeActionDisplay {
  action: SwipeAction;
  /** i18n translated short label */
  label: string;
  /** Tailwind background color class */
  bgColor: string;
  /** Tailwind text color class */
  textColor: string;
  /** Whether this is the primary (closer) action */
  isPrimary: boolean;
  /** Whether this action is available for the current item */
  isAvailable: boolean;
}

interface UseSwipeActionsOptions {
  config: SwipeActionConfig;
  onRemove: () => void;
  onToggleWorn: () => void;
  onToggleConsumable: () => void;
  onDuplicate?: () => void;
  onViewDetails?: () => void;
}

interface UseSwipeActionsReturn {
  /** Actions revealed on left swipe (shown on right side) */
  leftActions: SwipeActionDisplay[];
  /** Actions revealed on right swipe (shown on left side) */
  rightActions: SwipeActionDisplay[];
  /** Execute the primary action for a given direction */
  handlePrimaryAction: (direction: 'left' | 'right') => void;
  /** Execute the secondary action for a given direction */
  handleSecondaryAction: (direction: 'left' | 'right') => void;
}

// =============================================================================
// Action Style Map
// =============================================================================

const ACTION_STYLES: Record<SwipeAction, { bgColor: string; textColor: string }> = {
  remove: { bgColor: 'bg-destructive', textColor: 'text-destructive-foreground' },
  toggleWorn: { bgColor: 'bg-primary', textColor: 'text-primary-foreground' },
  toggleConsumable: { bgColor: 'bg-amber-600', textColor: 'text-white' },
  duplicate: { bgColor: 'bg-blue-600', textColor: 'text-white' },
  viewDetails: { bgColor: 'bg-muted', textColor: 'text-foreground' },
  none: { bgColor: 'bg-transparent', textColor: 'text-transparent' },
};

// =============================================================================
// Hook
// =============================================================================

export function useSwipeActions(options: UseSwipeActionsOptions): UseSwipeActionsReturn {
  const {
    config,
    onRemove,
    onToggleWorn,
    onToggleConsumable,
    onDuplicate,
    onViewDetails,
  } = options;

  const t = useTranslations('Loadouts.itemActions');

  // Map action types to callbacks
  const callbackMap = useMemo(
    (): Record<SwipeAction, (() => void) | undefined> => ({
      remove: onRemove,
      toggleWorn: onToggleWorn,
      toggleConsumable: onToggleConsumable,
      duplicate: onDuplicate,
      viewDetails: onViewDetails,
      none: undefined,
    }),
    [onRemove, onToggleWorn, onToggleConsumable, onDuplicate, onViewDetails]
  );

  // Map action types to i18n labels
  const labelMap = useMemo(
    (): Record<SwipeAction, string> => ({
      remove: t('swipeRemove'),
      toggleWorn: t('swipeWorn'),
      toggleConsumable: t('swipeConsumable'),
      duplicate: t('swipeDuplicate'),
      viewDetails: t('swipeDetails'),
      none: '',
    }),
    [t]
  );

  // Build display arrays for each side
  const leftActions = useMemo((): SwipeActionDisplay[] => {
    const actions: SwipeActionDisplay[] = [];

    if (config.swipeLeftPrimary !== 'none') {
      const style = ACTION_STYLES[config.swipeLeftPrimary];
      actions.push({
        action: config.swipeLeftPrimary,
        label: labelMap[config.swipeLeftPrimary],
        bgColor: style.bgColor,
        textColor: style.textColor,
        isPrimary: true,
        isAvailable: !!callbackMap[config.swipeLeftPrimary],
      });
    }

    if (config.swipeLeftSecondary !== 'none') {
      const style = ACTION_STYLES[config.swipeLeftSecondary];
      actions.push({
        action: config.swipeLeftSecondary,
        label: labelMap[config.swipeLeftSecondary],
        bgColor: style.bgColor,
        textColor: style.textColor,
        isPrimary: false,
        isAvailable: !!callbackMap[config.swipeLeftSecondary],
      });
    }

    return actions;
  }, [config.swipeLeftPrimary, config.swipeLeftSecondary, labelMap, callbackMap]);

  const rightActions = useMemo((): SwipeActionDisplay[] => {
    const actions: SwipeActionDisplay[] = [];

    if (config.swipeRightPrimary !== 'none') {
      const style = ACTION_STYLES[config.swipeRightPrimary];
      actions.push({
        action: config.swipeRightPrimary,
        label: labelMap[config.swipeRightPrimary],
        bgColor: style.bgColor,
        textColor: style.textColor,
        isPrimary: true,
        isAvailable: !!callbackMap[config.swipeRightPrimary],
      });
    }

    if (config.swipeRightSecondary !== 'none') {
      const style = ACTION_STYLES[config.swipeRightSecondary];
      actions.push({
        action: config.swipeRightSecondary,
        label: labelMap[config.swipeRightSecondary],
        bgColor: style.bgColor,
        textColor: style.textColor,
        isPrimary: false,
        isAvailable: !!callbackMap[config.swipeRightSecondary],
      });
    }

    return actions;
  }, [config.swipeRightPrimary, config.swipeRightSecondary, labelMap, callbackMap]);

  const handlePrimaryAction = useCallback(
    (direction: 'left' | 'right') => {
      const action = direction === 'left' ? config.swipeLeftPrimary : config.swipeRightPrimary;
      callbackMap[action]?.();
    },
    [config.swipeLeftPrimary, config.swipeRightPrimary, callbackMap]
  );

  const handleSecondaryAction = useCallback(
    (direction: 'left' | 'right') => {
      const action = direction === 'left' ? config.swipeLeftSecondary : config.swipeRightSecondary;
      callbackMap[action]?.();
    },
    [config.swipeLeftSecondary, config.swipeRightSecondary, callbackMap]
  );

  return {
    leftActions,
    rightActions,
    handlePrimaryAction,
    handleSecondaryAction,
  };
}
