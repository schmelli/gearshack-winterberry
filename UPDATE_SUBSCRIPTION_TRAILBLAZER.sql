-- Update your user's subscription tier to 'trailblazer' to access AI Assistant
-- Run this in Supabase SQL Editor

-- Update the currently logged-in user's subscription tier
UPDATE profiles
SET subscription_tier = 'trailblazer'
WHERE id = auth.uid();

-- Verify the update
SELECT id, email, subscription_tier, created_at
FROM profiles
WHERE id = auth.uid();
