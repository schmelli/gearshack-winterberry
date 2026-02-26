-- ============================================================================
-- Migration: Admin RLS Policies
-- Feature: Admin Section Enhancement
--
-- Grants admin-specific permissions for user management and wiki oversight.
-- ============================================================================

-- ============================================================================
-- Profile Policies for Admin
-- ============================================================================

-- Admins can SELECT all profiles (for user management)
CREATE POLICY "profiles_admin_select_all" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Admins can UPDATE any profile (for role/tier/status changes)
CREATE POLICY "profiles_admin_update_any" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ============================================================================
-- Wiki Page Policies for Admin
-- ============================================================================

-- Admins can SELECT all wiki pages (including drafts and archived)
DROP POLICY IF EXISTS "wiki_pages_admin_select_all" ON wiki_pages;
CREATE POLICY "wiki_pages_admin_select_all" ON wiki_pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can UPDATE any wiki page (for locking, status changes)
DROP POLICY IF EXISTS "wiki_pages_admin_update_any" ON wiki_pages;
CREATE POLICY "wiki_pages_admin_update_any" ON wiki_pages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can DELETE wiki pages
DROP POLICY IF EXISTS "wiki_pages_admin_delete" ON wiki_pages;
CREATE POLICY "wiki_pages_admin_delete" ON wiki_pages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- Wiki Page Reports Policies for Admin
-- ============================================================================

-- Admins can SELECT all wiki reports
DROP POLICY IF EXISTS "wiki_page_reports_admin_select" ON wiki_page_reports;
CREATE POLICY "wiki_page_reports_admin_select" ON wiki_page_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can UPDATE wiki reports (resolve/dismiss)
DROP POLICY IF EXISTS "wiki_page_reports_admin_update" ON wiki_page_reports;
CREATE POLICY "wiki_page_reports_admin_update" ON wiki_page_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- Wiki Categories Policies for Admin (if not already existing)
-- ============================================================================

-- Admins can INSERT wiki categories
DROP POLICY IF EXISTS "wiki_categories_admin_insert" ON wiki_categories;
CREATE POLICY "wiki_categories_admin_insert" ON wiki_categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can UPDATE wiki categories
DROP POLICY IF EXISTS "wiki_categories_admin_update" ON wiki_categories;
CREATE POLICY "wiki_categories_admin_update" ON wiki_categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can DELETE wiki categories
DROP POLICY IF EXISTS "wiki_categories_admin_delete" ON wiki_categories;
CREATE POLICY "wiki_categories_admin_delete" ON wiki_categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON POLICY "profiles_admin_select_all" ON profiles IS 'Admins can view all user profiles';
COMMENT ON POLICY "profiles_admin_update_any" ON profiles IS 'Admins can modify any user profile';
