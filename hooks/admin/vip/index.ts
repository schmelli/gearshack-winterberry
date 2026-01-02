/**
 * Admin VIP Hooks Index
 *
 * Feature: 052-vip-loadouts
 *
 * Barrel exports for admin VIP-related hooks.
 */

export { useVipClaimInvitation, getInvitationStatusDisplay, canRevokeInvitation, canResendInvitation } from './useVipClaimInvitation';
export { useVipLoadoutsAdmin } from './useVipLoadoutsAdmin';
export { useLoadoutItemsAdmin } from './useLoadoutItemsAdmin';
export type { CreateItemData } from './useLoadoutItemsAdmin';
