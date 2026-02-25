# Research: Loadout UX & Profile Identity

**Feature**: 041-loadout-ux-profile
**Date**: 2025-12-10

## Summary

Research findings for implementing P2 (Profile Avatar Management) and P3 (Profile Location Setting). **P1 (Loadout Search & Filter) is already implemented and skipped.**

---

## Research Area 1: Avatar Storage & Display

### Current State

**Profiles Table Schema** (from `supabase/migrations/20251210_initial_schema.sql`):
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,  -- Already exists!
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Profile Type** (from `types/supabase.ts:79-93`):
```typescript
export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;  // Already supported
  createdAt: Date;
  updatedAt: Date;
}
```

**MergedUser Type** (from `types/auth.ts:45-58`):
```typescript
export interface MergedUser {
  uid: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;  // Custom avatar takes precedence
  // ... other fields
}
```

**Auth Provider Logic** (from `components/auth/SupabaseAuthProvider.tsx:129-146`):
- `photoURL` comes from `supabaseAuth.user.user_metadata?.avatar_url` (provider avatar)
- `mergedUser.avatarUrl` prioritizes `userProfile?.avatarUrl` over `user.photoURL`
- Fallback hierarchy already implemented: custom > provider > null

### Decision

**Use existing `avatar_url` column** - no schema migration needed for avatar storage.

**Implementation approach**:
1. Reuse `ImageUploadZone` component pattern for avatar upload
2. Create `AvatarUploadZone` component (simplified, single image, no bg removal)
3. Upload to Cloudinary folder: `gearshack/users/{userId}/avatar`
4. Update `ProfileEditForm` to include avatar upload section
5. Modify `ProfileView` to display avatar with fallback chain

**Rationale**:
- Schema already supports `avatar_url`
- Cloudinary infrastructure proven reliable for gear images
- Consistent UX with existing image upload patterns

**Alternatives Rejected**:
- Firebase Storage: Deprecated in Feature 038
- Direct URL input only: Poor UX for profile photos

---

## Research Area 2: Avatar Display Components

### Current State

**Avatar Component** (from `components/ui/avatar.tsx`):
- Uses Radix UI Avatar primitive
- Supports `AvatarImage` + `AvatarFallback` pattern
- Already handles image load failures with fallback

**UserMenu** (from `components/layout/UserMenu.tsx`):
- Displays avatar in header dropdown
- Uses `mergedUser.avatarUrl` with initials fallback

### Decision

**Implement avatar fallback chain in `getAvatarUrl` utility**:
1. Custom avatar URL (from profiles.avatar_url)
2. Provider avatar URL (from auth.user.user_metadata.avatar_url)
3. null (triggers initials fallback)

**Create helper function** in `lib/utils/avatar.ts`:
```typescript
export function getDisplayAvatar(
  customAvatarUrl: string | null | undefined,
  providerAvatarUrl: string | null | undefined
): string | null {
  return customAvatarUrl || providerAvatarUrl || null;
}

export function getUserInitials(displayName: string | null): string {
  if (!displayName) return '?';
  return displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
```

---

## Research Area 3: Location Autocomplete Provider

### Options Evaluated

| Provider | Cost | Quality | Setup Complexity |
|----------|------|---------|------------------|
| Google Places API | $17/1000 requests | Excellent | Moderate (API key, billing) |
| Mapbox Geocoding | $5/1000 requests | Good | Moderate |
| OpenCage | $50/10000/month | Good | Simple (API key) |
| Nominatim (free) | Free | Basic | Simple (rate limited) |

### Decision

**Use Google Places Autocomplete** via `@react-google-maps/api` library.

**Rationale**:
- Industry standard for location autocomplete
- Returns structured data including lat/lng
- Excellent UX with predictions
- Already common in production apps

**Alternatives Considered**:
- Mapbox: Good option but less familiar to users
- Nominatim: Free but rate-limited and less accurate
- Manual lat/lng input: Terrible UX

**Implementation**:
1. Add `@react-google-maps/api` dependency
2. Create `LocationAutocomplete` component using `usePlacesAutocomplete` hook
3. Store: `location_name` (string), `latitude` (float), `longitude` (float)
4. Add new columns to profiles table via migration

---

## Research Area 4: Profile Schema Extension

### Current Schema

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Required Extension

```sql
ALTER TABLE profiles ADD COLUMN location_name TEXT;
ALTER TABLE profiles ADD COLUMN latitude DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN longitude DOUBLE PRECISION;
```

### Decision

**Create new migration file**: `20251211_profile_location.sql`

**Rationale**:
- Non-breaking change (all columns nullable)
- No existing data affected
- Simple ALTER TABLE statements

---

## Research Area 5: Cloudinary Avatar Upload

### Current Implementation

From `hooks/useCloudinaryUpload.ts`:
- `uploadLocal()`: Local file → optional bg removal → Cloudinary
- `uploadUrl()`: External URL → Cloudinary
- Folder structure: `gearshack/users/{userId}/{itemId}`

### Decision

**Reuse `useCloudinaryUpload` hook** with avatar-specific options:
- Folder: `gearshack/users/{userId}/avatar`
- No background removal (not needed for profile photos)
- Simplified progress tracking

**New component**: `AvatarUploadInput` in `components/profile/`
- Circular preview (matches Avatar component)
- Camera icon overlay for edit affordance
- Click to upload, with clear/remove option

---

## Research Area 6: Form Integration

### Current ProfileEditForm

From `components/profile/ProfileEditForm.tsx`:
- Uses react-hook-form + Zod
- Fields: displayName, trailName, bio, location (text only), social links
- Existing `location` field is just text - no coordinates

### Decision

**Replace `location` text field** with `LocationAutocomplete` component that:
1. Shows autocomplete suggestions on typing
2. On selection, updates three hidden fields: location_name, latitude, longitude
3. Displays friendly location name in UI

**Update schema** in `lib/validations/profile-schema.ts`:
```typescript
locationName: z.string().max(200).optional().or(z.literal('')),
latitude: z.number().min(-90).max(90).optional(),
longitude: z.number().min(-180).max(180).optional(),
```

---

## Technical Decisions Summary

| Area | Decision | Rationale |
|------|----------|-----------|
| Avatar storage | Use existing `avatar_url` column | No migration needed |
| Avatar upload | Cloudinary via existing hook | Proven infrastructure |
| Location provider | Google Places API | Industry standard, excellent UX |
| Location storage | New columns: location_name, latitude, longitude | Structured data for future proximity features |
| Form integration | Replace location text field with autocomplete | Better UX, captures coordinates |

---

## Dependencies to Add

```json
{
  "@react-google-maps/api": "^2.19.3"
}
```

**Environment Variable**:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
```

---

## Files to Create/Modify

### New Files
- `lib/utils/avatar.ts` - Avatar helper functions
- `components/profile/AvatarUploadInput.tsx` - Avatar upload component
- `components/profile/LocationAutocomplete.tsx` - Location autocomplete component
- `supabase/migrations/20251211_profile_location.sql` - Schema migration

### Files to Modify
- `types/supabase.ts` - Add location fields to Profile type
- `types/database.ts` - Add location columns to profiles table type
- `types/auth.ts` - Add location fields to UserProfile and MergedUser
- `lib/validations/profile-schema.ts` - Add location validation
- `hooks/useSupabaseProfile.ts` - Handle location fields in update
- `components/profile/ProfileEditForm.tsx` - Add avatar upload and location autocomplete
- `components/profile/ProfileView.tsx` - Display avatar with fallback
- `components/auth/SupabaseAuthProvider.tsx` - Include location in merged user
