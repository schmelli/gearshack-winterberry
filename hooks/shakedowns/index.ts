/**
 * Community Shakedowns Hooks
 *
 * Feature: 001-community-shakedowns
 * Task: T013
 *
 * Re-exports all shakedown-related hooks for clean imports.
 * Hooks are added as they are implemented in subsequent tasks.
 */

// Mutations (T017)
export {
  useShakedownMutations,
  createOptimisticShakedown,
  replaceOptimisticShakedown,
  removeOptimisticShakedown,
} from './useShakedownMutations';

// Feedback (T025)
export {
  useFeedback,
  createOptimisticFeedback,
  replaceOptimisticFeedback,
  removeOptimisticFeedback,
  canEditFeedback,
} from './useFeedback';

// Single shakedown fetch (T024)
export { useShakedown } from './useShakedown';
export type {
  UseShakedownReturn,
  ShakedownFetchError,
  ShakedownErrorType,
  ShakedownGearItem,
} from './useShakedown';

// Feed browsing (T023)
export {
  useShakedowns,
  type SortOption,
  type ShakedownFilters,
  type UseShakedownsReturn,
} from './useShakedowns';

// Helpful votes (T042)
export { useHelpfulVotes } from './useHelpfulVotes';
export type { UseHelpfulVotesReturn } from './useHelpfulVotes';

// Real-time notifications (T048 & T049)
export { useShakedownNotifications } from './useShakedownNotifications';
export type { UseShakedownNotificationsReturn } from './useShakedownNotifications';

// Filter state management (T057)
export {
  useShakedownFilters,
  useFilteredShakedownsUrl,
  useActiveFilterCount,
  useShakedownFiltersForQuery,
} from './useShakedownFilters';
export type {
  SortOption as FilterSortOption,
  SeasonFilter,
  TripTypeFilter,
  ShakedownFilterState,
  ShakedownFilterUrlParams,
} from './useShakedownFilters';

// Bookmarks (T058)
export { useBookmarks } from './useBookmarks';
export type { UseBookmarksReturn, BookmarkedShakedown } from './useBookmarks';

// Badges (T067)
export { useBadges } from './useBadges';
export type { UseBadgesReturn, ShakedownBadgeAward } from './useBadges';
