# Data Model: Loadout UX & Profile Identity

**Feature**: 041-loadout-ux-profile
**Date**: 2025-12-10

## Overview

This document defines the data model changes for P2 (Profile Avatar) and P3 (Profile Location). P1 (Loadout Search & Filter) is already implemented.

---

## Entity: Profile (Extended)

### Current Schema

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,      -- Already exists
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Extended Schema

```sql
ALTER TABLE profiles
  ADD COLUMN location_name TEXT,
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION;
```

### Field Definitions

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | No | Primary key, references auth.users |
| `email` | TEXT | No | User's email address |
| `display_name` | TEXT | Yes | User's display name |
| `avatar_url` | TEXT | Yes | **Custom** avatar URL (Cloudinary) |
| `location_name` | TEXT | Yes | Human-readable location (e.g., "Berlin, Germany") |
| `latitude` | DOUBLE PRECISION | Yes | Geographic latitude (-90 to 90) |
| `longitude` | DOUBLE PRECISION | Yes | Geographic longitude (-180 to 180) |
| `created_at` | TIMESTAMPTZ | No | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | No | Last update timestamp (auto-updated) |

### Validation Rules

| Field | Rule |
|-------|------|
| `avatar_url` | Valid URL format, max 500 chars |
| `location_name` | Max 200 chars |
| `latitude` | Range: -90 to 90 |
| `longitude` | Range: -180 to 180 |
| Location coordinates | Both latitude AND longitude required if location_name set |

---

## TypeScript Types

### Profile Type (Updated)

```typescript
// types/supabase.ts
export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  locationName: string | null;  // NEW
  latitude: number | null;       // NEW
  longitude: number | null;      // NEW
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileUpdate {
  displayName?: string;
  avatarUrl?: string | null;  // null to remove
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
```

### Database Types (Updated)

```typescript
// types/database.ts
profiles: {
  Row: {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    location_name: string | null;  // NEW
    latitude: number | null;        // NEW
    longitude: number | null;       // NEW
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id: string;
    email: string;
    display_name?: string | null;
    avatar_url?: string | null;
    location_name?: string | null;  // NEW
    latitude?: number | null;        // NEW
    longitude?: number | null;       // NEW
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    // ... same as Insert but all optional
    location_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}
```

### MergedUser Type (Updated)

```typescript
// types/auth.ts
export interface MergedUser {
  uid: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;     // Custom avatar priority
  providerAvatarUrl: string | null; // NEW - Provider avatar (Google, etc.)
  locationName: string | null;  // NEW
  latitude: number | null;       // NEW
  longitude: number | null;      // NEW
  trailName: string | null;
  bio: string | null;
  // ... existing fields
}
```

---

## Entity: Location Selection (Transient)

Used by the LocationAutocomplete component. Not persisted directly.

```typescript
// types/profile.ts
export interface LocationSelection {
  /** Human-readable place name */
  name: string;
  /** Full formatted address */
  formattedAddress: string;
  /** Geographic latitude */
  latitude: number;
  /** Geographic longitude */
  longitude: number;
  /** Google Place ID for future reference */
  placeId?: string;
}
```

---

## Avatar Fallback Chain

```
1. profile.avatar_url (custom upload)
   ↓ if null
2. auth.user.user_metadata.avatar_url (Google/OAuth provider)
   ↓ if null
3. Generate initials from displayName
```

### Implementation

```typescript
// lib/utils/avatar.ts
export function getDisplayAvatarUrl(
  customAvatarUrl: string | null | undefined,
  providerAvatarUrl: string | null | undefined
): string | null {
  return customAvatarUrl || providerAvatarUrl || null;
}

export function getUserInitials(displayName: string | null | undefined): string {
  if (!displayName) return '?';
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
```

---

## Cloudinary Storage Structure

```
gearshack/
└── users/
    └── {userId}/
        ├── avatar/           # Profile avatar
        │   └── profile.png   # Latest avatar image
        └── {itemId}/         # Gear item images (existing)
            └── *.png
```

---

## Database Migration

**File**: `supabase/migrations/20251211_profile_location.sql`

```sql
-- Migration: Add location fields to profiles table
-- Feature: 041-loadout-ux-profile
-- Date: 2025-12-11

-- Add location columns (all nullable for existing users)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add constraint for coordinate validity
ALTER TABLE profiles
  ADD CONSTRAINT profiles_latitude_range
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE profiles
  ADD CONSTRAINT profiles_longitude_range
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Add constraint requiring both coordinates if either is set
ALTER TABLE profiles
  ADD CONSTRAINT profiles_coordinates_complete
    CHECK (
      (latitude IS NULL AND longitude IS NULL) OR
      (latitude IS NOT NULL AND longitude IS NOT NULL)
    );

-- Index for future proximity queries
CREATE INDEX IF NOT EXISTS idx_profiles_location
  ON profiles(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

---

## Relationships

```
profiles (1) ─── (1) auth.users
    │
    └── avatar_url → Cloudinary
    └── location coordinates → Future proximity features
```

---

## State Transitions

### Avatar State

```
┌─────────────┐    upload     ┌─────────────┐
│  No Avatar  │ ────────────> │   Custom    │
│ (initials)  │               │   Avatar    │
└─────────────┘               └─────────────┘
       ↑                            │
       │         remove             │
       └────────────────────────────┘
```

### Location State

```
┌─────────────┐   select      ┌─────────────┐
│ No Location │ ────────────> │  Location   │
│             │               │    Set      │
└─────────────┘               └─────────────┘
       ↑                            │
       │         clear              │
       └────────────────────────────┘
```
