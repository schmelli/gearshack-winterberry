'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AIPanelState {
  isOpen: boolean;
  panelWidth: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setWidth: (width: number) => void;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 400;

export const useAIPanelStore = create<AIPanelState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      panelWidth: DEFAULT_WIDTH,

      open: () => set({ isOpen: true }),

      close: () => set({ isOpen: false }),

      toggle: () => set({ isOpen: !get().isOpen }),

      setWidth: (width: number) => {
        const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
        set({ panelWidth: clampedWidth });
      },
    }),
    {
      name: 'ai-panel-storage',
    }
  )
);
