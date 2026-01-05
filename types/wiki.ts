/**
 * Wiki Types
 *
 * Feature: Community Section Restructure
 *
 * Type definitions for the community wiki feature.
 */

import type { Database } from './supabase';

// Database row types
export type WikiCategory = Database['public']['Tables']['wiki_categories']['Row'];
export type WikiPage = Database['public']['Tables']['wiki_pages']['Row'];
export type WikiRevision = Database['public']['Tables']['wiki_revisions']['Row'];
export type WikiPageReport = Database['public']['Tables']['wiki_page_reports']['Row'];

// Insert types
export type WikiCategoryInsert = Database['public']['Tables']['wiki_categories']['Insert'];
export type WikiPageInsert = Database['public']['Tables']['wiki_pages']['Insert'];
export type WikiRevisionInsert = Database['public']['Tables']['wiki_revisions']['Insert'];
export type WikiPageReportInsert = Database['public']['Tables']['wiki_page_reports']['Insert'];

// Update types
export type WikiPageUpdate = Database['public']['Tables']['wiki_pages']['Update'];

// Enum types
export type WikiPageStatus = Database['public']['Enums']['wiki_page_status'];
export type WikiReportStatus = Database['public']['Enums']['wiki_report_status'];

// Extended types with relations
export interface WikiPageWithAuthor extends WikiPage {
  author?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  category?: WikiCategory | null;
}

export interface WikiRevisionWithEditor extends WikiRevision {
  editor?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface WikiCategoryWithChildren extends WikiCategory {
  children?: WikiCategory[];
  page_count?: number;
}

// Form types
export interface WikiPageFormData {
  title_en: string;
  title_de: string;
  content_en: string;
  content_de: string;
  category_id: string | null;
  status: WikiPageStatus;
  edit_summary?: string;
}

// Search types
export interface WikiSearchParams {
  query?: string;
  category_id?: string;
  status?: WikiPageStatus;
  locale?: 'en' | 'de';
  limit?: number;
  offset?: number;
}

export interface WikiSearchResult {
  pages: WikiPageWithAuthor[];
  total: number;
  hasMore: boolean;
}

// Hook return types
export interface UseWikiPagesReturn {
  pages: WikiPageWithAuthor[];
  isLoading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseWikiPageReturn {
  page: WikiPageWithAuthor | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseWikiEditorReturn {
  isSubmitting: boolean;
  error: string | null;
  createPage: (data: WikiPageFormData) => Promise<WikiPage | null>;
  updatePage: (slug: string, data: WikiPageFormData) => Promise<WikiPage | null>;
}

export interface UseWikiCategoriesReturn {
  categories: WikiCategoryWithChildren[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseWikiRevisionsReturn {
  revisions: WikiRevisionWithEditor[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
