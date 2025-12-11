/**
 * Supabase Database Types
 *
 * Feature: 040-supabase-migration
 * Task: T017
 *
 * These types should be regenerated when the database schema changes:
 * npx supabase gen types typescript --project-id <project-ref> > types/database.ts
 *
 * For now, these are manually defined to match the schema in data-model.md
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// =============================================================================
// Database Enums
// =============================================================================

export type GearConditionDb = 'new' | 'used' | 'worn';
export type GearStatusDb = 'own' | 'wishlist' | 'sold' | 'lent' | 'retired';
export type WeightUnitDb = 'g' | 'oz' | 'lb';
export type ActivityTypeDb = 'hiking' | 'camping' | 'climbing' | 'skiing' | 'backpacking';
export type SeasonDb = 'spring' | 'summer' | 'fall' | 'winter';

// =============================================================================
// Database Schema
// =============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          /** Trail name (2-30 chars) - Feature 041 */
          trail_name: string | null;
          /** Bio (max 500 chars) - Feature 041 */
          bio: string | null;
          /** Human-readable location - Feature 041 */
          location_name: string | null;
          /** Geographic latitude - Feature 041 */
          latitude: number | null;
          /** Geographic longitude - Feature 041 */
          longitude: number | null;
          /** Instagram username or URL - Feature 041 */
          instagram: string | null;
          /** Facebook username or URL - Feature 041 */
          facebook: string | null;
          /** YouTube channel URL - Feature 041 */
          youtube: string | null;
          /** Website URL - Feature 041 */
          website: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          trail_name?: string | null;
          bio?: string | null;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          instagram?: string | null;
          facebook?: string | null;
          youtube?: string | null;
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          trail_name?: string | null;
          bio?: string | null;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          instagram?: string | null;
          facebook?: string | null;
          youtube?: string | null;
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          level: number;
          label: string;
          /** Unique identifier for upsert operations - Feature 043 */
          slug: string;
          /** JSONB translations: {"en": "Label", "de": "Bezeichnung"} - Feature 043 */
          i18n: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          level: number;
          label: string;
          /** Required for upsert conflict resolution - Feature 043 */
          slug: string;
          /** Optional, defaults to {} - Feature 043 */
          i18n?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          level?: number;
          label?: string;
          slug?: string;
          i18n?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_parent_id_fkey';
            columns: ['parent_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          }
        ];
      };
      gear_items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          description: string | null;
          brand_url: string | null;
          model_number: string | null;
          product_url: string | null;
          category_id: string | null;
          subcategory_id: string | null;
          product_type_id: string | null;
          weight_grams: number | null;
          weight_display_unit: WeightUnitDb;
          length_cm: number | null;
          width_cm: number | null;
          height_cm: number | null;
          price_paid: number | null;
          currency: string | null;
          purchase_date: string | null;
          retailer: string | null;
          retailer_url: string | null;
          primary_image_url: string | null;
          gallery_image_urls: string[];
          nobg_images: Json;
          condition: GearConditionDb;
          status: GearStatusDb;
          notes: string | null;
          dependency_ids: string[];
          /** Whether this item is marked as favourite - Feature 041 */
          is_favourite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          brand?: string | null;
          description?: string | null;
          brand_url?: string | null;
          model_number?: string | null;
          product_url?: string | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          product_type_id?: string | null;
          weight_grams?: number | null;
          weight_display_unit?: WeightUnitDb;
          length_cm?: number | null;
          width_cm?: number | null;
          height_cm?: number | null;
          price_paid?: number | null;
          currency?: string | null;
          purchase_date?: string | null;
          retailer?: string | null;
          retailer_url?: string | null;
          primary_image_url?: string | null;
          gallery_image_urls?: string[];
          nobg_images?: Json;
          condition?: GearConditionDb;
          status?: GearStatusDb;
          notes?: string | null;
          dependency_ids?: string[];
          /** Whether this item is marked as favourite - Feature 041 */
          is_favourite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          brand?: string | null;
          description?: string | null;
          brand_url?: string | null;
          model_number?: string | null;
          product_url?: string | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          product_type_id?: string | null;
          weight_grams?: number | null;
          weight_display_unit?: WeightUnitDb;
          length_cm?: number | null;
          width_cm?: number | null;
          height_cm?: number | null;
          price_paid?: number | null;
          currency?: string | null;
          purchase_date?: string | null;
          retailer?: string | null;
          retailer_url?: string | null;
          primary_image_url?: string | null;
          gallery_image_urls?: string[];
          nobg_images?: Json;
          condition?: GearConditionDb;
          status?: GearStatusDb;
          notes?: string | null;
          dependency_ids?: string[];
          /** Whether this item is marked as favourite - Feature 041 */
          is_favourite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gear_items_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gear_items_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gear_items_subcategory_id_fkey';
            columns: ['subcategory_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gear_items_product_type_id_fkey';
            columns: ['product_type_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          }
        ];
      };
      loadouts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          trip_date: string | null;
          activity_types: ActivityTypeDb[];
          seasons: SeasonDb[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          trip_date?: string | null;
          activity_types?: ActivityTypeDb[];
          seasons?: SeasonDb[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          trip_date?: string | null;
          activity_types?: ActivityTypeDb[];
          seasons?: SeasonDb[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'loadouts_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      loadout_items: {
        Row: {
          id: string;
          loadout_id: string;
          gear_item_id: string;
          quantity: number;
          is_worn: boolean;
          is_consumable: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          loadout_id: string;
          gear_item_id: string;
          quantity?: number;
          is_worn?: boolean;
          is_consumable?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          loadout_id?: string;
          gear_item_id?: string;
          quantity?: number;
          is_worn?: boolean;
          is_consumable?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'loadout_items_loadout_id_fkey';
            columns: ['loadout_id'];
            referencedRelation: 'loadouts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'loadout_items_gear_item_id_fkey';
            columns: ['gear_item_id'];
            referencedRelation: 'gear_items';
            referencedColumns: ['id'];
          }
        ];
      };
      /** Feature 042: Global Gear Catalog - Brands table */
      catalog_brands: {
        Row: {
          id: string;
          external_id: string;
          name: string;
          name_normalized: string;
          logo_url: string | null;
          website_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          external_id: string;
          name: string;
          logo_url?: string | null;
          website_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          external_id?: string;
          name?: string;
          logo_url?: string | null;
          website_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      /** Feature 042: Global Gear Catalog - Items table (legacy) */
      catalog_items: {
        Row: {
          id: string;
          external_id: string;
          brand_id: string | null;
          name: string;
          name_normalized: string;
          category: string | null;
          description: string | null;
          specs_summary: string | null;
          embedding: number[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          external_id: string;
          brand_id?: string | null;
          name: string;
          category?: string | null;
          description?: string | null;
          specs_summary?: string | null;
          embedding?: number[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          external_id?: string;
          brand_id?: string | null;
          name?: string;
          category?: string | null;
          description?: string | null;
          specs_summary?: string | null;
          embedding?: number[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'catalog_items_brand_id_fkey';
            columns: ['brand_id'];
            referencedRelation: 'catalog_brands';
            referencedColumns: ['id'];
          }
        ];
      };
      /** Feature 044: Global Gear Catalog - Products table (synced from GearGraph) */
      catalog_products: {
        Row: {
          id: string;
          external_id: string;
          brand_id: string | null;
          brand_external_id: string | null;
          name: string;
          category_main: string | null;
          subcategory: string | null;
          product_type: string | null;
          price_usd: number | null;
          weight_grams: number | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          external_id: string;
          brand_id?: string | null;
          brand_external_id?: string | null;
          name: string;
          category_main?: string | null;
          subcategory?: string | null;
          product_type?: string | null;
          price_usd?: number | null;
          weight_grams?: number | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          external_id?: string;
          brand_id?: string | null;
          brand_external_id?: string | null;
          name?: string;
          category_main?: string | null;
          subcategory?: string | null;
          product_type?: string | null;
          price_usd?: number | null;
          weight_grams?: number | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'catalog_products_brand_id_fkey';
            columns: ['brand_id'];
            referencedRelation: 'catalog_brands';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      gear_condition: GearConditionDb;
      gear_status: GearStatusDb;
      weight_unit: WeightUnitDb;
      activity_type: ActivityTypeDb;
      season: SeasonDb;
    };
    CompositeTypes: Record<string, never>;
  };
}

// =============================================================================
// Helper Types for easier use
// =============================================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
