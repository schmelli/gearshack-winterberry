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
      ai_cached_responses: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          query_pattern: string
          response_de: string
          response_en: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          query_pattern: string
          response_de: string
          response_en: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          query_pattern?: string
          response_de?: string
          response_en?: string
          usage_count?: number
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context_snapshot: Json | null
          created_at: string
          id: string
          message_count: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_snapshot?: Json | null
          created_at?: string
          id?: string
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_snapshot?: Json | null
          created_at?: string
          id?: string
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          actions: Json | null
          content: string
          context: Json | null
          conversation_id: string
          created_at: string
          id: string
          inline_cards: Json | null
          role: string
          tokens_used: number | null
        }
        Insert: {
          actions?: Json | null
          content: string
          context?: Json | null
          conversation_id: string
          created_at?: string
          id?: string
          inline_cards?: Json | null
          role: string
          tokens_used?: number | null
        }
        Update: {
          actions?: Json | null
          content?: string
          context?: Json | null
          conversation_id?: string
          created_at?: string
          id?: string
          inline_cards?: Json | null
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rate_limits: {
        Row: {
          count: number
          endpoint: string
          last_message_at: string | null
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint?: string
          last_message_at?: string | null
          user_id: string
          window_start?: string
        }
        Update: {
          count?: number
          endpoint?: string
          last_message_at?: string | null
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      alert_preferences: {
        Row: {
          community_enabled: boolean | null
          created_at: string | null
          email_enabled: boolean | null
          id: string
          local_shop_enabled: boolean | null
          personal_offer_enabled: boolean | null
          price_drop_enabled: boolean | null
          push_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          community_enabled?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          local_shop_enabled?: boolean | null
          personal_offer_enabled?: boolean | null
          price_drop_enabled?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          community_enabled?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          local_shop_enabled?: boolean | null
          personal_offer_enabled?: boolean | null
          price_drop_enabled?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      conversation_participants: {
        Row: {
          conversation_id: string
          is_archived: boolean
          is_muted: boolean
          joined_at: string
          last_read_at: string | null
          role: Database["public"]["Enums"]["participant_role"]
          unread_count: number
          user_id: string
        }
        Insert: {
          conversation_id: string
          is_archived?: boolean
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: Database["public"]["Enums"]["participant_role"]
          unread_count?: number
          user_id: string
        }
        Update: {
          conversation_id?: string
          is_archived?: boolean
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: Database["public"]["Enums"]["participant_role"]
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          source_share_token: string | null
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
          source_share_token?: string | null
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
          source_share_token?: string | null
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
            foreignKeyName: "gear_items_source_share_token_fkey"
            columns: ["source_share_token"]
            isOneToOne: false
            referencedRelation: "loadout_shares"
            referencedColumns: ["share_token"]
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
      generated_images: {
        Row: {
          alt_text: string | null
          cloudinary_public_id: string
          cloudinary_url: string
          created_at: string
          generation_timestamp: string
          id: string
          is_active: boolean
          loadout_id: string
          prompt_used: string
          style_preferences: Json | null
        }
        Insert: {
          alt_text?: string | null
          cloudinary_public_id: string
          cloudinary_url: string
          created_at?: string
          generation_timestamp?: string
          id?: string
          is_active?: boolean
          loadout_id: string
          prompt_used: string
          style_preferences?: Json | null
        }
        Update: {
          alt_text?: string | null
          cloudinary_public_id?: string
          cloudinary_url?: string
          created_at?: string
          generation_timestamp?: string
          id?: string
          is_active?: boolean
          loadout_id?: string
          prompt_used?: string
          style_preferences?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_images_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "loadouts"
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
            referencedRelation: "community_availability"
            referencedColumns: ["gear_item_id"]
          },
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
            referencedRelation: "community_availability"
            referencedColumns: ["gear_item_id"]
          },
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
          hero_image_id: string | null
          id: string
          image_source_preference: string | null
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
          hero_image_id?: string | null
          id?: string
          image_source_preference?: string | null
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
          hero_image_id?: string | null
          id?: string
          image_source_preference?: string | null
          name?: string
          seasons?: Database["public"]["Enums"]["season"][] | null
          trip_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loadouts_hero_image_id_fkey"
            columns: ["hero_image_id"]
            isOneToOne: false
            referencedRelation: "generated_images"
            referencedColumns: ["id"]
          },
        ]
      }
      message_deletions: {
        Row: {
          deleted_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_deletions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_deletions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          deletion_state: Database["public"]["Enums"]["message_deletion_state"]
          id: string
          media_url: string | null
          message_type: Database["public"]["Enums"]["message_type"]
          metadata: Json
          search_vector: unknown
          sender_id: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          deletion_state?: Database["public"]["Enums"]["message_deletion_state"]
          id?: string
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json
          search_vector?: unknown
          sender_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          deletion_state?: Database["public"]["Enums"]["message_deletion_state"]
          id?: string
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json
          search_vector?: unknown
          sender_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_retailers: {
        Row: {
          api_key_hash: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          api_key_hash?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          api_key_hash?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      personal_offers: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          dismissed: boolean | null
          id: string
          notified_at: string | null
          offer_price: number
          original_price: number | null
          partner_retailer_id: string
          product_id: string
          product_name: string
          product_url: string
          terms: string | null
          tracking_id: string
          user_id: string
          valid_until: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dismissed?: boolean | null
          id?: string
          notified_at?: string | null
          offer_price: number
          original_price?: number | null
          partner_retailer_id: string
          product_id: string
          product_name: string
          product_url: string
          terms?: string | null
          tracking_id: string
          user_id: string
          valid_until: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dismissed?: boolean | null
          id?: string
          notified_at?: string | null
          offer_price?: number
          original_price?: number | null
          partner_retailer_id?: string
          product_id?: string
          product_name?: string
          product_url?: string
          terms?: string | null
          tracking_id?: string
          user_id?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_offers_partner_retailer_id_fkey"
            columns: ["partner_retailer_id"]
            isOneToOne: false
            referencedRelation: "partner_retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_offers_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "price_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          email_sent_at: string | null
          id: string
          link_url: string | null
          message: string
          offer_id: string | null
          push_sent_at: string | null
          read_at: string | null
          sent_via_email: boolean | null
          sent_via_push: boolean | null
          title: string
          tracking_id: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          email_sent_at?: string | null
          id?: string
          link_url?: string | null
          message: string
          offer_id?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          sent_via_email?: boolean | null
          sent_via_push?: boolean | null
          title: string
          tracking_id?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          email_sent_at?: string | null
          id?: string
          link_url?: string | null
          message?: string
          offer_id?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          sent_via_email?: boolean | null
          sent_via_push?: boolean | null
          title?: string
          tracking_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "personal_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "price_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          average_price: number | null
          created_at: string | null
          id: string
          lowest_price: number
          recorded_at: string | null
          source_count: number
          tracking_id: string
        }
        Insert: {
          average_price?: number | null
          created_at?: string | null
          id?: string
          lowest_price: number
          recorded_at?: string | null
          source_count: number
          tracking_id: string
        }
        Update: {
          average_price?: number | null
          created_at?: string | null
          id?: string
          lowest_price?: number
          recorded_at?: string | null
          source_count?: number
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "price_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      price_results: {
        Row: {
          created_at: string | null
          distance_km: number | null
          expires_at: string
          fetched_at: string | null
          id: string
          is_local: boolean | null
          price_amount: number
          price_currency: string | null
          product_condition: string | null
          product_image_url: string | null
          product_name: string
          shipping_cost: number | null
          shipping_currency: string | null
          shop_latitude: number | null
          shop_longitude: number | null
          source_name: string
          source_type: string
          source_url: string
          total_price: number
          tracking_id: string
        }
        Insert: {
          created_at?: string | null
          distance_km?: number | null
          expires_at: string
          fetched_at?: string | null
          id?: string
          is_local?: boolean | null
          price_amount: number
          price_currency?: string | null
          product_condition?: string | null
          product_image_url?: string | null
          product_name: string
          shipping_cost?: number | null
          shipping_currency?: string | null
          shop_latitude?: number | null
          shop_longitude?: number | null
          source_name: string
          source_type: string
          source_url: string
          total_price: number
          tracking_id: string
        }
        Update: {
          created_at?: string | null
          distance_km?: number | null
          expires_at?: string
          fetched_at?: string | null
          id?: string
          is_local?: boolean | null
          price_amount?: number
          price_currency?: string | null
          product_condition?: string | null
          product_image_url?: string | null
          product_name?: string
          shipping_cost?: number | null
          shipping_currency?: string | null
          shop_latitude?: number | null
          shop_longitude?: number | null
          source_name?: string
          source_type?: string
          source_url?: string
          total_price?: number
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_results_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "price_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      price_tracking: {
        Row: {
          alerts_enabled: boolean | null
          confirmed_product_id: string | null
          created_at: string | null
          enabled: boolean | null
          gear_item_id: string
          id: string
          last_checked_at: string | null
          match_confidence: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alerts_enabled?: boolean | null
          confirmed_product_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          gear_item_id: string
          id?: string
          last_checked_at?: string | null
          match_confidence?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alerts_enabled?: boolean | null
          confirmed_product_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          gear_item_id?: string
          id?: string
          last_checked_at?: string | null
          match_confidence?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_tracking_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "community_availability"
            referencedColumns: ["gear_item_id"]
          },
          {
            foreignKeyName: "price_tracking_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          discoverable: boolean | null
          display_name: string | null
          email: string
          facebook: string | null
          id: string
          instagram: string | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          messaging_privacy:
            | Database["public"]["Enums"]["messaging_privacy"]
            | null
          online_status_privacy:
            | Database["public"]["Enums"]["messaging_privacy"]
            | null
          read_receipts_enabled: boolean | null
          subscription_tier: string | null
          trail_name: string | null
          updated_at: string
          website: string | null
          youtube: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discoverable?: boolean | null
          display_name?: string | null
          email: string
          facebook?: string | null
          id: string
          instagram?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          messaging_privacy?:
            | Database["public"]["Enums"]["messaging_privacy"]
            | null
          online_status_privacy?:
            | Database["public"]["Enums"]["messaging_privacy"]
            | null
          read_receipts_enabled?: boolean | null
          subscription_tier?: string | null
          trail_name?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discoverable?: boolean | null
          display_name?: string | null
          email?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          messaging_privacy?:
            | Database["public"]["Enums"]["messaging_privacy"]
            | null
          online_status_privacy?:
            | Database["public"]["Enums"]["messaging_privacy"]
            | null
          read_receipts_enabled?: boolean | null
          subscription_tier?: string | null
          trail_name?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          blocked_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          blocked_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_friends: {
        Row: {
          created_at: string
          friend_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          message_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      community_availability: {
        Row: {
          avg_price: number | null
          gear_item_id: string | null
          item_name: string | null
          max_price: number | null
          min_price: number | null
          user_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_message_user: {
        Args: { p_recipient_id: string; p_sender_id: string }
        Returns: boolean
      }
      check_and_increment_rate_limit: {
        Args: {
          p_endpoint: string
          p_limit: number
          p_user_id: string
          p_window_hours: number
        }
        Returns: Json
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      find_community_availability: {
        Args: { p_user_id: string; p_wishlist_item_id: string }
        Returns: {
          can_be_borrowed: boolean
          can_be_traded: boolean
          is_for_sale: boolean
          item_brand: string
          item_name: string
          matched_item_id: string
          owner_avatar_url: string
          owner_display_name: string
          owner_id: string
          primary_image_url: string
          similarity_score: number
        }[]
      }
      fuzzy_match_gear: {
        Args: {
          inventory_brand: string
          inventory_model: string
          wishlist_brand: string
          wishlist_model: string
        }
        Returns: number
      }
      fuzzy_search_products: {
        Args: {
          max_results?: number
          search_query: string
          similarity_threshold?: number
        }
        Returns: {
          gear_item_id: string
          name: string
          similarity_score: number
        }[]
      }
      get_or_create_direct_conversation: {
        Args: { p_user1: string; p_user2: string }
        Returns: string
      }
      increment_cache_usage: {
        Args: { p_cache_id: string }
        Returns: undefined
      }
      reset_unread_count: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
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
      conversation_type: "direct" | "group"
      gear_condition: "new" | "used" | "worn"
      gear_status: "own" | "wishlist" | "sold" | "lent" | "retired"
      message_deletion_state:
        | "active"
        | "deleted_for_sender"
        | "deleted_for_all"
      message_type:
        | "text"
        | "image"
        | "voice"
        | "location"
        | "gear_reference"
        | "gear_trade"
        | "trip_invitation"
      messaging_privacy: "everyone" | "friends_only" | "nobody"
      participant_role: "member" | "admin"
      report_reason: "spam" | "harassment" | "inappropriate_content" | "other"
      report_status: "pending" | "reviewed" | "resolved" | "dismissed"
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
      conversation_type: ["direct", "group"],
      gear_condition: ["new", "used", "worn"],
      gear_status: ["own", "wishlist", "sold", "lent", "retired"],
      message_deletion_state: [
        "active",
        "deleted_for_sender",
        "deleted_for_all",
      ],
      message_type: [
        "text",
        "image",
        "voice",
        "location",
        "gear_reference",
        "gear_trade",
        "trip_invitation",
      ],
      messaging_privacy: ["everyone", "friends_only", "nobody"],
      participant_role: ["member", "admin"],
      report_reason: ["spam", "harassment", "inappropriate_content", "other"],
      report_status: ["pending", "reviewed", "resolved", "dismissed"],
      season: ["spring", "summer", "fall", "winter"],
      weight_unit: ["g", "oz", "lb"],
    },
  },
} as const
