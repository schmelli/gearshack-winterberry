# Data Model: AI-Powered Loadout Image Generation

**Feature**: 048-ai-loadout-image-gen
**Date**: 2025-12-14
**Constitution**: Types MUST be defined in `@/types` directory

## Overview

This document defines the data entities, relationships, and validation rules for the AI-powered loadout image generation feature. The design extends the existing `loadouts` table and introduces a new `generated_images` table to track up to 3 AI-generated image variations per loadout.

## Entity-Relationship Diagram

```
┌─────────────────┐         ┌──────────────────────┐
│    loadouts     │         │  generated_images    │
├─────────────────┤         ├──────────────────────┤
│ id (PK)         │◄────┐   │ id (PK)              │
│ name            │     │   │ loadout_id (FK)      │
│ trip_date       │     └───│ cloudinary_public_id │
│ description     │         │ cloudinary_url       │
│ seasons         │         │ prompt_used          │
│ activity_types  │         │ style_preferences    │
│ hero_image_id ──┼────┐    │ generation_timestamp │
│ image_source... │    │    │ alt_text             │
│ ...             │    │    │ is_active            │
└─────────────────┘    │    │ created_at           │
                       └───►│                      │
                            └──────────────────────┘
```

**Relationships**:
- One `loadouts` record has many `generated_images` records (1:N)
- One `loadouts` record has one active `hero_image_id` (1:1, nullable)
- `generated_images` limited to 3 most recent per `loadout_id` (enforced by application logic)

## Database Schema

### New Table: `generated_images`

```sql
CREATE TABLE generated_images (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key to loadouts (cascade delete)
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,

  -- Cloudinary Asset References
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  cloudinary_url TEXT NOT NULL,

  -- Generation Metadata
  prompt_used TEXT NOT NULL CHECK (length(prompt_used) > 0),
  style_preferences JSONB NULL,
  generation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Accessibility
  alt_text TEXT NULL,

  -- Active Image Tracking
  is_active BOOLEAN NOT NULL DEFAULT FALSE,

  -- Audit Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_generated_images_loadout_id ON generated_images(loadout_id);
CREATE INDEX idx_generated_images_generation_timestamp ON generated_images(generation_timestamp DESC);
CREATE INDEX idx_generated_images_is_active ON generated_images(loadout_id, is_active) WHERE is_active = TRUE;
```

### Extend Existing Table: `loadouts`

```sql
ALTER TABLE loadouts
ADD COLUMN hero_image_id UUID NULL REFERENCES generated_images(id) ON DELETE SET NULL,
ADD COLUMN image_source_preference TEXT NULL CHECK (image_source_preference IN ('ai_generated', 'manual_upload'));

CREATE INDEX idx_loadouts_hero_image_id ON loadouts(hero_image_id);
```

## TypeScript Type Definitions

**Location**: `/types/loadout-image.ts`

```typescript
/**
 * Loadout Image Generation Types
 * Feature: 048-ai-loadout-image-gen
 */

// =============================================================================
// Generation State Machine
// =============================================================================

/**
 * State for image generation workflow
 */
export type ImageGenerationStatus =
  | 'idle'          // No generation in progress
  | 'generating'    // Initial API call in progress
  | 'retrying'      // Automatic retry after failure
  | 'success'       // Generation completed successfully
  | 'error'         // Permanent failure (after retry)
  | 'fallback';     // Using curated default image

/**
 * State tracking for image generation operations
 */
export interface ImageGenerationState {
  status: ImageGenerationStatus;
  progress?: number; // 0-100 percentage (if available from API)
  error?: string;
  generatedImageId?: string;
}

// =============================================================================
// Generated Image Entity
// =============================================================================

/**
 * Represents a single AI-generated image for a loadout
 * Maps to generated_images table
 */
export interface GeneratedLoadoutImage {
  /** Unique identifier */
  id: string;

  /** Parent loadout reference */
  loadoutId: string;

  /** Cloudinary public_id for asset management */
  cloudinaryPublicId: string;

  /** Full HTTPS URL to the image on Cloudinary CDN */
  cloudinaryUrl: string;

  /** The exact prompt used to generate this image */
  promptUsed: string;

  /** Style preferences applied (null for basic generations) */
  stylePreferences: StylePreferences | null;

  /** When this image was generated (for history ordering) */
  generationTimestamp: Date;

  /** Descriptive alt-text for screen readers */
  altText: string | null;

  /** True if this is the active hero image for the loadout */
  isActive: boolean;

  /** Record creation timestamp */
  createdAt: Date;
}

// =============================================================================
// Style Preferences (P3 Feature)
// =============================================================================

/**
 * User-selected style preferences for image generation
 */
export interface StylePreferences {
  /** Visual style template */
  template?: 'cinematic' | 'documentary' | 'magazine' | 'instagram';

  /** Time of day for lighting */
  timeOfDay?: 'golden_hour' | 'blue_hour' | 'midday' | 'dawn' | 'dusk';

  /** Atmospheric quality hints (e.g., "misty morning") */
  atmosphere?: string;
}

// =============================================================================
// Image History
// =============================================================================

/**
 * Collection of generated images for a single loadout
 * Maximum 3 images maintained
 */
export interface LoadoutImageHistory {
  /** Loadout this history belongs to */
  loadoutId: string;

  /** Up to 3 most recent images, ordered by generation_timestamp DESC */
  images: GeneratedLoadoutImage[];

  /** UUID of the currently active image (if any) */
  activeImageId: string | null;
}

// =============================================================================
// Extended Loadout Type
// =============================================================================

/**
 * Extension to existing Loadout interface
 * Add these fields to types/loadout.ts
 */
export interface LoadoutImageFields {
  /** Reference to active hero image (nullable) */
  heroImageId: string | null;

  /** User preference: ai_generated or manual_upload */
  imageSourcePreference: 'ai_generated' | 'manual_upload' | null;
}

// =============================================================================
// Fallback Images
// =============================================================================

/**
 * Curated default image categorized by activity and season
 */
export interface FallbackImage {
  /** Unique identifier */
  id: string;

  /** Cloudinary URL to curated image */
  url: string;

  /** Primary activity type this image suits */
  activityType: 'hiking' | 'camping' | 'climbing' | 'skiing' | 'backpacking' | 'generic';

  /** Season this image is appropriate for */
  season: 'spring' | 'summer' | 'fall' | 'winter';

  /** Descriptive alt-text */
  altText: string;
}
```

## Validation Rules

### Application-Level Constraints

1. **History Limit**:
   - Maximum 3 `generated_images` records per `loadout_id`
   - When inserting 4th image, automatically delete oldest (by `generation_timestamp`)
   - Deletion logic in `useLoadoutImageGeneration` hook

2. **Active Image Uniqueness**:
   - Only ONE `generated_images` record per `loadout_id` can have `is_active = TRUE`
   - When setting new active image, set all others to `is_active = FALSE`
   - Enforced via database transaction

3. **Prompt Requirements**:
   - `prompt_used` must not be empty string
   - Minimum 10 characters (meaningful prompt)
   - Maximum 1000 characters (API limit)

4. **URL Validation**:
   - `cloudinary_url` must match pattern: `https://res.cloudinary.com/{cloud_name}/...`
   - Validated via Zod schema before database insert

### Database-Level Constraints

1. **Foreign Key Integrity**:
   - `generated_images.loadout_id` CASCADE DELETE (remove images when loadout deleted)
   - `loadouts.hero_image_id` SET NULL ON DELETE (don't break loadout if image deleted)

2. **Check Constraints**:
   - `prompt_used` length > 0
   - `image_source_preference` enum validation

3. **Unique Constraints**:
   - `cloudinary_public_id` must be globally unique

## State Transitions

### Image Generation Lifecycle

```
┌─────────┐
│  idle   │ (No image or ready for new generation)
└────┬────┘
     │ User clicks "Generate Image"
     ▼
┌─────────────┐
│ generating  │ (API call in progress)
└──┬────┬─────┘
   │    │ API timeout/failure
   │    ▼
   │ ┌──────────┐
   │ │ retrying │ (Automatic retry once)
   │ └──┬───┬───┘
   │    │   │ Retry failure
   │    │   ▼
   │    │ ┌──────────┐
   │    │ │ fallback │ (Using curated default)
   │    │ └──────────┘
   │    │ Retry success
   │    ▼
   │ ┌─────────┐
   └►│ success │ (Image generated and stored)
     └─────────┘

From success state:
- User can "Generate Another" → back to generating
- User can select from history (up to 3 options)
- User can upload manual photo → image_source_preference = 'manual_upload'
```

### Active Image Selection

```
Multiple images in history:
┌──────────────┐  User selects   ┌──────────────┐
│ Image 1      │  different      │ Image 2      │
│ is_active: T ├────────────────►│ is_active: T │
└──────────────┘  variation      └──────────────┘
                                       │
                                       │ Database transaction:
                                       │ 1. SET is_active = FALSE for Image 1
                                       │ 2. SET is_active = TRUE for Image 2
                                       │ 3. UPDATE loadouts.hero_image_id
                                       ▼
                                  ┌──────────────┐
                                  │ Image 1      │
                                  │ is_active: F │
                                  └──────────────┘
```

## Data Access Patterns

### Query: Get Image History for Loadout

```sql
SELECT *
FROM generated_images
WHERE loadout_id = $1
ORDER BY generation_timestamp DESC
LIMIT 3;
```

**Index Used**: `idx_generated_images_loadout_id`, `idx_generated_images_generation_timestamp`

### Query: Get Active Image for Loadout

```sql
SELECT gi.*
FROM loadouts l
JOIN generated_images gi ON l.hero_image_id = gi.id
WHERE l.id = $1;
```

**Index Used**: `idx_loadouts_hero_image_id`

### Mutation: Insert New Generated Image (with history cleanup)

```sql
-- 1. Insert new image
INSERT INTO generated_images (loadout_id, cloudinary_public_id, cloudinary_url, prompt_used, style_preferences, alt_text, is_active)
VALUES ($1, $2, $3, $4, $5, $6, TRUE)
RETURNING id;

-- 2. Deactivate previous active image
UPDATE generated_images
SET is_active = FALSE
WHERE loadout_id = $1 AND id != $7;

-- 3. Update loadout hero_image_id
UPDATE loadouts
SET hero_image_id = $7, image_source_preference = 'ai_generated'
WHERE id = $1;

-- 4. Delete oldest images beyond 3-image limit
DELETE FROM generated_images
WHERE loadout_id = $1
AND id NOT IN (
  SELECT id
  FROM generated_images
  WHERE loadout_id = $1
  ORDER BY generation_timestamp DESC
  LIMIT 3
);
```

**Wrapped in Transaction**: Ensures atomicity

## Migration Script

**Location**: `/supabase/migrations/YYYYMMDDHHMMSS_add_loadout_image_generation.sql`

```sql
-- Migration: Add AI-powered image generation for loadouts
-- Feature: 048-ai-loadout-image-gen

BEGIN;

-- Create generated_images table
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  cloudinary_url TEXT NOT NULL,
  prompt_used TEXT NOT NULL CHECK (length(prompt_used) > 0),
  style_preferences JSONB NULL,
  generation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alt_text TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_generated_images_loadout_id ON generated_images(loadout_id);
CREATE INDEX idx_generated_images_generation_timestamp ON generated_images(generation_timestamp DESC);
CREATE INDEX idx_generated_images_is_active ON generated_images(loadout_id, is_active) WHERE is_active = TRUE;

-- Extend loadouts table
ALTER TABLE loadouts
ADD COLUMN IF NOT EXISTS hero_image_id UUID NULL REFERENCES generated_images(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS image_source_preference TEXT NULL CHECK (image_source_preference IN ('ai_generated', 'manual_upload'));

CREATE INDEX idx_loadouts_hero_image_id ON loadouts(hero_image_id);

-- Enable Row Level Security
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/modify their own loadout images
CREATE POLICY "Users can manage their own loadout images"
ON generated_images
FOR ALL
USING (
  loadout_id IN (
    SELECT id FROM loadouts WHERE user_id = auth.uid()
  )
);

COMMIT;
```

## Rollback Script

```sql
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_loadouts_hero_image_id;
DROP INDEX IF EXISTS idx_generated_images_is_active;
DROP INDEX IF EXISTS idx_generated_images_generation_timestamp;
DROP INDEX IF EXISTS idx_generated_images_loadout_id;

-- Remove loadouts extensions
ALTER TABLE loadouts
DROP COLUMN IF EXISTS image_source_preference,
DROP COLUMN IF EXISTS hero_image_id;

-- Drop table (CASCADE removes foreign key constraints)
DROP TABLE IF EXISTS generated_images CASCADE;

COMMIT;
```

## Next Steps

1. Run migration script in Supabase dashboard or via CLI
2. Implement TypeScript types in `/types/loadout-image.ts`
3. Create database access functions in `/lib/supabase/loadout-images.ts`
4. Build `useLoadoutImageGeneration` hook with state machine
5. Implement UI components with proper loading/error states
