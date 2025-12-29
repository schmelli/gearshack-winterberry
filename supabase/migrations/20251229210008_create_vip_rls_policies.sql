-- Migration: Create VIP RLS Policies
-- Feature: 052-vip-loadouts
-- Description: Row Level Security policies for VIP tables

-- =============================================================================
-- Enable RLS on all VIP tables
-- =============================================================================

ALTER TABLE vip_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_loadouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_loadout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_invitations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- VIP Accounts Policies
-- =============================================================================

-- Public read for non-archived VIPs
CREATE POLICY "vip_accounts_public_read" ON vip_accounts
  FOR SELECT
  USING (archived_at IS NULL);

-- Admin write access (create, update, delete)
CREATE POLICY "vip_accounts_admin_write" ON vip_accounts
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Claimed VIP can update their own account
CREATE POLICY "vip_accounts_claimed_update" ON vip_accounts
  FOR UPDATE
  USING (claimed_by_user_id = auth.uid())
  WITH CHECK (claimed_by_user_id = auth.uid());

-- =============================================================================
-- VIP Loadouts Policies
-- =============================================================================

-- Public read for published loadouts of non-archived VIPs
CREATE POLICY "vip_loadouts_public_read" ON vip_loadouts
  FOR SELECT
  USING (
    status = 'published' AND
    vip_id IN (SELECT id FROM vip_accounts WHERE archived_at IS NULL)
  );

-- Admin full access (including drafts)
CREATE POLICY "vip_loadouts_admin_all" ON vip_loadouts
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Claimed VIP can manage their loadouts
CREATE POLICY "vip_loadouts_claimed_manage" ON vip_loadouts
  FOR ALL
  USING (
    vip_id IN (
      SELECT id FROM vip_accounts
      WHERE claimed_by_user_id = auth.uid()
    )
  )
  WITH CHECK (
    vip_id IN (
      SELECT id FROM vip_accounts
      WHERE claimed_by_user_id = auth.uid()
    )
  );

-- =============================================================================
-- VIP Loadout Items Policies
-- =============================================================================

-- Public read for items in published loadouts
CREATE POLICY "vip_loadout_items_public_read" ON vip_loadout_items
  FOR SELECT
  USING (
    vip_loadout_id IN (
      SELECT id FROM vip_loadouts
      WHERE status = 'published' AND
      vip_id IN (SELECT id FROM vip_accounts WHERE archived_at IS NULL)
    )
  );

-- Admin full access
CREATE POLICY "vip_loadout_items_admin_all" ON vip_loadout_items
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Claimed VIP can manage their loadout items
CREATE POLICY "vip_loadout_items_claimed_manage" ON vip_loadout_items
  FOR ALL
  USING (
    vip_loadout_id IN (
      SELECT vl.id FROM vip_loadouts vl
      JOIN vip_accounts va ON vl.vip_id = va.id
      WHERE va.claimed_by_user_id = auth.uid()
    )
  )
  WITH CHECK (
    vip_loadout_id IN (
      SELECT vl.id FROM vip_loadouts vl
      JOIN vip_accounts va ON vl.vip_id = va.id
      WHERE va.claimed_by_user_id = auth.uid()
    )
  );

-- =============================================================================
-- VIP Follows Policies
-- =============================================================================

-- Users can read their own follows
CREATE POLICY "vip_follows_own_read" ON vip_follows
  FOR SELECT
  USING (follower_id = auth.uid());

-- Public can read follower counts (aggregated via functions, not row-level)
-- This policy allows the count function to work
CREATE POLICY "vip_follows_count_read" ON vip_follows
  FOR SELECT
  USING (true);

-- Authenticated users can follow (insert)
CREATE POLICY "vip_follows_authenticated_insert" ON vip_follows
  FOR INSERT
  WITH CHECK (follower_id = auth.uid());

-- Users can unfollow (delete their own follows)
CREATE POLICY "vip_follows_own_delete" ON vip_follows
  FOR DELETE
  USING (follower_id = auth.uid());

-- =============================================================================
-- VIP Bookmarks Policies
-- =============================================================================

-- Users can read their own bookmarks
CREATE POLICY "vip_bookmarks_own_read" ON vip_bookmarks
  FOR SELECT
  USING (user_id = auth.uid());

-- Authenticated users can bookmark (insert)
CREATE POLICY "vip_bookmarks_authenticated_insert" ON vip_bookmarks
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can remove their own bookmarks (delete)
CREATE POLICY "vip_bookmarks_own_delete" ON vip_bookmarks
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- Claim Invitations Policies
-- =============================================================================

-- Admin full access to invitations
CREATE POLICY "claim_invitations_admin_all" ON claim_invitations
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Public read for invitation verification (by token)
-- This allows the claim page to verify tokens without authentication
CREATE POLICY "claim_invitations_token_read" ON claim_invitations
  FOR SELECT
  USING (true);

-- Authenticated users can update their own claim (when claiming)
-- The claim process verifies the user matches the invitation email
CREATE POLICY "claim_invitations_claim_update" ON claim_invitations
  FOR UPDATE
  USING (status IN ('pending', 'verified'))
  WITH CHECK (status IN ('verified', 'claimed'));
