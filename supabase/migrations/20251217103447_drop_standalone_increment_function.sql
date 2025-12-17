/**
 * Drop Standalone Rate Limit Increment Function
 * Feature 050: AI Assistant - Security Cleanup
 *
 * Removes the standalone increment_ai_rate_limit() function which
 * has been superseded by the atomic check_and_increment_rate_limit().
 *
 * CRITICAL: This prevents race conditions from accidentally calling
 * the non-atomic increment function instead of the atomic version.
 *
 * History:
 * - 20251217080049: Created standalone increment_ai_rate_limit()
 * - 20251217000001: Created atomic check_and_increment_rate_limit()
 * - THIS MIGRATION: Removes standalone function to prevent misuse
 *
 * The atomic function (check_and_increment_rate_limit) combines both
 * check and increment operations with advisory locks, preventing
 * race conditions that could occur if check and increment are separate.
 */

-- Revoke permissions first
REVOKE EXECUTE ON FUNCTION increment_ai_rate_limit(uuid, text) FROM authenticated;

-- Drop the standalone function
DROP FUNCTION IF EXISTS increment_ai_rate_limit(uuid, text);

-- Add comment to clarify why this was removed
COMMENT ON FUNCTION check_and_increment_rate_limit(uuid, text, integer, integer) IS
  'Atomic rate limit check and increment. Replaced standalone increment_ai_rate_limit() to prevent race conditions.';
