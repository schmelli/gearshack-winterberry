/**
 * SyncProvider - Firestore Sync Initialization Component
 *
 * Feature: 010-firestore-sync
 * Task: T010 - Integrate sync hook in app layout
 *
 * This client component initializes Firestore real-time sync when mounted.
 * It should be placed inside AuthProvider to ensure user state is available.
 */

'use client';

import { useFirestoreSync } from '@/hooks/useFirestoreSync';

/**
 * Provider component that initializes Firestore sync.
 *
 * This is a side-effect-only component - it renders nothing but
 * sets up real-time listeners for gear inventory and loadouts
 * when a user is authenticated.
 *
 * @example
 * ```tsx
 * // In layout.tsx, inside AuthProvider:
 * <AuthProvider>
 *   <SyncProvider />
 *   {children}
 * </AuthProvider>
 * ```
 */
export function SyncProvider() {
  useFirestoreSync();
  return null;
}
