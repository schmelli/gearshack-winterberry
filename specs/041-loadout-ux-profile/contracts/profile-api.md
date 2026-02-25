# API Contract: Profile Management

**Feature**: 041-loadout-ux-profile
**Date**: 2025-12-10

## Overview

This document defines the API contracts for profile avatar and location management. The API uses Supabase client-side SDK (not REST endpoints) for direct database operations.

---

## Profile Update Operations

### Update Profile

**Method**: Supabase Client SDK
**Table**: `profiles`
**Operation**: UPDATE

**Request Type**:
```typescript
interface ProfileUpdateRequest {
  displayName?: string;
  avatarUrl?: string | null;    // null removes custom avatar
  locationName?: string | null; // null removes location
  latitude?: number | null;
  longitude?: number | null;
}
```

**Response Type**:
```typescript
interface ProfileUpdateResponse {
  success: boolean;
  error: string | null;
  profile: Profile | null;
}
```

**Example Usage**:
```typescript
const { error } = await supabase
  .from('profiles')
  .update({
    display_name: 'John Doe',
    avatar_url: 'https://res.cloudinary.com/...',
    location_name: 'Berlin, Germany',
    latitude: 52.5200,
    longitude: 13.4050,
  })
  .eq('id', userId);
```

**Validation**:
- `avatarUrl`: Valid URL format or null
- `latitude`: Range -90 to 90
- `longitude`: Range -180 to 180
- Both coordinates must be provided together or both null

---

## Avatar Upload

### Upload to Cloudinary

**Method**: HTTP POST
**Endpoint**: `https://api.cloudinary.com/v1_1/{cloudName}/image/upload`

**Request**:
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('upload_preset', 'gearshack_unsigned');
formData.append('folder', `gearshack/users/${userId}/avatar`);
```

**Response**:
```typescript
interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}
```

**Error Response**:
```typescript
interface CloudinaryErrorResponse {
  error: {
    message: string;
  };
}
```

---

## Location Autocomplete

### Google Places Autocomplete

**Method**: Google Maps JavaScript API
**Service**: `google.maps.places.AutocompleteService`

**Request**:
```typescript
interface PlacesAutocompleteRequest {
  input: string;
  types: ['(cities)'];  // Restrict to cities
  language?: string;
}
```

**Response**:
```typescript
interface PlacesAutocompleteResult {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}
```

### Get Place Details (for coordinates)

**Method**: Google Maps JavaScript API
**Service**: `google.maps.places.PlacesService.getDetails`

**Request**:
```typescript
interface PlaceDetailsRequest {
  placeId: string;
  fields: ['geometry', 'formatted_address', 'name'];
}
```

**Response**:
```typescript
interface PlaceDetailsResult {
  geometry: {
    location: {
      lat(): number;
      lng(): number;
    };
  };
  formatted_address: string;
  name: string;
}
```

---

## Hook Contracts

### useSupabaseProfile (Extended)

**Input**:
```typescript
useSupabaseProfile(userId: string | null): UseSupabaseProfileReturn
```

**Output**:
```typescript
interface UseSupabaseProfileReturn {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: ProfileUpdate) => Promise<{ error: string | null }>;
}
```

### useCloudinaryUpload (Reused)

**Input**:
```typescript
useCloudinaryUpload(): UseCloudinaryUploadReturn
```

**Output**:
```typescript
interface UseCloudinaryUploadReturn {
  status: 'idle' | 'processing' | 'uploading' | 'success' | 'error';
  progress: number;
  error: string | null;
  uploadLocal: (
    file: File,
    options: { userId: string; itemId: string; removeBackground?: boolean }
  ) => Promise<string | null>;
  uploadUrl: (
    url: string,
    options: { userId: string; itemId: string }
  ) => Promise<string | null>;
  reset: () => void;
}
```

### useLocationAutocomplete (New)

**Input**:
```typescript
useLocationAutocomplete(options?: LocationAutocompleteOptions): UseLocationAutocompleteReturn

interface LocationAutocompleteOptions {
  debounceMs?: number;  // Default: 300
  minChars?: number;    // Default: 3
}
```

**Output**:
```typescript
interface UseLocationAutocompleteReturn {
  suggestions: LocationSuggestion[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  selectPlace: (placeId: string) => Promise<LocationSelection | null>;
  clear: () => void;
}

interface LocationSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface LocationSelection {
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string;
}
```

---

## Component Contracts

### AvatarUploadInput

**Props**:
```typescript
interface AvatarUploadInputProps {
  /** Current avatar URL */
  value: string | null;
  /** Provider avatar URL for fallback display */
  providerAvatarUrl: string | null;
  /** User display name for initials fallback */
  displayName: string | null;
  /** User ID for Cloudinary folder */
  userId: string;
  /** Callback when avatar URL changes */
  onChange: (url: string | null) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
}
```

### LocationAutocomplete

**Props**:
```typescript
interface LocationAutocompleteProps {
  /** Current location name */
  value: string;
  /** Callback when location is selected */
  onSelect: (location: LocationSelection | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
}
```

---

## Error Codes

| Code | Description | User Message |
|------|-------------|--------------|
| `INVALID_FILE_TYPE` | File is not an image | "Please select an image file (JPG, PNG, or WebP)" |
| `FILE_TOO_LARGE` | File exceeds 5MB | "Image must be smaller than 5MB" |
| `UPLOAD_FAILED` | Cloudinary upload error | "Failed to upload image. Please try again." |
| `LOCATION_NOT_FOUND` | Place details unavailable | "Unable to get location details. Please try another city." |
| `INVALID_COORDINATES` | Lat/lng out of range | "Invalid location coordinates" |
| `PROFILE_UPDATE_FAILED` | Database update error | "Failed to save profile. Please try again." |
