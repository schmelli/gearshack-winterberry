# Feature Specification: The Great Sync

**Feature Branch**: `010-firestore-sync`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Implement 'The Great Sync': Connect Firestore Data and enable Image Uploads. Sync local Zustand store with existing Firestore data (userBase/{uid}/gearInventory and loadouts). Implement backend logic for Image Upload UI."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Gear Inventory Sync (Priority: P1)

As a returning user who has gear data in the existing Flutter app, I want my gear inventory to automatically appear in the web app when I log in, so I can access and manage my gear from any device without manual data entry.

**Why this priority**: Without data sync, the web app has no persistent value. Users need to see their existing gear immediately upon login - this is the core value proposition of the sync feature.

**Independent Test**: Log in with an account that has existing gear data in Firestore. Verify all gear items appear in the inventory gallery within a few seconds without any manual action.

**Acceptance Scenarios**:

1. **Given** I am logged out, **When** I log in with valid credentials, **Then** my gear inventory populates automatically from Firestore within 5 seconds
2. **Given** I am viewing my inventory, **When** another device adds a gear item to my account, **Then** the new item appears in my inventory in real-time without page refresh
3. **Given** I am viewing my inventory, **When** Firestore contains gear data with missing optional fields, **Then** the app handles the data gracefully without errors
4. **Given** I am logged in, **When** I log out and log back in, **Then** my inventory data persists correctly

---

### User Story 2 - Real-Time Loadout Sync (Priority: P1)

As a user who creates loadouts on different devices, I want my loadouts to sync automatically across all devices, so I can start building a loadout on my phone and continue on my laptop.

**Why this priority**: Loadouts are equally critical to gear inventory - users need both to have a functional experience. Loadouts reference gear items, so this must work alongside gear sync.

**Independent Test**: Create a loadout in the web app, then verify it appears in Firestore. Modify the loadout in Firestore directly and verify changes appear in the web app.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I view my loadouts, **Then** all loadouts from Firestore appear in the loadout list
2. **Given** I am editing a loadout, **When** I add or remove items, **Then** changes sync to Firestore immediately
3. **Given** I have loadouts with legacy data from the Flutter app, **When** I view them, **Then** they display correctly with all item references resolved

---

### User Story 3 - Gear CRUD with Cloud Persistence (Priority: P1)

As a user managing my gear inventory, I want all my create, update, and delete operations to persist to the cloud immediately, so my data is never lost and stays consistent across devices.

**Why this priority**: Core functionality - without CRUD persistence, any local changes would be lost on logout or device switch. This is foundational to the app's value.

**Independent Test**: Create a new gear item, close the browser, log back in, and verify the item persists. Update and delete items and verify changes are reflected in Firestore.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I create a new gear item, **Then** it is saved to Firestore immediately and appears in my inventory
2. **Given** I am viewing a gear item, **When** I update its details, **Then** changes are saved to Firestore and visible instantly (optimistic update)
3. **Given** I am viewing a gear item, **When** I delete it, **Then** it is removed from Firestore and disappears from my inventory
4. **Given** I am offline or Firestore write fails, **When** I perform a CRUD operation, **Then** I see an appropriate error message and can retry

---

### User Story 4 - Image Upload for Gear Items (Priority: P2)

As a user adding or editing gear items, I want to upload images from my device, so I can visually identify my gear and see photos in my inventory.

**Why this priority**: While important for user experience, the app is functional without images. Users can still manage gear with names and details. Image upload enhances but doesn't block core functionality.

**Independent Test**: Edit a gear item, select an image file, save the item, and verify the image appears in the gear card and detail view.

**Acceptance Scenarios**:

1. **Given** I am editing a gear item, **When** I select an image file and save, **Then** the image uploads to cloud storage and the URL is saved with the gear item
2. **Given** I am uploading an image, **When** the upload is in progress, **Then** I see a loading indicator on the save button
3. **Given** I have uploaded an image, **When** I view my gear inventory, **Then** the uploaded image displays in the gear card
4. **Given** I upload a large image file (>5MB), **When** the upload completes, **Then** the image is processed and displays correctly

---

### User Story 5 - Sync Status Visibility (Priority: P2)

As a user, I want to see when data is syncing with the cloud, so I know my changes are being saved and can wait before closing the app if needed.

**Why this priority**: Provides user confidence and prevents data loss from premature app closure, but doesn't affect core functionality.

**Independent Test**: Perform a CRUD operation and observe the sync indicator showing activity, then returning to idle state.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** initial data is loading from Firestore, **Then** I see a subtle sync indicator in the header
2. **Given** I make changes to my data, **When** the changes are syncing, **Then** the sync indicator shows activity
3. **Given** all data is synced, **When** I observe the header, **Then** the sync indicator shows an idle/synced state

---

### Edge Cases

- What happens when user has no existing data in Firestore? App displays empty state with option to add first item
- What happens when Firestore data has fields the web app doesn't recognize? Unknown fields are preserved but ignored in display
- What happens when image upload fails mid-way? User sees error message, item saves without image, user can retry upload
- What happens when user loses network during sync? Optimistic updates show locally, sync retries when connection restored
- What happens when legacy data has invalid category values? Map to "Miscellaneous" category as fallback
- What happens when Firestore timestamps need conversion? Adapter converts Firestore Timestamps to JavaScript Date objects

## Requirements *(mandatory)*

### Functional Requirements

**Real-Time Sync**
- **FR-001**: System MUST listen to authentication state and initiate data sync when user logs in
- **FR-002**: System MUST use real-time listeners for gear inventory collection
- **FR-003**: System MUST use real-time listeners for loadouts collection
- **FR-004**: System MUST update the local store when remote data changes
- **FR-005**: System MUST display a loading state while initial data fetch is in progress

**Data Adaptation**
- **FR-006**: System MUST adapt legacy Flutter app data to match the web app's data schema
- **FR-007**: System MUST handle missing optional fields by providing sensible defaults (e.g., weight defaults to 0)
- **FR-008**: System MUST convert Firestore Timestamp objects to JavaScript Date objects
- **FR-009**: System MUST map invalid or unknown category values to a "Miscellaneous" fallback category
- **FR-010**: System MUST preserve unrecognized fields in documents to prevent data loss

**CRUD Operations**
- **FR-011**: System MUST write new gear items to Firestore when created locally
- **FR-012**: System MUST update gear items in Firestore when modified locally
- **FR-013**: System MUST delete gear items from Firestore when deleted locally
- **FR-014**: System MUST implement optimistic updates (update UI immediately, sync to cloud in background)
- **FR-015**: System MUST rollback optimistic updates if cloud write fails
- **FR-016**: System MUST display error feedback when CRUD operations fail

**Image Upload**
- **FR-017**: System MUST upload gear images to cloud storage
- **FR-018**: System MUST store images at path: user-uploads/{userId}/gear/{timestamp}-{filename}
- **FR-019**: System MUST return a download URL after successful upload
- **FR-020**: System MUST show a loading spinner on the save button during image upload
- **FR-021**: System MUST handle upload failures gracefully with user feedback

**Sync Status UI**
- **FR-022**: System MUST display a sync indicator in the site header
- **FR-023**: System MUST show "syncing" state when data is being fetched or written
- **FR-024**: System MUST show "synced" state when all operations are complete

**Data Integrity**
- **FR-025**: System MUST NOT create infinite loops when syncing data (guard against snapshot → write → snapshot cycles)
- **FR-026**: System MUST respect existing Firestore data structure (userBase/{uid}/gearInventory, loadouts)
- **FR-027**: System MUST handle concurrent updates from multiple devices gracefully

### Key Entities

- **GearItem**: User's gear/equipment with name, brand, weight, category, images, and purchase details. Stored at `userBase/{uid}/gearInventory`
- **Loadout**: Named collection of gear items for a trip with optional trip date and activity types. Stored at `userBase/{uid}/loadouts`
- **SyncState**: Transient state tracking sync status (idle, syncing, error) and pending operations
- **LegacyAdapter**: Logic layer that transforms Firestore documents from Flutter app format to web app interfaces

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see their existing gear inventory within 5 seconds of logging in
- **SC-002**: Real-time updates appear within 2 seconds of changes made on another device
- **SC-003**: 100% of gear items from legacy Flutter data display correctly in the web app
- **SC-004**: CRUD operations provide instant visual feedback (optimistic updates)
- **SC-005**: Image uploads complete successfully for files up to 10MB
- **SC-006**: Users can identify sync status at a glance via header indicator
- **SC-007**: Zero data loss when syncing between Flutter app and web app
- **SC-008**: App gracefully handles network interruptions without crashing or losing local state

## Assumptions

- Firebase project is already configured with Firestore and Storage enabled
- User authentication (Feature 008) is fully implemented and working
- Firestore data structure follows the pattern: `userBase/{uid}/gearInventory` and `userBase/{uid}/loadouts`
- Legacy Flutter app data may have inconsistent field names or missing optional fields
- Users have stable internet connection for most operations (offline-first is not in scope for MVP)
- Image file size limit of 10MB is acceptable for gear photos
- The existing GearItem and Loadout interfaces are the source of truth for data shape
