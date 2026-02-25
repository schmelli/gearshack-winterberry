-- Migration: GDPR Performance Indexes
-- Feature: 001-mastra-agentic-voice
-- Created: 2025-01-28
-- Description: Adds missing indexes for GDPR deletion performance
--
-- CRITICAL: Without these indexes, GDPR deletions on large tables (100K+ records)
-- would require full table scans, taking minutes instead of milliseconds.
-- This violates GDPR SLA requirements for timely data deletion.

-- ==================== AI MESSAGES INDEXES ====================

-- Index for GDPR deletion: ai_messages by user_id
-- Used by: GDPR deletion function in 20250126_gdpr_deletion_records.sql
-- Impact: Speeds up deletion from O(n) to O(log n) where n = total messages
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_id
  ON ai_messages(user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_ai_messages_user_id IS 'Speeds up GDPR deletions by user_id (critical for performance)';

-- ==================== CONVERSATION MEMORY INDEXES ====================

-- Additional index for user-specific queries (already has conversation-level index)
-- This helps with GDPR deletion and user data exports
CREATE INDEX IF NOT EXISTS idx_conversation_memory_user_id
  ON conversation_memory(user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_conversation_memory_user_id IS 'Speeds up GDPR deletions and user data exports';

-- ==================== GENERATED IMAGES INDEXES ====================

-- Check if generated_images table exists (from Feature 048)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'generated_images'
  ) THEN
    -- Add index for GDPR deletion if table exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'generated_images'
      AND indexname = 'idx_generated_images_user_id'
    ) THEN
      CREATE INDEX idx_generated_images_user_id
        ON generated_images(user_id)
        WHERE user_id IS NOT NULL;

      COMMENT ON INDEX idx_generated_images_user_id IS 'Speeds up GDPR deletions for AI-generated images';
    END IF;
  END IF;
END $$;

-- ==================== VALIDATION ====================

-- Log index creation for monitoring
DO $$
DECLARE
  v_ai_messages_count INTEGER;
  v_conversation_memory_count INTEGER;
BEGIN
  -- Count affected rows (for performance estimation)
  SELECT COUNT(*) INTO v_ai_messages_count FROM ai_messages;
  SELECT COUNT(*) INTO v_conversation_memory_count FROM conversation_memory;

  RAISE NOTICE 'GDPR performance indexes created:';
  RAISE NOTICE '  - ai_messages: % rows indexed', v_ai_messages_count;
  RAISE NOTICE '  - conversation_memory: % rows indexed', v_conversation_memory_count;
  RAISE NOTICE 'GDPR deletions will now use index scans instead of sequential scans';
END $$;
