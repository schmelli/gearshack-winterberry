# Research: The Great Sync

**Feature**: 010-firestore-sync
**Date**: 2025-12-05

## Research Topics

### 1. Firestore Real-Time Listeners with onSnapshot

**Decision**: Use `onSnapshot` with unsubscribe cleanup in useEffect

**Rationale**:
- Native Firebase pattern for real-time updates
- Automatic reconnection on network changes
- Efficient delta updates (only changed documents)
- Built-in error handling callbacks

**Implementation Pattern**:
```typescript
useEffect(() => {
  if (!user) return;

  const unsubscribe = onSnapshot(
    collection(db, `userBase/${user.uid}/gearInventory`),
    (snapshot) => {
      const items = snapshot.docs.map(doc => adaptGearItem(doc.data(), doc.id));
      useStore.getState().setRemoteItems(items);
    },
    (error) => {
      console.error('Sync error:', error);
      setSyncState('error');
    }
  );

  return () => unsubscribe();
}, [user]);
```

**Alternatives Considered**:
- Polling with getDoc: Rejected - inefficient, no real-time updates
- Firebase REST API: Rejected - no real-time support
- Custom WebSocket: Rejected - Firebase already provides this

---

### 2. Legacy Flutter Data Field Mapping

**Decision**: Create adapter functions with Zod validation for type-safe transformation

**Rationale**:
- Flutter app may use different field names (snake_case vs camelCase)
- Some fields may be missing or have different types
- Timestamps are Firestore Timestamp objects, not JS Dates
- Need fallback values for missing optional fields

**Known Field Mappings** (Flutter → Web):
| Flutter Field | Web Field | Transformation |
|---------------|-----------|----------------|
| `weight` | `weightGrams` | Number, default 0 |
| `weight_unit` | `weightDisplayUnit` | Enum validation |
| `category` | `categoryId` | String, fallback to 'misc' |
| `created_at` | `createdAt` | Timestamp → Date |
| `updated_at` | `updatedAt` | Timestamp → Date |
| `purchase_date` | `purchaseDate` | Timestamp → Date or null |
| `primary_image` | `primaryImageUrl` | String or null |
| `gallery_images` | `galleryImageUrls` | Array of strings |

**Alternatives Considered**:
- Direct mapping without validation: Rejected - type safety violations
- Migrating Firestore data: Rejected - breaks Flutter app compatibility

---

### 3. Optimistic Updates Pattern

**Decision**: Update local state immediately, then sync to Firestore with rollback on failure

**Rationale**:
- Instant UI feedback for better UX
- Users don't wait for network roundtrip
- Graceful degradation on network issues
- Standard pattern for modern apps

**Implementation Pattern**:
```typescript
addItem: async (itemData) => {
  const id = generateId();
  const item = { ...itemData, id };

  // Optimistic update
  set(state => ({ items: [...state.items, item] }));

  try {
    await setDoc(doc(db, `userBase/${uid}/gearInventory`, id), item);
  } catch (error) {
    // Rollback on failure
    set(state => ({ items: state.items.filter(i => i.id !== id) }));
    toast.error('Failed to save item');
  }
}
```

**Alternatives Considered**:
- Wait for Firestore confirmation: Rejected - poor UX
- Offline queue: Rejected - adds complexity, not in MVP scope

---

### 4. Preventing Infinite Sync Loops

**Decision**: Use flag-based guard and source tracking

**Rationale**:
- onSnapshot fires when local writes complete
- Without guard, local write → snapshot → local update → potential re-write
- Need to distinguish remote changes from local echoes

**Implementation Pattern**:
```typescript
// Track pending local writes
const pendingWrites = new Set<string>();

// In CRUD operations
pendingWrites.add(itemId);
await setDoc(...);
// Don't remove immediately - wait for snapshot

// In snapshot listener
snapshot.docChanges().forEach(change => {
  if (pendingWrites.has(change.doc.id)) {
    pendingWrites.delete(change.doc.id);
    return; // Skip - this is our own write echoing back
  }
  // Process remote change
});
```

**Alternatives Considered**:
- Debouncing: Rejected - can miss rapid legitimate updates
- Disabling listeners during writes: Rejected - misses concurrent remote changes

---

### 5. Firebase Storage Image Upload

**Decision**: Use uploadBytes + getDownloadURL with timestamp-prefixed filenames

**Rationale**:
- Simple API for file uploads
- Automatic content-type detection
- Download URLs are persistent and public (with security rules)
- Timestamp prefix prevents filename collisions

**Implementation Pattern**:
```typescript
async function uploadGearImage(file: File, userId: string): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `user-uploads/${userId}/gear/${timestamp}-${safeName}`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
```

**Path Structure**: `user-uploads/{userId}/gear/{timestamp}-{filename}`

**Alternatives Considered**:
- uploadString with base64: Rejected - larger payload, more complex
- Resumable uploads: Rejected - overkill for gear images (<10MB)
- Third-party CDN: Rejected - Firebase Storage is sufficient

---

### 6. Sync State Management

**Decision**: Track sync state in Zustand store with enum values

**Rationale**:
- Centralized state accessible from header component
- Simple enum: 'idle' | 'syncing' | 'error'
- Can track pending operation count for granular status

**State Shape**:
```typescript
interface SyncState {
  status: 'idle' | 'syncing' | 'error';
  pendingOperations: number;
  lastSyncedAt: Date | null;
  error: string | null;
}
```

**UI Indicator Behavior**:
- `idle`: Cloud icon (static)
- `syncing`: Cloud icon with animation (pulse/spin)
- `error`: Cloud icon with warning indicator

**Alternatives Considered**:
- React Context: Rejected - Zustand already manages global state
- Local component state: Rejected - header needs access to sync status

---

### 7. Firestore Data Structure Preservation

**Decision**: Respect existing paths, use merge strategies for updates

**Rationale**:
- Flutter app continues to use same Firestore collections
- Breaking changes would corrupt mobile app experience
- Web app is additive, not replacing mobile

**Collection Paths**:
- User profile: `userBase/{uid}` (document)
- Gear inventory: `userBase/{uid}/gearInventory` (subcollection)
- Loadouts: `userBase/{uid}/loadouts` (subcollection)

**Write Strategy**:
- New items: `setDoc` with generated UUID
- Updates: `updateDoc` with merge (preserves unknown fields)
- Deletes: `deleteDoc`

**Alternatives Considered**:
- New collection structure: Rejected - breaks mobile app
- Migration script: Rejected - not needed, adapter handles differences

---

## Summary

All research topics resolved. Key decisions:

1. **Real-time sync**: Firebase onSnapshot with cleanup
2. **Legacy data**: Zod-validated adapter functions
3. **Optimistic updates**: Local-first with rollback
4. **Loop prevention**: Pending writes tracking
5. **Image upload**: Firebase Storage with timestamp paths
6. **Sync state**: Zustand with status enum
7. **Data structure**: Preserve existing Firestore paths

Ready to proceed to Phase 1: Design & Contracts.
