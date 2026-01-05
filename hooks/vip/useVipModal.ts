/**
 * VIP Modal State Hook (Zustand)
 *
 * Feature: 056-community-hub-enhancements
 * Task: T035
 *
 * Global state for controlling VIP profile modal display.
 * Allows any component to open the modal with a VIP slug.
 */

import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

interface VipModalState {
  isOpen: boolean;
  vipSlug: string | null;
}

interface VipModalActions {
  open: (slug: string) => void;
  close: () => void;
}

type VipModalStore = VipModalState & VipModalActions;

// ============================================================================
// Store
// ============================================================================

export const useVipModal = create<VipModalStore>((set) => ({
  // Initial state
  isOpen: false,
  vipSlug: null,

  // Actions
  open: (slug: string) =>
    set({
      isOpen: true,
      vipSlug: slug,
    }),

  close: () =>
    set({
      isOpen: false,
      vipSlug: null,
    }),
}));
