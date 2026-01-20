/**
 * Admin Hooks Index
 *
 * Re-exports all admin-related hooks for convenient importing.
 */

// User Management
export { useAdminUsers } from './useAdminUsers';

// Wiki Management
export { useWikiAdmin } from './useWikiAdmin';
export { useWikiGenerator } from './useWikiGenerator';

// Dashboard
export { useAdminDashboard } from './useAdminDashboard';

// Merchant Management
export {
  useAdminMerchants,
  type MerchantWithUser,
  type AdminMerchantFilters,
  type AdminMerchantPagination,
  type UseAdminMerchantsReturn,
} from './useAdminMerchants';

// Gardener Chat (GearGraph AI)
export { useGardenerChat } from './useGardenerChat';

// Gardener Review Queue
export { useGardenerReview } from './useGardenerReview';

// Feature Flags Management
export { useAdminFeatureFlags } from './useAdminFeatureFlags';
