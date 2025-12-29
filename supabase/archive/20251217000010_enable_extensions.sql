-- Migration: Enable PostgreSQL extensions for price tracking
-- Feature: 050-price-tracking
-- Date: 2025-12-17
-- Purpose: Enable pg_trgm extension for fuzzy text matching

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extension is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
  ) THEN
    RAISE EXCEPTION 'pg_trgm extension failed to install';
  END IF;
END
$$;
