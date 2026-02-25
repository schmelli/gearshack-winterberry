/**
 * Merchant Hooks Index
 *
 * Feature: 053-merchant-integration
 *
 * Re-exports all merchant-related hooks for convenient importing.
 */

// Authentication
export {
  useMerchantAuth,
  useMerchantAuthGuard,
  type MerchantAuthStatus,
  type UseMerchantAuthReturn,
} from './useMerchantAuth';

// Profile Management
export {
  useMerchantProfile,
  useMerchantApplicationForm,
  type ProfileOperationStatus,
  type UseMerchantProfileReturn,
} from './useMerchantProfile';

// Catalog Management
export {
  useMerchantCatalog,
  useCatalogItemSearch,
  useCatalogBulkOperations,
  type CatalogFilters,
  type CatalogPagination,
  type CatalogOperationStatus,
  type UseMerchantCatalogReturn,
} from './useMerchantCatalog';

// Public Loadout Browsing
export {
  useMerchantLoadoutsPublic,
  useFeaturedLoadouts,
  useLoadoutDetail,
  useLoadoutFilterOptions,
  type LoadoutBrowseState,
  type UseMerchantLoadoutsPublicReturn,
  type UseFeaturedLoadoutsReturn,
  type UseLoadoutDetailReturn,
} from './useMerchantLoadoutsPublic';

// Loadout Comparison (US6)
export {
  useLoadoutComparison,
  type UseLoadoutComparisonReturn,
} from './useLoadoutComparison';

// Merchant Loadout Management
export {
  useMerchantLoadouts,
  type LoadoutsFilter,
  type UseMerchantLoadoutsReturn,
} from './useMerchantLoadouts';

// Store Locations
export {
  useMerchantLocations,
  type UseMerchantLocationsReturn,
} from './useMerchantLocations';

// Wishlist Insights (US3)
export {
  useWishlistInsights,
  type InsightFilters,
  type UseWishlistInsightsReturn,
} from './useWishlistInsights';

// Merchant Offers (US3)
export {
  useMerchantOffers,
  type UseMerchantOffersReturn,
} from './useMerchantOffers';

// Conversion Tracking (US5)
export {
  useConversionTracking,
  type UseConversionTrackingReturn,
} from './useConversionTracking';

// Merchant Billing (US5)
export {
  useMerchantBilling,
  type UseMerchantBillingReturn,
} from './useMerchantBilling';
