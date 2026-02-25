/**
 * Community Wiki Schema Migration
 *
 * Feature: Community Section Restructure
 *
 * Creates tables for the community-editable wiki:
 * - wiki_categories: Hierarchical categories for organizing pages
 * - wiki_pages: Main wiki page content
 * - wiki_revisions: Full revision history for each page
 * - wiki_page_reports: Moderation reports for inappropriate content
 */

-- Wiki Categories
-- Supports hierarchical structure with parent_id for nested categories
CREATE TABLE IF NOT EXISTS wiki_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_de TEXT NOT NULL,
    description_en TEXT,
    description_de TEXT,
    parent_id UUID REFERENCES wiki_categories(id) ON DELETE SET NULL,
    icon TEXT, -- Lucide icon name
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Wiki Page Status Enum
DO $$ BEGIN
    CREATE TYPE wiki_page_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Wiki Pages
-- Main content table with full-text search support
CREATE TABLE IF NOT EXISTS wiki_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title_en TEXT NOT NULL,
    title_de TEXT NOT NULL,
    content_en TEXT NOT NULL DEFAULT '',
    content_de TEXT NOT NULL DEFAULT '',
    content_html_en TEXT, -- Pre-rendered HTML for performance
    content_html_de TEXT,
    category_id UUID REFERENCES wiki_categories(id) ON DELETE SET NULL,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status wiki_page_status DEFAULT 'draft',
    revision_number INTEGER DEFAULT 1,
    view_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false, -- Only admins can edit
    locked_reason TEXT,
    search_vector_en tsvector,
    search_vector_de tsvector,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ
);

-- Wiki Revisions
-- Full edit history for each page
CREATE TABLE IF NOT EXISTS wiki_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    title_en TEXT NOT NULL,
    title_de TEXT NOT NULL,
    content_en TEXT NOT NULL,
    content_de TEXT NOT NULL,
    editor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    edit_summary TEXT, -- Brief description of changes
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(page_id, revision_number)
);

-- Wiki Report Status Enum
DO $$ BEGIN
    CREATE TYPE wiki_report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Wiki Page Reports
-- Moderation system for flagging inappropriate content
CREATE TABLE IF NOT EXISTS wiki_page_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT,
    status wiki_report_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(page_id, reporter_id) -- One report per user per page
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wiki_pages_category ON wiki_pages(category_id);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_author ON wiki_pages(author_id);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_status ON wiki_pages(status);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(slug);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_search_en ON wiki_pages USING GIN(search_vector_en);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_search_de ON wiki_pages USING GIN(search_vector_de);
CREATE INDEX IF NOT EXISTS idx_wiki_revisions_page ON wiki_revisions(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_categories_parent ON wiki_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_reports_status ON wiki_page_reports(status);

-- Full-text search trigger function
CREATE OR REPLACE FUNCTION wiki_pages_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector_en :=
        setweight(to_tsvector('english', COALESCE(NEW.title_en, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content_en, '')), 'B');
    NEW.search_vector_de :=
        setweight(to_tsvector('german', COALESCE(NEW.title_de, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.content_de, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic search vector updates
DROP TRIGGER IF EXISTS wiki_pages_search_vector_trigger ON wiki_pages;
CREATE TRIGGER wiki_pages_search_vector_trigger
    BEFORE INSERT OR UPDATE OF title_en, title_de, content_en, content_de
    ON wiki_pages
    FOR EACH ROW
    EXECUTE FUNCTION wiki_pages_search_vector_update();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION wiki_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wiki_pages_updated_at ON wiki_pages;
CREATE TRIGGER wiki_pages_updated_at
    BEFORE UPDATE ON wiki_pages
    FOR EACH ROW
    EXECUTE FUNCTION wiki_update_timestamp();

DROP TRIGGER IF EXISTS wiki_categories_updated_at ON wiki_categories;
CREATE TRIGGER wiki_categories_updated_at
    BEFORE UPDATE ON wiki_categories
    FOR EACH ROW
    EXECUTE FUNCTION wiki_update_timestamp();

-- RLS Policies
ALTER TABLE wiki_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_reports ENABLE ROW LEVEL SECURITY;

-- Categories: Anyone can read
CREATE POLICY "wiki_categories_select" ON wiki_categories
    FOR SELECT USING (is_active = true);

-- Pages: Anyone can read published pages
CREATE POLICY "wiki_pages_select_published" ON wiki_pages
    FOR SELECT USING (status = 'published');

-- Pages: Authors can read their own drafts
CREATE POLICY "wiki_pages_select_own_drafts" ON wiki_pages
    FOR SELECT USING (author_id = auth.uid() AND status = 'draft');

-- Pages: Authenticated users can create
CREATE POLICY "wiki_pages_insert" ON wiki_pages
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

-- Pages: Authors can update their own non-locked pages
CREATE POLICY "wiki_pages_update_own" ON wiki_pages
    FOR UPDATE USING (author_id = auth.uid() AND is_locked = false);

-- Pages: Any authenticated user can update published non-locked pages (wiki editing)
CREATE POLICY "wiki_pages_update_community" ON wiki_pages
    FOR UPDATE USING (
        auth.uid() IS NOT NULL
        AND status = 'published'
        AND is_locked = false
    );

-- Revisions: Anyone can read revisions of published pages
CREATE POLICY "wiki_revisions_select" ON wiki_revisions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM wiki_pages
            WHERE wiki_pages.id = wiki_revisions.page_id
            AND wiki_pages.status = 'published'
        )
    );

-- Revisions: Authenticated users can create revisions
CREATE POLICY "wiki_revisions_insert" ON wiki_revisions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND editor_id = auth.uid());

-- Reports: Users can create reports
CREATE POLICY "wiki_reports_insert" ON wiki_page_reports
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());

-- Reports: Users can view their own reports
CREATE POLICY "wiki_reports_select_own" ON wiki_page_reports
    FOR SELECT USING (reporter_id = auth.uid());

-- Seed initial categories
INSERT INTO wiki_categories (slug, name_en, name_de, description_en, description_de, icon, display_order) VALUES
    ('gear-guides', 'Gear Guides', 'Ausrüstungsratgeber', 'Comprehensive guides on outdoor gear selection and use', 'Umfassende Ratgeber zur Auswahl und Verwendung von Outdoor-Ausrüstung', 'Backpack', 1),
    ('hiking-tips', 'Hiking Tips', 'Wandertipps', 'Tips and advice for hikers of all experience levels', 'Tipps und Ratschläge für Wanderer aller Erfahrungsstufen', 'Mountain', 2),
    ('maintenance', 'Maintenance & Care', 'Pflege & Wartung', 'How to maintain and care for your outdoor equipment', 'Wie Sie Ihre Outdoor-Ausrüstung pflegen und warten', 'Wrench', 3),
    ('safety', 'Safety & First Aid', 'Sicherheit & Erste Hilfe', 'Safety guidelines and first aid information', 'Sicherheitsrichtlinien und Erste-Hilfe-Informationen', 'Shield', 4),
    ('destinations', 'Destinations', 'Reiseziele', 'Trail and destination guides from the community', 'Trail- und Reiseführer aus der Community', 'Map', 5)
ON CONFLICT (slug) DO NOTHING;

-- Comment on tables for documentation
COMMENT ON TABLE wiki_categories IS 'Hierarchical categories for organizing wiki pages';
COMMENT ON TABLE wiki_pages IS 'Community-editable wiki pages with full-text search';
COMMENT ON TABLE wiki_revisions IS 'Complete revision history for wiki pages';
COMMENT ON TABLE wiki_page_reports IS 'User reports for moderation of wiki content';
