# Data Model: Restore Product Search with Cloudinary Integration

**Feature**: 039-product-search-cloudinary
**Date**: 2025-12-09

## Entities

### 1. ImageSearchResult (Existing - No Changes)

Already defined in `app/actions/image-search.ts`:

```typescript
export interface ImageSearchResult {
  /** Full-size image URL from Google Images */
  imageUrl: string;
  /** Thumbnail URL for grid display */
  thumbnailUrl: string;
  /** Image title/alt text */
  title: string;
}
```

**Source**: Serper.dev Google Images API
**Usage**: Populated by `searchGearImages` server action, displayed in `ProductSearchGrid`

### 2. ProductSearchState (New)

Search state managed by `useProductSearch` hook:

```typescript
export type ProductSearchStatus = 'idle' | 'searching' | 'error';

export interface ProductSearchState {
  /** Current search query */
  query: string;
  /** Search results from Serper API */
  results: ImageSearchResult[];
  /** Current search status */
  status: ProductSearchStatus;
  /** Error message if status is 'error' */
  error: string | null;
}
```

**Lifecycle**:
- `idle` → User has not searched or results cleared
- `searching` → API request in progress
- `error` → API request failed

### 3. CloudinaryUploadResult (Existing - No Changes)

Already defined in `types/cloudinary.ts`:

```typescript
export interface CloudinaryUploadResult {
  /** Secure HTTPS URL for the uploaded image */
  secure_url: string;
  /** Cloudinary public ID */
  public_id: string;
  /** Asset ID */
  asset_id: string;
  /** Original filename */
  original_filename: string;
  /** File format (e.g., 'png', 'jpg') */
  format: string;
  /** File size in bytes */
  bytes: number;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
}
```

### 4. UseCloudinaryUploadReturn (Extended)

Extended hook return interface:

```typescript
export interface UseCloudinaryUploadReturn {
  /** Current upload status */
  status: CloudinaryUploadStatus;
  /** Upload progress (0-100) */
  progress: number;
  /** Error message if status is 'error' */
  error: string | null;
  /** Upload a local file with optional background removal */
  uploadLocal: (
    file: File,
    options: { userId: string; itemId: string; removeBackground?: boolean }
  ) => Promise<string | null>;
  /** Upload an external URL to Cloudinary (NEW) */
  uploadUrl: (
    url: string,
    options: { userId: string; itemId: string }
  ) => Promise<string | null>;
  /** Handle successful upload from Cloudinary Widget */
  handleWidgetResult: (secureUrl: string) => void;
  /** Reset state to idle */
  reset: () => void;
}
```

### 5. UseProductSearchReturn (New)

Hook return interface for product search:

```typescript
export interface UseProductSearchReturn {
  /** Current search query */
  query: string;
  /** Update search query */
  setQuery: (query: string) => void;
  /** Search results */
  results: ImageSearchResult[];
  /** Search status */
  status: ProductSearchStatus;
  /** Error message */
  error: string | null;
  /** Execute search with current query */
  search: () => Promise<void>;
  /** Clear results and reset state */
  clear: () => void;
}
```

## Relationships

```
┌─────────────────┐      uses       ┌─────────────────────┐
│ ImageUploadZone │ ──────────────► │ useProductSearch    │
│   (Component)   │                 │     (Hook)          │
└────────┬────────┘                 └──────────┬──────────┘
         │                                     │
         │ uses                                │ calls
         ▼                                     ▼
┌─────────────────────┐             ┌─────────────────────┐
│ useCloudinaryUpload │             │ searchGearImages    │
│      (Hook)         │             │  (Server Action)    │
└──────────┬──────────┘             └─────────────────────┘
           │
           │ uploadUrl()
           ▼
┌─────────────────────┐
│   Cloudinary API    │
│  (REST Upload)      │
└─────────────────────┘
```

## Validation Rules

### Search Query
- Minimum length: 1 character (after trim)
- Maximum length: 100 characters
- Debounce: 300ms between searches

### URL Upload
- URL must start with `http://` or `https://`
- Cloudinary handles format validation server-side
- Max file size determined by Cloudinary preset

## State Transitions

### Search Flow
```
idle ──[user types]──► idle (query updated)
idle ──[search click]──► searching
searching ──[success]──► idle (results populated)
searching ──[error]──► error
error ──[retry]──► searching
any ──[clear]──► idle (reset all)
```

### URL Upload Flow
```
idle ──[click result]──► uploading
uploading ──[success]──► success
uploading ──[error]──► error
success ──[timeout]──► idle
error ──[retry]──► uploading
```
