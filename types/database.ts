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
          updated_at?: string
          user_id?: string
          weight_display_unit?: Database["public"]["Enums"]["weight_unit"]
          weight_grams?: number | null
          width_cm?: number | null
        }
        Relationships: [
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
      alert_preferences: {
        Row: {
          id: string
          user_id: string
          price_drop_enabled: boolean
          local_shop_enabled: boolean
          community_enabled: boolean
          personal_offer_enabled: boolean
          push_enabled: boolean
          email_enabled: boolean
          quiet_hours_start: string | null
          quiet_hours_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          price_drop_enabled?: boolean
          local_shop_enabled?: boolean
          community_enabled?: boolean
          personal_offer_enabled?: boolean
          push_enabled?: boolean
          email_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          price_drop_enabled?: boolean
          local_shop_enabled?: boolean
          community_enabled?: boolean
          personal_offer_enabled?: boolean
          push_enabled?: boolean
          email_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_tracking: {
        Row: {
          id: string
          user_id: string
          gear_item_id: string
          enabled: boolean
          alerts_enabled: boolean
          confirmed_product_id: string | null
          match_confidence: number | null
          manual_product_url: string | null
          last_checked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gear_item_id: string
          enabled?: boolean
          alerts_enabled?: boolean
          confirmed_product_id?: string | null
          match_confidence?: number | null
          manual_product_url?: string | null
          last_checked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gear_item_id?: string
          enabled?: boolean
          alerts_enabled?: boolean
          confirmed_product_id?: string | null
          match_confidence?: number | null
          manual_product_url?: string | null
          last_checked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_results: {
        Row: {
          id: string
          tracking_id: string
          source_type: "retailer" | "google_shopping" | "ebay" | "local_shop"
          source_name: string
          source_url: string
          price_amount: number
          price_currency: string
          shipping_cost: number | null
          shipping_currency: string
          total_price: number
          product_name: string
          product_image_url: string | null
          product_condition: "new" | "used" | "refurbished" | "open_box" | null
          is_local: boolean
          shop_latitude: number | null
          shop_longitude: number | null
          distance_km: number | null
          fetched_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          tracking_id: string
          source_type: "retailer" | "google_shopping" | "ebay" | "local_shop"
          source_name: string
          source_url: string
          price_amount: number
          price_currency: string
          shipping_cost?: number | null
          shipping_currency?: string
          total_price: number
          product_name: string
          product_image_url?: string | null
          product_condition: "new" | "used" | "refurbished" | "open_box" | null
          is_local?: boolean
          shop_latitude?: number | null
          shop_longitude?: number | null
          distance_km?: number | null
          fetched_at: string
          expires_at: string
        }
        Update: {
          id?: string
          tracking_id?: string
          source_type?: string
          source_name?: string
          source_url?: string
          price_amount?: number
          price_currency?: string
          shipping_cost?: number | null
          shipping_currency?: string | null
          total_price?: number
          product_name?: string
          product_image_url?: string | null
          product_condition?: string
          is_local?: boolean
          shop_latitude?: number | null
          shop_longitude?: number | null
          distance_km?: number | null
          fetched_at?: string
          expires_at?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          id: string
          tracking_id: string
          lowest_price: number
          highest_price: number
          average_price: number
          num_sources: number
          recorded_at: string
        }
        Insert: {
          id?: string
          tracking_id: string
          lowest_price: number
          highest_price: number
          average_price: number
          num_sources: number
          recorded_at?: string
        }
        Update: {
          id?: string
          tracking_id?: string
          lowest_price?: number
          highest_price?: number
          average_price?: number
          num_sources?: number
          recorded_at?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          id: string
          user_id: string
          tracking_id: string | null
          offer_id: string | null
          alert_type: 'price_drop' | 'local_shop_available' | 'community_member_available' | 'personal_offer'
          title: string
          message: string
          link_url: string | null
          sent_via_push: boolean
          sent_via_email: boolean
          push_sent_at: string | null
          email_sent_at: string | null
          opened_at: string | null
          clicked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tracking_id?: string | null
          offer_id?: string | null
          alert_type: 'price_drop' | 'local_shop_available' | 'community_member_available' | 'personal_offer'
          title: string
          message: string
          link_url?: string | null
          sent_via_push?: boolean
          sent_via_email?: boolean
          push_sent_at?: string | null
          email_sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tracking_id?: string | null
          offer_id?: string | null
          alert_type?: 'price_drop' | 'local_shop_available' | 'community_member_available' | 'personal_offer'
          title?: string
          message?: string
          link_url?: string | null
          sent_via_push?: boolean
          sent_via_email?: boolean
          push_sent_at?: string | null
          email_sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      partner_retailers: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          website_url: string | null
          api_key: string
          is_active: boolean
          rate_limit_per_hour: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          website_url?: string | null
          api_key: string
          is_active?: boolean
          rate_limit_per_hour?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          website_url?: string | null
          api_key?: string
          is_active?: boolean
          rate_limit_per_hour?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_offers: {
        Row: {
          id: string
          partner_retailer_id: string
          user_id: string
          tracking_id: string
          original_price: number
          offer_price: number
          offer_currency: string
          savings_amount: number
          savings_percent: number
          product_name: string
          product_url: string
          product_image_url: string | null
          expires_at: string
          is_active: boolean
          created_at: string
          viewed_at: string | null
          clicked_at: string | null
          converted_at: string | null
        }
        Insert: {
          id?: string
          partner_retailer_id: string
          user_id: string
          tracking_id: string
          original_price: number
          offer_price: number
          offer_currency?: string
          product_name: string
          product_url: string
          product_image_url?: string | null
          expires_at: string
          created_at?: string
          viewed_at?: string | null
          clicked_at?: string | null
          converted_at?: string | null
        }
        Update: {
          id?: string
          partner_retailer_id?: string
          user_id?: string
          tracking_id?: string
          original_price?: number
          offer_price?: number
          offer_currency?: string
          product_name?: string
          product_url?: string
          product_image_url?: string | null
          expires_at?: string
          created_at?: string
          viewed_at?: string | null
          clicked_at?: string | null
          converted_at?: string | null
        }
        Relationships: []
      }
      alert_delivery_queue: {
        Row: {
          id: string
          alert_id: string
          delivery_channel: string
          attempt_count: number
          max_attempts: number
          next_retry_at: string | null
          last_error: string | null
          status: string
          created_at: string
          delivered_at: string | null
          failed_at: string | null
        }
        Insert: {
          id?: string
          alert_id: string
          delivery_channel: string
          attempt_count?: number
          max_attempts?: number
          next_retry_at?: string | null
          last_error?: string | null
          status?: string
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
        }
        Update: {
          id?: string
          alert_id?: string
          delivery_channel?: string
          attempt_count?: number
          max_attempts?: number
          next_retry_at?: string | null
          last_error?: string | null
          status?: string
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      community_availability: {
        Row: {
          gear_item_id: string
          item_name: string
          user_count: number
          min_price: number | null
          max_price: number | null
          avg_price: number | null
        }
        Insert: {
          gear_item_id?: never
          item_name?: never
          user_count?: never
          min_price?: never
          max_price?: never
          avg_price?: never
        }
        Update: {
          gear_item_id?: never
          item_name?: never
          user_count?: never
          min_price?: never
          max_price?: never
          avg_price?: never
        }
        Relationships: []
      }
    }
    Functions: {
      can_message_user: {
        Args: { p_recipient_id: string; p_sender_id: string }
        Returns: boolean
      }
      get_or_create_direct_conversation: {
        Args: { p_user1: string; p_user2: string }
        Returns: string
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
