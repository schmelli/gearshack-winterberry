/**
 * Offers Hooks Index
 *
 * Feature: 053-merchant-integration
 *
 * Re-exports all offer-related hooks for convenient importing.
 */

export { useUserOffers, type UseUserOffersReturn } from './useUserOffers';
export {
  useOfferBlocking,
  type BlockedMerchant,
  type UseOfferBlockingReturn,
} from './useOfferBlocking';
