export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          id: string
          response_data: Json
          service: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          id?: string
          response_data: Json
          service: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          response_data?: Json
          service?: string
        }
        Relationships: []
      }
      catalog_brands: {
        Row: {
          created_at: string
          external_id: string
          id: string
          logo_url: string | null
          name: string
          name_normalized: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          external_id: string
          id?: string
          logo_url?: string | null
          name: string
          name_normalized?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          external_id?: string
          id?: string
          logo_url?: string | null
          name?: string
          name_normalized?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      catalog_products: {
        Row: {
          brand_external_id: string | null
          brand_id: string | null
          category_main: string | null
          created_at: string | null
          description: string | null
          external_id: string
          id: string
          name: string
          price_usd: number | null
          product_type: string | null
          subcategory: string | null
          updated_at: string | null
          weight_grams: number | null
        }
        Insert: {
          brand_external_id?: string | null
          brand_id?: string | null
          category_main?: string | null
          created_at?: string | null
          description?: string | null
          external_id: string
          id?: string
          name: string
          price_usd?: number | null
          product_type?: string | null
          subcategory?: string | null
          updated_at?: string | null
          weight_grams?: number | null
        }
        Update: {
          brand_external_id?: string | null
          brand_id?: string | null
          category_main?: string | null
          created_at?: string | null
          description?: string | null
          external_id?: string
          id?: string
          name?: string
          price_usd?: number | null
          product_type?: string | null
          subcategory?: string | null
          updated_at?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "catalog_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          i18n: Json | null
          id: string
          label: string
          level: number
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          i18n?: Json | null
          id?: string
          label: string
          level: number
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          i18n?: Json | null
          id?: string
          label?: string
          level?: number
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      gear_items: {
        Row: {
          brand: string | null
          brand_url: string | null
          can_be_borrowed: boolean
          can_be_traded: boolean
          category_id: string | null
          condition: Database["public"]["Enums"]["gear_condition"]
          created_at: string
          currency: string | null
          dependency_ids: string[] | null
          description: string | null
          gallery_image_urls: string[] | null
          height_cm: number | null
          id: string
          is_favourite: boolean
          is_for_sale: boolean
          length_cm: number | null
          model_number: string | null
          name: string
          nobg_images: Json | null
          notes: string | null
          price_paid: number | null
          primary_image_url: string | null
          product_type_id: string | null
          product_url: string | null
          purchase_date: string | null
          retailer: string | null
          retailer_url: string | null
          status: Database["public"]["Enums"]["gear_status"]
          subcategory_id: string | null
          updated_at: string
          user_id: string
          weight_display_unit: Database["public"]["Enums"]["weight_unit"]
          weight_grams: number | null
          width_cm: number | null
        }
        Insert: {
          brand?: string | null
          brand_url?: string | null
          can_be_borrowed?: boolean
          can_be_traded?: boolean
          category_id?: string | null
          condition?: Database["public"]["Enums"]["gear_condition"]
          created_at?: string
          currency?: string | null
          dependency_ids?: string[] | null
          description?: string | null
          gallery_image_urls?: string[] | null
          height_cm?: number | null
          id?: string
          is_favourite?: boolean
          is_for_sale?: boolean
          length_cm?: number | null
          model_number?: string | null
          name: string
          nobg_images?: Json | null
          notes?: string | null
          price_paid?: number | null
          primary_image_url?: string | null
          product_type_id?: string | null
          product_url?: string | null
          purchase_date?: string | null
          retailer?: string | null
          retailer_url?: string | null
          status?: Database["public"]["Enums"]["gear_status"]
          subcategory_id?: string | null
          updated_at?: string
          user_id: string
          weight_display_unit?: Database["public"]["Enums"]["weight_unit"]
          weight_grams?: number | null
          width_cm?: number | null
        }
        Update: {
          brand?: string | null
          brand_url?: string | null
          can_be_borrowed?: boolean
          can_be_traded?: boolean
          category_id?: string | null
          condition?: Database["public"]["Enums"]["gear_condition"]
          created_at?: string
          currency?: string | null
          dependency_ids?: string[] | null
          description?: string | null
          gallery_image_urls?: string[] | null
          height_cm?: number | null
          id?: string
          is_favourite?: boolean
          is_for_sale?: boolean
          length_cm?: number | null
          model_number?: string | null
          name?: string
          nobg_images?: Json | null
          notes?: string | null
          price_paid?: number | null
          primary_image_url?: string | null
          product_type_id?: string | null
          product_url?: string | null
          purchase_date?: string | null
          retailer?: string | null
          retailer_url?: string | null
          status?: Database["public"]["Enums"]["gear_status"]
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string
          weight_display_unit?: Database["public"]["Enums"]["weight_unit"]
          weight_grams?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gear_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_items_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_items_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_feedback: {
        Row: {
          category_id: string | null
          created_at: string
          gear_brand: string | null
          gear_item_id: string | null
          gear_name: string | null
          id: string
          insight_content: string
          insight_content_hash: string
          is_positive: boolean
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          gear_brand?: string | null
          gear_item_id?: string | null
          gear_name?: string | null
          id?: string
          insight_content: string
          insight_content_hash: string
          is_positive: boolean
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          gear_brand?: string | null
          gear_item_id?: string | null
          gear_name?: string | null
          id?: string
          insight_content?: string
          insight_content_hash?: string
          is_positive?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_feedback_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
        ]
      }
      loadout_comments: {
        Row: {
          author: string | null
          created_at: string
          id: string
          item_id: string | null
          message: string
          share_token: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          message: string
          share_token: string
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          message?: string
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "loadout_comments_share_token_fkey"
            columns: ["share_token"]
            isOneToOne: false
            referencedRelation: "loadout_shares"
            referencedColumns: ["share_token"]
          },
        ]
      }
      loadout_items: {
        Row: {
          created_at: string
          gear_item_id: string
          id: string
          is_consumable: boolean
          is_worn: boolean
          loadout_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          gear_item_id: string
          id?: string
          is_consumable?: boolean
          is_worn?: boolean
          loadout_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          gear_item_id?: string
          id?: string
          is_consumable?: boolean
          is_worn?: boolean
          loadout_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "loadout_items_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loadout_items_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "loadouts"
            referencedColumns: ["id"]
          },
        ]
      }
      loadout_shares: {
        Row: {
          allow_comments: boolean
          created_at: string
          loadout_id: string | null
          owner_id: string | null
          payload: Json
          share_token: string
        }
        Insert: {
          allow_comments?: boolean
          created_at?: string
          loadout_id?: string | null
          owner_id?: string | null
          payload: Json
          share_token: string
        }
        Update: {
          allow_comments?: boolean
          created_at?: string
          loadout_id?: string | null
          owner_id?: string | null
          payload?: Json
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "loadout_shares_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "loadouts"
            referencedColumns: ["id"]
          },
        ]
      }
      loadouts: {
        Row: {
          activity_types: Database["public"]["Enums"]["activity_type"][] | null
          created_at: string
          description: string | null
          id: string
          name: string
          seasons: Database["public"]["Enums"]["season"][] | null
          trip_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_types?: Database["public"]["Enums"]["activity_type"][] | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          seasons?: Database["public"]["Enums"]["season"][] | null
          trip_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_types?: Database["public"]["Enums"]["activity_type"][] | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          seasons?: Database["public"]["Enums"]["season"][] | null
          trip_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string
          facebook: string | null
          id: string
          instagram: string | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          trail_name: string | null
          updated_at: string
          website: string | null
          youtube: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          facebook?: string | null
          id: string
          instagram?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          trail_name?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          trail_name?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_brands_fuzzy: {
        Args: {
          match_threshold?: number
          result_limit?: number
          search_query: string
        }
        Returns: {
          id: string
          logo_url: string
          name: string
          similarity: number
          website_url: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      activity_type:
        | "hiking"
        | "camping"
        | "climbing"
        | "skiing"
        | "backpacking"
      gear_condition: "new" | "used" | "worn"
      gear_status: "own" | "wishlist" | "sold" | "lent" | "retired"
      season: "spring" | "summer" | "fall" | "winter"
      weight_unit: "g" | "oz" | "lb"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: ["hiking", "camping", "climbing", "skiing", "backpacking"],
      gear_condition: ["new", "used", "worn"],
      gear_status: ["own", "wishlist", "sold", "lent", "retired"],
      season: ["spring", "summer", "fall", "winter"],
      weight_unit: ["g", "oz", "lb"],
    },
  },
} as const
