# Quickstart: Loadout UX & Profile Identity

**Feature**: 041-loadout-ux-profile
**Date**: 2025-12-10

## Prerequisites

1. Supabase project configured (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
2. Cloudinary account configured (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`)
3. Google Cloud Console project with Places API enabled

---

## Setup Steps

### 1. Add Google Maps API Key

Add to `.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

**Enable APIs in Google Cloud Console**:
- Maps JavaScript API
- Places API

### 2. Install Dependencies

```bash
npm install @react-google-maps/api
```

### 3. Run Database Migration

Apply the migration in Supabase Dashboard > SQL Editor:

```sql
-- Add location columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add coordinate constraints
ALTER TABLE profiles
  ADD CONSTRAINT profiles_latitude_range
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE profiles
  ADD CONSTRAINT profiles_longitude_range
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

ALTER TABLE profiles
  ADD CONSTRAINT profiles_coordinates_complete
    CHECK (
      (latitude IS NULL AND longitude IS NULL) OR
      (latitude IS NOT NULL AND longitude IS NOT NULL)
    );

-- Add location index
CREATE INDEX IF NOT EXISTS idx_profiles_location
  ON profiles(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

---

## Implementation Order

### P2: Profile Avatar (Priority)

1. **Create avatar utilities** (`lib/utils/avatar.ts`)
   - `getDisplayAvatarUrl(custom, provider)` - fallback chain
   - `getUserInitials(displayName)` - initials generator

2. **Create AvatarUploadInput component** (`components/profile/AvatarUploadInput.tsx`)
   - Circular preview with camera overlay
   - Click to upload via Cloudinary
   - Clear/remove button
   - Fallback chain display

3. **Update ProfileEditForm** (`components/profile/ProfileEditForm.tsx`)
   - Add AvatarUploadInput at top of form
   - Add `avatarUrl` to form schema
   - Handle avatar URL in save

4. **Update ProfileView** (`components/profile/ProfileView.tsx`)
   - Use avatar utilities for display
   - Show proper fallback chain

5. **Update types** (`types/supabase.ts`, `types/database.ts`)
   - Ensure avatar_url is properly typed (already exists)

### P3: Profile Location

1. **Create LocationAutocomplete hook** (`hooks/useLocationAutocomplete.ts`)
   - Google Places autocomplete integration
   - Debounced search
   - Place details fetch for coordinates

2. **Create LocationAutocomplete component** (`components/profile/LocationAutocomplete.tsx`)
   - Input with suggestion dropdown
   - Shows city, country format
   - Clear button

3. **Update ProfileEditForm**
   - Replace location text input with LocationAutocomplete
   - Add hidden fields for latitude/longitude
   - Update form schema with location fields

4. **Update useSupabaseProfile** (`hooks/useSupabaseProfile.ts`)
   - Add location fields to mapDbRowToProfile
   - Handle location fields in updateProfile

5. **Update types** (`types/supabase.ts`, `types/database.ts`, `types/auth.ts`)
   - Add location_name, latitude, longitude fields

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `lib/utils/avatar.ts` | Avatar display utilities |
| `components/profile/AvatarUploadInput.tsx` | Avatar upload component |
| `components/profile/LocationAutocomplete.tsx` | Location picker component |
| `hooks/useLocationAutocomplete.ts` | Google Places integration |
| `hooks/useSupabaseProfile.ts` | Profile data hook |
| `components/profile/ProfileEditForm.tsx` | Profile edit form |
| `components/profile/ProfileView.tsx` | Profile view display |

---

## Testing Checklist

### Avatar Tests

- [ ] Upload custom avatar → displays in profile
- [ ] Remove custom avatar → shows provider avatar
- [ ] No custom or provider → shows initials
- [ ] Avatar persists after page reload
- [ ] Avatar shows in header UserMenu

### Location Tests

- [ ] Type "Ber" → suggestions include "Berlin, Germany"
- [ ] Select city → coordinates saved to database
- [ ] Clear location → all location fields null
- [ ] Location persists after page reload
- [ ] Invalid coordinates rejected

---

## Environment Variables Summary

```bash
# Required (existing)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=

# New for this feature
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

---

## Common Issues

### Google Places Not Loading

1. Check API key is set in `.env.local`
2. Verify Places API enabled in Google Cloud Console
3. Check browser console for API errors
4. Ensure domain is authorized in API credentials

### Avatar Upload Fails

1. Check Cloudinary credentials
2. Verify upload preset allows unsigned uploads
3. Check file size (max 5MB)
4. Check file type (JPG, PNG, WebP)

### Location Coordinates Invalid

1. Both latitude and longitude must be set together
2. Latitude: -90 to 90
3. Longitude: -180 to 180
4. Database constraint enforces completeness
