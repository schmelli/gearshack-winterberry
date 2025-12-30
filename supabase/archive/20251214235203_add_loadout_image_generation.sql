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
