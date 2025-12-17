/**
 * Fix ai_rate_limits Primary Key
 * Feature 050: AI Assistant - Security Fix
 *
 * Changes primary key from user_id to composite (user_id, endpoint)
 * to support per-endpoint rate limiting as intended by the code.
 *
 * Issue: Original table had user_id as PK but code queries by both
 * user_id AND endpoint, requiring composite primary key.
 */

-- Drop existing primary key constraint
ALTER TABLE ai_rate_limits DROP CONSTRAINT ai_rate_limits_pkey;

-- Drop redundant index (will be covered by composite PK)
DROP INDEX IF EXISTS ai_rate_limits_user_id_endpoint_idx;

-- Add composite primary key
ALTER TABLE ai_rate_limits ADD PRIMARY KEY (user_id, endpoint);
