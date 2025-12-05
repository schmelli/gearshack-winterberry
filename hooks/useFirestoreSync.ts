/**
 * useFirestoreSync - Real-time Firestore Sync Hook
 *
 * Feature: 010-firestore-sync
 * Tasks: T007-T010
 *
 * Purpose:
 * - Establishes real-time listeners for gear inventory and loadouts
 * - Transforms Firestore documents to web app TypeScript interfaces
 * - Prevents infinite sync loops via pending writes tracking
 * - Updates Zustand store with remote data
 * - Manages sync state (idle, syncing, error)
 *
 * Usage:
 * Call this hook once from a client component in the layout tree:
 * ```typescript
 * 'use client';
 * import { useFirestoreSync } from '@/hooks/useFirestoreSync';
 *
 * export function SyncProvider() {
 *   useFirestoreSync();
 *   return null;
 * }
 * ```
 */

'use client';

import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/hooks/useStore';
import { adaptGearItem, adaptLoadout } from '@/lib/firebase/adapter';

// =============================================================================
// Pending Writes Tracking (Module-Level State)
// =============================================================================

/**
 * Tracks gear item document IDs that have pending local writes to Firestore.
 * Used to prevent infinite sync loops when onSnapshot echoes our own writes.
 *
 * Module-level state persists across component re-renders but is cleared on page reload.
 */
const pendingGearWrites = new Set<string>();

/**
 * Tracks loadout document IDs that have pending local writes to Firestore.
 * Used to prevent infinite sync loops when onSnapshot echoes our own writes.
 *
 * Module-level state persists across component re-renders but is cleared on page reload.
 */
const pendingLoadoutWrites = new Set<string>();

// =============================================================================
// Pending Write Management Functions (Public API)
// =============================================================================

/**
 * Mark a gear item as having a pending write operation.
 * Call this BEFORE writing to Firestore to prevent the onSnapshot listener
 * from processing the echoed change.
 *
 * @param id - Gear item document ID
 *
 * @example
 * ```typescript
 * markPendingGearWrite(itemId);
 * await setDoc(doc(db, `userBase/${uid}/gearInventory/${itemId}`), data);
 * // Pending write will be cleared when onSnapshot receives the document
 * ```
 */
export function markPendingGearWrite(id: string): void {
  pendingGearWrites.add(id);
}

/**
 * Manually clear a pending gear write.
 * Only needed if the write operation fails and you want to allow
 * the snapshot listener to process the document again.
 *
 * @param id - Gear item document ID
 *
 * @example
 * ```typescript
 * try {
 *   markPendingGearWrite(itemId);
 *   await setDoc(...);
 * } catch (error) {
 *   clearPendingGearWrite(itemId); // Rollback tracking
 * }
 * ```
 */
export function clearPendingGearWrite(id: string): void {
  pendingGearWrites.delete(id);
}

/**
 * Mark a loadout as having a pending write operation.
 * Call this BEFORE writing to Firestore to prevent the onSnapshot listener
 * from processing the echoed change.
 *
 * @param id - Loadout document ID
 *
 * @example
 * ```typescript
 * markPendingLoadoutWrite(loadoutId);
 * await setDoc(doc(db, `userBase/${uid}/loadouts/${loadoutId}`), data);
 * // Pending write will be cleared when onSnapshot receives the document
 * ```
 */
export function markPendingLoadoutWrite(id: string): void {
  pendingLoadoutWrites.add(id);
}

/**
 * Manually clear a pending loadout write.
 * Only needed if the write operation fails and you want to allow
 * the snapshot listener to process the document again.
 *
 * @param id - Loadout document ID
 *
 * @example
 * ```typescript
 * try {
 *   markPendingLoadoutWrite(loadoutId);
 *   await setDoc(...);
 * } catch (error) {
 *   clearPendingLoadoutWrite(loadoutId); // Rollback tracking
 * }
 * ```
 */
export function clearPendingLoadoutWrite(id: string): void {
  pendingLoadoutWrites.delete(id);
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Establishes real-time Firestore listeners for gear inventory and loadouts.
 *
 * **Behavior:**
 * - Waits for auth to initialize (`authLoading` = false)
 * - When user is logged in:
 *   - Starts two onSnapshot listeners (gear inventory + loadouts)
 *   - Sets sync state to 'syncing' on initialization
 *   - Transforms Firestore documents to web app types via adapter functions
 *   - Skips documents with pending local writes (loop prevention)
 *   - Updates Zustand store with remote data
 *   - Sets sync state to 'idle' on successful snapshot
 *   - Sets sync state to 'error' on listener errors
 * - When user is logged out:
 *   - Clears gear inventory and loadouts from store
 *   - Unsubscribes from all listeners
 *
 * **Loop Prevention:**
 * When you write to Firestore, onSnapshot fires with the new document.
 * Without tracking, this would trigger a local state update, which could
 * trigger another write, creating an infinite loop.
 *
 * To prevent this:
 * 1. Call `markPendingGearWrite(id)` BEFORE writing to Firestore
 * 2. The snapshot listener skips documents in the pending set
 * 3. When the snapshot confirms the document, it's removed from pending set
 *
 * @example
 * ```typescript
 * // In your root layout or a dedicated sync provider component:
 * 'use client';
 *
 * export function SyncProvider() {
 *   useFirestoreSync();
 *   return null;
 * }
 * ```
 *
 * @see {@link markPendingGearWrite}
 * @see {@link markPendingLoadoutWrite}
 * @see {@link adaptGearItem}
 * @see {@link adaptLoadout}
 */
export function useFirestoreSync(): void {
  const { user, loading: authLoading } = useAuth();
  const { setRemoteGearItems, setRemoteLoadouts, setSyncState } = useStore();

  useEffect(() => {
    // Wait for auth to initialize
    if (authLoading) {
      return;
    }

    // User is logged out - clear data
    if (!user) {
      setRemoteGearItems([]);
      setRemoteLoadouts([]);
      setSyncState({ status: 'idle', pendingOperations: 0 });
      return;
    }

    // User is logged in - start listeners
    console.log('[useFirestoreSync] Starting real-time listeners for user:', user.uid);
    setSyncState({ status: 'syncing' });

    // =========================================================================
    // Gear Inventory Listener (T008)
    // =========================================================================

    const gearUnsubscribe = onSnapshot(
      collection(db, `userBase/${user.uid}/gearInventory`),
      (snapshot) => {
        console.log(
          `[useFirestoreSync] Gear snapshot received: ${snapshot.docs.length} documents`
        );

        // Transform remote documents
        const remoteItems = snapshot.docs.map((doc) => adaptGearItem(doc.data(), doc.id));

        // Get IDs of items with pending writes (optimistic updates not yet confirmed)
        const pendingIds = new Set(pendingGearWrites);

        // Get current local items from store (fresh read to avoid stale closure)
        const currentLocalItems = useStore.getState().items;

        // Preserve local items that have pending writes (not yet in remote)
        const localPendingItems = currentLocalItems.filter(
          (item) => pendingIds.has(item.id) && !remoteItems.some((r) => r.id === item.id)
        );

        if (localPendingItems.length > 0) {
          console.log(
            `[useFirestoreSync] Preserving ${localPendingItems.length} pending local items`
          );
        }

        // Clear pending writes that came back in this snapshot
        snapshot.docChanges().forEach((change) => {
          if (pendingGearWrites.has(change.doc.id)) {
            console.log(
              `[useFirestoreSync] Clearing pending gear write: ${change.doc.id}`
            );
            pendingGearWrites.delete(change.doc.id);
          }
        });

        // Merge: remote items + local pending items not yet in remote
        const mergedItems = [...remoteItems, ...localPendingItems];
        console.log(
          `[useFirestoreSync] Merged items: ${remoteItems.length} remote + ${localPendingItems.length} pending = ${mergedItems.length} total`
        );

        // Update store with merged data
        setRemoteGearItems(mergedItems);
        setSyncState({ status: 'idle', lastSyncedAt: new Date() });
      },
      (error) => {
        console.error('[useFirestoreSync] Gear inventory sync error:', error);
        setSyncState({
          status: 'error',
          error: error.message || 'Failed to sync gear inventory',
        });
      }
    );

    // =========================================================================
    // Loadout Listener (T009)
    // =========================================================================

    const loadoutUnsubscribe = onSnapshot(
      collection(db, `userBase/${user.uid}/loadouts`),
      (snapshot) => {
        console.log(
          `[useFirestoreSync] Loadout snapshot received: ${snapshot.docs.length} documents`
        );

        // Transform remote documents, filtering invalid IDs
        const remoteLoadouts = snapshot.docs
          .map((doc) => adaptLoadout(doc.data(), doc.id))
          .filter((loadout): loadout is NonNullable<typeof loadout> => loadout !== null);

        // Get IDs of loadouts with pending writes (optimistic updates not yet confirmed)
        const pendingIds = new Set(pendingLoadoutWrites);

        // Get current local loadouts from store (fresh read to avoid stale closure)
        const currentLocalLoadouts = useStore.getState().loadouts;

        // Preserve local loadouts that have pending writes (not yet in remote)
        const localPendingLoadouts = currentLocalLoadouts.filter(
          (loadout) => pendingIds.has(loadout.id) && !remoteLoadouts.some((r) => r.id === loadout.id)
        );

        if (localPendingLoadouts.length > 0) {
          console.log(
            `[useFirestoreSync] Preserving ${localPendingLoadouts.length} pending local loadouts`
          );
        }

        // Clear pending writes that came back in this snapshot
        snapshot.docChanges().forEach((change) => {
          if (pendingLoadoutWrites.has(change.doc.id)) {
            console.log(
              `[useFirestoreSync] Clearing pending loadout write: ${change.doc.id}`
            );
            pendingLoadoutWrites.delete(change.doc.id);
          }
        });

        // Merge: remote loadouts + local pending loadouts not yet in remote
        const mergedLoadouts = [...remoteLoadouts, ...localPendingLoadouts];
        console.log(
          `[useFirestoreSync] Merged loadouts: ${remoteLoadouts.length} remote + ${localPendingLoadouts.length} pending = ${mergedLoadouts.length} total`
        );

        // Update store with merged data
        setRemoteLoadouts(mergedLoadouts);
      },
      (error) => {
        console.error('[useFirestoreSync] Loadout sync error:', error);
        setSyncState({
          status: 'error',
          error: error.message || 'Failed to sync loadouts',
        });
      }
    );

    // Cleanup: unsubscribe when user logs out or component unmounts
    return () => {
      console.log('[useFirestoreSync] Unsubscribing from real-time listeners');
      gearUnsubscribe();
      loadoutUnsubscribe();
    };
  }, [user, authLoading, setRemoteGearItems, setRemoteLoadouts, setSyncState]);
}
