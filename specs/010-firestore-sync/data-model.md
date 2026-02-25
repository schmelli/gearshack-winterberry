# Data Model: The Great Sync

**Feature**: 010-firestore-sync
**Date**: 2025-12-05

## Overview

This document defines the data models for Firestore sync, including existing entities (GearItem, Loadout), new sync state types, and adapter transformations for legacy Flutter data.

## Entities

### 1. GearItem (Existing - Extended for Sync)

The core gear item entity. Already defined in `types/gear.ts`.

**Firestore Path**: `userBase/{uid}/gearInventory/{itemId}`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Document ID (UUID) |
| name | string | Yes | Gear item name |
| brand | string | null | No | Manufacturer/brand |
| brandUrl | string | null | No | Brand website URL |
| modelNumber | string | null | No | Product model number |
| productUrl | string | null | No | Product page URL |
| categoryId | string | null | No | Taxonomy category ID |
| subcategoryId | string | null | No | Taxonomy subcategory ID |
| productTypeId | string | null | No | Taxonomy product type ID |
| weightGrams | number | null | No | Weight in grams |
| weightDisplayUnit | WeightUnit | Yes | Display unit preference |
| lengthCm | number | null | No | Length in centimeters |
| widthCm | number | null | No | Width in centimeters |
| heightCm | number | null | No | Height in centimeters |
| pricePaid | number | null | No | Purchase price |
| currency | string | null | No | Currency code (USD, EUR) |
| purchaseDate | Date | null | No | Purchase date |
| retailer | string | null | No | Store/retailer name |
| retailerUrl | string | null | No | Retailer website URL |
| primaryImageUrl | string | null | No | Main image URL |
| galleryImageUrls | string[] | Yes | Additional image URLs |
| condition | GearCondition | Yes | new, used, worn |
| status | GearStatus | Yes | active, wishlist, sold |
| notes | string | null | No | User notes |
| createdAt | Date | Yes | Creation timestamp |
| updatedAt | Date | Yes | Last update timestamp |

**Validation Rules**:
- `name` must be non-empty string
- `weightGrams` must be >= 0 if provided
- `condition` must be valid enum value
- `status` must be valid enum value

---

### 2. Loadout (Existing - Extended for Sync)

Collection of gear items for a trip. Already defined in `types/loadout.ts`.

**Firestore Path**: `userBase/{uid}/loadouts/{loadoutId}`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Document ID (UUID) |
| name | string | Yes | Loadout name |
| description | string | null | No | Loadout description |
| tripDate | Date | null | No | Trip date |
| itemIds | string[] | Yes | References to GearItem IDs |
| activityTypes | ActivityType[] | No | Activity classifications |
| seasons | Season[] | No | Season classifications |
| itemStates | LoadoutItemState[] | Yes | Per-item worn/consumable state |
| createdAt | Date | Yes | Creation timestamp |
| updatedAt | Date | Yes | Last update timestamp |

**Validation Rules**:
- `name` must be non-empty string
- `itemIds` must reference valid GearItem documents
- `activityTypes` must be valid enum values
- `seasons` must be valid enum values

---

### 3. SyncState (New)

Tracks synchronization status for UI feedback.

**Location**: `types/sync.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | SyncStatus | Yes | Current sync state |
| pendingOperations | number | Yes | Count of in-flight operations |
| lastSyncedAt | Date | null | No | Last successful sync time |
| error | string | null | No | Error message if status='error' |

**SyncStatus Enum**:
- `idle` - No active sync operations
- `syncing` - Operations in progress
- `error` - Last operation failed

---

### 4. FirestoreGearItem (Legacy Adapter Input)

Represents raw data from Firestore (Flutter app format).

**Location**: `types/sync.ts`

| Flutter Field | Type | Maps To |
|---------------|------|---------|
| id | string | id |
| name | string | name |
| brand | string? | brand |
| weight | number? | weightGrams |
| weight_unit | string? | weightDisplayUnit |
| category | string? | categoryId |
| subcategory | string? | subcategoryId |
| product_type | string? | productTypeId |
| length | number? | lengthCm |
| width | number? | widthCm |
| height | number? | heightCm |
| price | number? | pricePaid |
| currency | string? | currency |
| purchase_date | Timestamp? | purchaseDate |
| retailer | string? | retailer |
| primary_image | string? | primaryImageUrl |
| gallery_images | string[]? | galleryImageUrls |
| condition | string? | condition |
| status | string? | status |
| notes | string? | notes |
| created_at | Timestamp | createdAt |
| updated_at | Timestamp | updatedAt |

---

### 5. FirestoreLoadout (Legacy Adapter Input)

Represents raw loadout data from Firestore (Flutter app format).

**Location**: `types/sync.ts`

| Flutter Field | Type | Maps To |
|---------------|------|---------|
| id | string | id |
| name | string | name |
| description | string? | description |
| trip_date | Timestamp? | tripDate |
| item_ids | string[] | itemIds |
| activity_types | string[]? | activityTypes |
| seasons | string[]? | seasons |
| item_states | object[]? | itemStates |
| created_at | Timestamp | createdAt |
| updated_at | Timestamp | updatedAt |

---

## State Transitions

### Sync Status Flow

```
                    ┌──────────┐
     App Load ──────│  idle    │◄─────────────────┐
                    └────┬─────┘                  │
                         │                        │
                    Login/CRUD                    │
                         │                        │
                    ┌────▼─────┐            ┌─────┴────┐
                    │ syncing  │────────────│  idle    │
                    └────┬─────┘  Success   └──────────┘
                         │
                    Failure
                         │
                    ┌────▼─────┐
                    │  error   │───── Retry ──────┐
                    └──────────┘                  │
                         │                        │
                    Manual Dismiss                │
                         │                        ▼
                    ┌────▼─────┐            ┌──────────┐
                    │  idle    │            │ syncing  │
                    └──────────┘            └──────────┘
```

### CRUD Operation Flow (Optimistic)

```
User Action
    │
    ▼
┌─────────────────┐
│ Update Local    │ ◄── Immediate (optimistic)
│ State           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Write to        │
│ Firestore       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
 Success   Failure
    │         │
    ▼         ▼
┌────────┐  ┌─────────────┐
│ Done   │  │ Rollback    │
│        │  │ Local State │
└────────┘  │ Show Error  │
            └─────────────┘
```

---

## Relationships

```
┌─────────────────────────────────────────────────────────┐
│                    userBase/{uid}                        │
│  (User Profile Document)                                │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────┐      ┌─────────────────────┐
│   gearInventory/    │      │     loadouts/       │
│   (Subcollection)   │      │   (Subcollection)   │
│                     │      │                     │
│  ┌───────────────┐  │      │  ┌───────────────┐  │
│  │  GearItem 1   │  │◄─────┼──│ Loadout.itemIds│  │
│  └───────────────┘  │      │  └───────────────┘  │
│  ┌───────────────┐  │      │  ┌───────────────┐  │
│  │  GearItem 2   │  │◄─────┼──│ Loadout.itemIds│  │
│  └───────────────┘  │      │  └───────────────┘  │
│  ┌───────────────┐  │      │                     │
│  │  GearItem N   │  │      │                     │
│  └───────────────┘  │      │                     │
└─────────────────────┘      └─────────────────────┘
```

---

## Indexes

No custom Firestore indexes required for this feature. All queries are:
- Full collection reads (gearInventory, loadouts)
- Single document reads by ID

If future features need filtered queries, indexes will be added.

---

## Migration Notes

**From Flutter App**:
- No data migration required
- Adapter handles field name differences at runtime
- Unknown fields in Firestore documents are preserved (not deleted)
- New fields added by web app (if any) use defaults in Flutter app

**From localStorage (existing web)**:
- On first sync, localStorage data is replaced by Firestore data
- Firestore is source of truth once user logs in
- localStorage continues to work for anonymous/offline mode (future enhancement)
