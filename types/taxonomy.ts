/**
 * Taxonomy Types for GearGraph Ontology
 *
 * Feature: 001-gear-item-editor
 * Constitution: Types MUST be defined in @/types directory
 */

// =============================================================================
// Product Type (Lowest level in hierarchy)
// =============================================================================

export interface ProductType {
  id: string;
  label: string;
}

// =============================================================================
// Gear Subcategory (Mid-level in hierarchy)
// =============================================================================

export interface GearSubcategory {
  id: string;
  label: string;
  productTypes: ProductType[];
}

// =============================================================================
// Gear Category (Top-level in hierarchy)
// =============================================================================

export interface GearCategory {
  id: string;
  label: string;
  subcategories: GearSubcategory[];
}

// =============================================================================
// Outdoor Brand
// =============================================================================

export interface OutdoorBrand {
  id: string;
  name: string;
  url: string | null;
}

// =============================================================================
// Complete Taxonomy Data Structure
// =============================================================================

export interface TaxonomyData {
  categories: GearCategory[];
  brands: OutdoorBrand[];
}
