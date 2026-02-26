-- ============================================================================
-- Migration: eBay Listing Feedback
-- Feature: 054-ebay-integration
-- Purpose: Store user feedback on eBay listing relevance for ML training
-- ============================================================================

-- Create table for storing user feedback on eBay listings
CREATE TABLE IF NOT EXISTS ebay_listing_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who gave feedback
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The gear item context
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE SET NULL,
  search_query TEXT NOT NULL,

  -- eBay listing details (denormalized for analysis)
  ebay_item_id TEXT NOT NULL,
  listing_title TEXT NOT NULL,
  listing_price DECIMAL(10, 2),
  listing_currency TEXT DEFAULT 'EUR',
  listing_condition TEXT,
  listing_url TEXT,

  -- Feedback
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('irrelevant', 'wrong_product', 'accessory', 'knockoff', 'other')),
  feedback_reason TEXT, -- Optional free-text reason

  -- Metadata for analysis
  brand_name TEXT,
  item_name TEXT,
  was_filtered BOOLEAN DEFAULT false, -- Was this listing initially filtered out?

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for analysis queries
CREATE INDEX idx_ebay_feedback_user ON ebay_listing_feedback(user_id);
CREATE INDEX idx_ebay_feedback_search ON ebay_listing_feedback(search_query);
CREATE INDEX idx_ebay_feedback_type ON ebay_listing_feedback(feedback_type);
CREATE INDEX idx_ebay_feedback_title ON ebay_listing_feedback USING gin(to_tsvector('english', listing_title));

-- RLS policies
ALTER TABLE ebay_listing_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
ON ebay_listing_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON ebay_listing_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role can access all feedback (for ML analysis)
CREATE POLICY "Service role full access"
ON ebay_listing_feedback
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- Aggregation view for analyzing common irrelevant patterns
-- ============================================================================

CREATE OR REPLACE VIEW ebay_feedback_patterns AS
SELECT
  feedback_type,
  COUNT(*) as feedback_count,
  -- Extract common words from rejected listings
  unnest(string_to_array(lower(listing_title), ' ')) as title_word,
  COUNT(*) as word_frequency
FROM ebay_listing_feedback
GROUP BY feedback_type, title_word
HAVING COUNT(*) >= 3 -- Only show patterns with 3+ occurrences
ORDER BY feedback_count DESC, word_frequency DESC;

-- Comment for documentation
COMMENT ON TABLE ebay_listing_feedback IS 'Stores user feedback on eBay listing relevance for improving search filtering over time';
COMMENT ON COLUMN ebay_listing_feedback.feedback_type IS 'Type of issue: irrelevant, wrong_product, accessory, knockoff, other';
COMMENT ON COLUMN ebay_listing_feedback.was_filtered IS 'Whether this listing was initially filtered out by our algorithm';
