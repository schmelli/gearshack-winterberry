/**
 * Admin Hooks Index
 *
 * Feature: 053-merchant-integration
 *
 * Re-exports all admin-related hooks for convenient importing.
 */

// Merchant Management (US7)
export {
  useAdminMerchants,
  type MerchantWithUser,
  type AdminMerchantFilters,
  type AdminMerchantPagination,
  type UseAdminMerchantsReturn,
} from './useAdminMerchants';
