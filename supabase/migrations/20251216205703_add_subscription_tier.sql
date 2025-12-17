-- Feature 050: Add subscription_tier column for AI Assistant access control
-- T008: Add subscription_tier column to profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier text
CHECK (subscription_tier IN ('standard', 'trailblazer'))
DEFAULT 'standard';

-- Update existing users to 'standard' tier if column was added
UPDATE profiles
SET subscription_tier = 'standard'
WHERE subscription_tier IS NULL;
