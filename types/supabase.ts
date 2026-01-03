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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
          conversation_state: Json | null
          created_at: string
          id: string
          message_count: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_snapshot?: Json | null
          conversation_state?: Json | null
          created_at?: string
          id?: string
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_snapshot?: Json | null
          conversation_state?: Json | null
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
          action_results: Json | null
          actions: Json | null
          content: string
          context: Json | null
          conversation_id: string
          created_at: string
          id: string
          inline_cards: Json | null
          orchestration_metadata: Json | null
          reasoning_trace: Json | null
          role: string
          tokens_used: number | null
          tool_calls: Json | null
        }
        Insert: {
          action_results?: Json | null
          actions?: Json | null
          content: string
          context?: Json | null
          conversation_id: string
          created_at?: string
          id?: string
          inline_cards?: Json | null
          orchestration_metadata?: Json | null
          reasoning_trace?: Json | null
          role: string
          tokens_used?: number | null
          tool_calls?: Json | null
        }
        Update: {
          action_results?: Json | null
          actions?: Json | null
          content?: string
          context?: Json | null
          conversation_id?: string
          created_at?: string
          id?: string
          inline_cards?: Json | null
          orchestration_metadata?: Json | null
          reasoning_trace?: Json | null
          role?: string
          tokens_used?: number | null
          tool_calls?: Json | null
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
      ai_tool_execution_logs: {
        Row: {
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          message_id: string | null
          retry_count: number
          success: boolean
          tool_args: Json | null
          tool_name: string
          tool_result: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          message_id?: string | null
          retry_count?: number
          success?: boolean
          tool_args?: Json | null
          tool_name: string
          tool_result?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          message_id?: string | null
          retry_count?: number
          success?: boolean
          tool_args?: Json | null
          tool_name?: string
          tool_result?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_execution_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_delivery_queue: {
        Row: {
          alert_id: string | null
          alert_type: string
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          delivery_method: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          alert_type: string
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          delivery_method?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          alert_type?: string
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          delivery_method?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_delivery_queue_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "price_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_preferences: {
        Row: {
          community_enabled: boolean | null
          created_at: string | null
          email_enabled: boolean | null
          enable_email_alerts: boolean | null
          enable_push_alerts: boolean | null
          id: string
          local_shop_enabled: boolean | null
          max_alerts_per_day: number | null
          personal_offer_enabled: boolean | null
          price_drop_enabled: boolean | null
          price_drop_threshold: number | null
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
          enable_email_alerts?: boolean | null
          enable_push_alerts?: boolean | null
          id?: string
          local_shop_enabled?: boolean | null
          max_alerts_per_day?: number | null
          personal_offer_enabled?: boolean | null
          price_drop_enabled?: boolean | null
          price_drop_threshold?: number | null
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
          enable_email_alerts?: boolean | null
          enable_push_alerts?: boolean | null
          id?: string
          local_shop_enabled?: boolean | null
          max_alerts_per_day?: number | null
          personal_offer_enabled?: boolean | null
          price_drop_enabled?: boolean | null
          price_drop_threshold?: number | null
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
          search_query: string | null
          search_type: string | null
          service: string
          ttl_hours: number | null
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          id?: string
          response_data: Json
          search_query?: string | null
          search_type?: string | null
          service: string
          ttl_hours?: number | null
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          response_data?: Json
          search_query?: string | null
          search_type?: string | null
          service?: string
          ttl_hours?: number | null
        }
        Relationships: []
      }
      bulletin_posts: {
        Row: {
          author_id: string
          content: string
          content_tsvector: unknown
          created_at: string
          id: string
          is_archived: boolean
          is_deleted: boolean
          linked_content_id: string | null
          linked_content_type:
            | Database["public"]["Enums"]["linked_content_type"]
            | null
          reply_count: number
          tag: Database["public"]["Enums"]["post_tag"] | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          content_tsvector?: unknown
          created_at?: string
          id?: string
          is_archived?: boolean
          is_deleted?: boolean
          linked_content_id?: string | null
          linked_content_type?:
            | Database["public"]["Enums"]["linked_content_type"]
            | null
          reply_count?: number
          tag?: Database["public"]["Enums"]["post_tag"] | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          content_tsvector?: unknown
          created_at?: string
          id?: string
          is_archived?: boolean
          is_deleted?: boolean
          linked_content_id?: string | null
          linked_content_type?:
            | Database["public"]["Enums"]["linked_content_type"]
            | null
          reply_count?: number
          tag?: Database["public"]["Enums"]["post_tag"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletin_replies: {
        Row: {
          author_id: string
          content: string
          created_at: string
          depth: number
          id: string
          is_deleted: boolean
          parent_reply_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          depth?: number
          id?: string
          is_deleted?: boolean
          parent_reply_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          depth?: number
          id?: string
          is_deleted?: boolean
          parent_reply_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "bulletin_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "v_bulletin_replies_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "bulletin_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "v_bulletin_posts_with_author"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletin_reports: {
        Row: {
          action_taken: Database["public"]["Enums"]["moderation_action"] | null
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          action_taken?: Database["public"]["Enums"]["moderation_action"] | null
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Update: {
          action_taken?: Database["public"]["Enums"]["moderation_action"] | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string | null
          description: string | null
          external_id: string
          id: string
          name: string
          price_usd: number | null
          product_type: string | null
          product_type_id: string | null
          product_url: string | null
          updated_at: string | null
          weight_grams: number | null
        }
        Insert: {
          brand_external_id?: string | null
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          external_id: string
          id?: string
          name: string
          price_usd?: number | null
          product_type?: string | null
          product_type_id?: string | null
          product_url?: string | null
          updated_at?: string | null
          weight_grams?: number | null
        }
        Update: {
          brand_external_id?: string | null
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          external_id?: string
          id?: string
          name?: string
          price_usd?: number | null
          product_type?: string | null
          product_type_id?: string | null
          product_url?: string | null
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
          {
            foreignKeyName: "catalog_products_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
          sort_order: number
        }
        Insert: {
          created_at?: string
          i18n?: Json | null
          id?: string
          label: string
          level: number
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          i18n?: Json | null
          id?: string
          label?: string
          level?: number
          parent_id?: string | null
          slug?: string
          sort_order?: number
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
      claim_invitations: {
        Row: {
          claimed_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          status: string
          token: string
          verified_at: string | null
          vip_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          status?: string
          token: string
          verified_at?: string | null
          vip_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          status?: string
          token?: string
          verified_at?: string | null
          vip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_invitations_vip_id_fkey"
            columns: ["vip_id"]
            isOneToOne: false
            referencedRelation: "vip_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_announcements: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          link_text: string | null
          link_url: string | null
          message: string
          priority: number
          starts_at: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          message: string
          priority?: number
          starts_at?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          message?: string
          priority?: number
          starts_at?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_memory: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message_content: string
          message_id: string
          message_role: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message_content: string
          message_id: string
          message_role: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message_content?: string
          message_id?: string
          message_role?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      conversions: {
        Row: {
          catalog_item_id: string
          commission_amount: number
          commission_percent: number
          conversion_date: string
          created_at: string
          gear_item_id: string | null
          id: string
          is_local_pickup: boolean | null
          merchant_id: string
          offer_id: string
          pickup_location_id: string | null
          requires_review: boolean | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sale_price: number
          status: string
          user_id: string
        }
        Insert: {
          catalog_item_id: string
          commission_amount: number
          commission_percent?: number
          conversion_date?: string
          created_at?: string
          gear_item_id?: string | null
          id?: string
          is_local_pickup?: boolean | null
          merchant_id: string
          offer_id: string
          pickup_location_id?: string | null
          requires_review?: boolean | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_price: number
          status?: string
          user_id: string
        }
        Update: {
          catalog_item_id?: string
          commission_amount?: number
          commission_percent?: number
          conversion_date?: string
          created_at?: string
          gear_item_id?: string | null
          id?: string
          is_local_pickup?: boolean | null
          merchant_id?: string
          offer_id?: string
          pickup_location_id?: string | null
          requires_review?: boolean | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_price?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversions_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "merchant_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "community_availability"
            referencedColumns: ["gear_item_id"]
          },
          {
            foreignKeyName: "conversions_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "merchant_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "merchant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string
          id: string
          metadata: Json | null
          reference_id: string
          reference_type: string
          user_id: string
          visibility: Database["public"]["Enums"]["activity_visibility"]
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          id?: string
          metadata?: Json | null
          reference_id: string
          reference_type: string
          user_id: string
          visibility?: Database["public"]["Enums"]["activity_visibility"]
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          id?: string
          metadata?: Json | null
          reference_id?: string
          reference_type?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["activity_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "friend_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          message: string | null
          recipient_id: string
          responded_at: string | null
          sender_id: string
          status: Database["public"]["Enums"]["friend_request_status"]
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          recipient_id: string
          responded_at?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["friend_request_status"]
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          recipient_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["friend_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_deletion_records: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          records_deleted: number | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_deleted?: number | null
          requested_at?: string
          status: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_deleted?: number | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      gear_enrichment_suggestions: {
        Row: {
          catalog_product_id: string
          created_at: string | null
          gear_item_id: string
          id: string
          match_confidence: number
          notification_id: string | null
          status: string
          suggested_description: string | null
          suggested_price_usd: number | null
          suggested_weight_grams: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          catalog_product_id: string
          created_at?: string | null
          gear_item_id: string
          id?: string
          match_confidence: number
          notification_id?: string | null
          status?: string
          suggested_description?: string | null
          suggested_price_usd?: number | null
          suggested_weight_grams?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          catalog_product_id?: string
          created_at?: string | null
          gear_item_id?: string
          id?: string
          match_confidence?: number
          notification_id?: string | null
          status?: string
          suggested_description?: string | null
          suggested_price_usd?: number | null
          suggested_weight_grams?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gear_enrichment_suggestions_catalog_product_id_fkey"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_enrichment_suggestions_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "community_availability"
            referencedColumns: ["gear_item_id"]
          },
          {
            foreignKeyName: "gear_enrichment_suggestions_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_enrichment_suggestions_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_enrichment_suggestions_user_id_fkey"
            columns: ["user_id"]
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
          color: string | null
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
          materials: string | null
          model_number: string | null
          name: string
          nobg_images: Json | null
          notes: string | null
          price_paid: number | null
          primary_image_url: string | null
          product_type_id: string | null
          product_url: string | null
          purchase_date: string | null
          quantity: number
          retailer: string | null
          retailer_url: string | null
          size: string | null
          source_attribution: Json | null
          source_loadout_id: string | null
          source_merchant_id: string | null
          source_offer_id: string | null
          source_share_token: string | null
          status: Database["public"]["Enums"]["gear_status"]
          subcategory_id: string | null
          tent_construction: string | null
          updated_at: string
          user_id: string
          volume_liters: number | null
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
          color?: string | null
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
          materials?: string | null
          model_number?: string | null
          name: string
          nobg_images?: Json | null
          notes?: string | null
          price_paid?: number | null
          primary_image_url?: string | null
          product_type_id?: string | null
          product_url?: string | null
          purchase_date?: string | null
          quantity?: number
          retailer?: string | null
          retailer_url?: string | null
          size?: string | null
          source_attribution?: Json | null
          source_loadout_id?: string | null
          source_merchant_id?: string | null
          source_offer_id?: string | null
          source_share_token?: string | null
          status?: Database["public"]["Enums"]["gear_status"]
          subcategory_id?: string | null
          tent_construction?: string | null
          updated_at?: string
          user_id: string
          volume_liters?: number | null
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
          color?: string | null
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
          materials?: string | null
          model_number?: string | null
          name?: string
          nobg_images?: Json | null
          notes?: string | null
          price_paid?: number | null
          primary_image_url?: string | null
          product_type_id?: string | null
          product_url?: string | null
          purchase_date?: string | null
          quantity?: number
          retailer?: string | null
          retailer_url?: string | null
          size?: string | null
          source_attribution?: Json | null
          source_loadout_id?: string | null
          source_merchant_id?: string | null
          source_offer_id?: string | null
          source_share_token?: string | null
          status?: Database["public"]["Enums"]["gear_status"]
          subcategory_id?: string | null
          tent_construction?: string | null
          updated_at?: string
          user_id?: string
          volume_liters?: number | null
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
            foreignKeyName: "gear_items_source_loadout_id_fkey"
            columns: ["source_loadout_id"]
            isOneToOne: false
            referencedRelation: "merchant_loadout_pricing"
            referencedColumns: ["loadout_id"]
          },
          {
            foreignKeyName: "gear_items_source_loadout_id_fkey"
            columns: ["source_loadout_id"]
            isOneToOne: false
            referencedRelation: "merchant_loadouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_items_source_merchant_id_fkey"
            columns: ["source_merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_items_source_offer_id_fkey"
            columns: ["source_offer_id"]
            isOneToOne: false
            referencedRelation: "merchant_offers"
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
      loadout_availability: {
        Row: {
          id: string
          is_in_stock: boolean | null
          loadout_id: string
          location_id: string
          stock_note: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          is_in_stock?: boolean | null
          loadout_id: string
          location_id: string
          stock_note?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          is_in_stock?: boolean | null
          loadout_id?: string
          location_id?: string
          stock_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loadout_availability_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "merchant_loadout_pricing"
            referencedColumns: ["loadout_id"]
          },
          {
            foreignKeyName: "loadout_availability_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "merchant_loadouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loadout_availability_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "merchant_locations"
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
      loadout_share_views: {
        Row: {
          id: string
          share_token: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          share_token: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          share_token?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loadout_share_views_share_token_fkey"
            columns: ["share_token"]
            isOneToOne: false
            referencedRelation: "loadout_shares"
            referencedColumns: ["share_token"]
          },
        ]
      }
      loadout_shares: {
        Row: {
          allow_comments: boolean
          created_at: string
          expires_at: string | null
          last_viewed_at: string | null
          loadout_id: string | null
          owner_id: string | null
          password_hash: string | null
          payload: Json
          share_token: string
          view_count: number
        }
        Insert: {
          allow_comments?: boolean
          created_at?: string
          expires_at?: string | null
          last_viewed_at?: string | null
          loadout_id?: string | null
          owner_id?: string | null
          password_hash?: string | null
          payload: Json
          share_token: string
          view_count?: number
        }
        Update: {
          allow_comments?: boolean
          created_at?: string
          expires_at?: string | null
          last_viewed_at?: string | null
          loadout_id?: string | null
          owner_id?: string | null
          password_hash?: string | null
          payload?: Json
          share_token?: string
          view_count?: number
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
          is_vip_loadout: boolean | null
          name: string
          seasons: Database["public"]["Enums"]["season"][] | null
          source_attribution: Json | null
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
          is_vip_loadout?: boolean | null
          name: string
          seasons?: Database["public"]["Enums"]["season"][] | null
          source_attribution?: Json | null
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
          is_vip_loadout?: boolean | null
          name?: string
          seasons?: Database["public"]["Enums"]["season"][] | null
          source_attribution?: Json | null
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
      merchant_blocks: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_blocks_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_catalog_items: {
        Row: {
          brand: string | null
          category_id: string | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          merchant_id: string
          name: string
          price: number
          sku: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_id: string
          name: string
          price: number
          sku: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          merchant_id?: string
          name?: string
          price?: number
          sku?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_catalog_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_catalog_items_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_loadout_items: {
        Row: {
          catalog_item_id: string
          created_at: string
          expert_note: string | null
          id: string
          loadout_id: string
          quantity: number
          sort_order: number | null
        }
        Insert: {
          catalog_item_id: string
          created_at?: string
          expert_note?: string | null
          id?: string
          loadout_id: string
          quantity?: number
          sort_order?: number | null
        }
        Update: {
          catalog_item_id?: string
          created_at?: string
          expert_note?: string | null
          id?: string
          loadout_id?: string
          quantity?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_loadout_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "merchant_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_loadout_items_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "merchant_loadout_pricing"
            referencedColumns: ["loadout_id"]
          },
          {
            foreignKeyName: "merchant_loadout_items_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "merchant_loadouts"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_loadouts: {
        Row: {
          created_at: string
          description: string | null
          discount_percent: number | null
          featured_until: string | null
          hero_image_url: string | null
          id: string
          is_featured: boolean | null
          merchant_id: string
          name: string
          published_at: string | null
          season: string[] | null
          slug: string
          status: string
          trip_type: string | null
          updated_at: string
          view_count: number | null
          wishlist_add_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          featured_until?: string | null
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          merchant_id: string
          name: string
          published_at?: string | null
          season?: string[] | null
          slug: string
          status?: string
          trip_type?: string | null
          updated_at?: string
          view_count?: number | null
          wishlist_add_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          featured_until?: string | null
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          merchant_id?: string
          name?: string
          published_at?: string | null
          season?: string[] | null
          slug?: string
          status?: string
          trip_type?: string | null
          updated_at?: string
          view_count?: number | null
          wishlist_add_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_loadouts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_locations: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          hours: Json | null
          id: string
          is_primary: boolean | null
          location: unknown
          merchant_id: string
          name: string
          phone: string | null
          postal_code: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string
          hours?: Json | null
          id?: string
          is_primary?: boolean | null
          location: unknown
          merchant_id: string
          name: string
          phone?: string | null
          postal_code: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          hours?: Json | null
          id?: string
          is_primary?: boolean | null
          location?: unknown
          merchant_id?: string
          name?: string
          phone?: string | null
          postal_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_locations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_offers: {
        Row: {
          catalog_item_id: string
          created_at: string
          expires_at: string
          id: string
          merchant_id: string
          message: string | null
          offer_fee_charged: number
          offer_price: number
          regular_price: number
          responded_at: string | null
          status: string
          user_id: string
          viewed_at: string | null
          wishlist_item_id: string | null
        }
        Insert: {
          catalog_item_id: string
          created_at?: string
          expires_at: string
          id?: string
          merchant_id: string
          message?: string | null
          offer_fee_charged?: number
          offer_price: number
          regular_price: number
          responded_at?: string | null
          status?: string
          user_id: string
          viewed_at?: string | null
          wishlist_item_id?: string | null
        }
        Update: {
          catalog_item_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          merchant_id?: string
          message?: string | null
          offer_fee_charged?: number
          offer_price?: number
          regular_price?: number
          responded_at?: string | null
          status?: string
          user_id?: string
          viewed_at?: string | null
          wishlist_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_offers_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "merchant_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_offers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_offers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_offers_wishlist_item_id_fkey"
            columns: ["wishlist_item_id"]
            isOneToOne: false
            referencedRelation: "community_availability"
            referencedColumns: ["gear_item_id"]
          },
          {
            foreignKeyName: "merchant_offers_wishlist_item_id_fkey"
            columns: ["wishlist_item_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_transactions: {
        Row: {
          amount: number
          billing_cycle_end: string
          billing_cycle_start: string
          created_at: string
          description: string | null
          id: string
          invoice_number: string | null
          merchant_id: string
          reference_id: string | null
          reference_type: string | null
          status: string
          type: string
        }
        Insert: {
          amount: number
          billing_cycle_end: string
          billing_cycle_start: string
          created_at?: string
          description?: string | null
          id?: string
          invoice_number?: string | null
          merchant_id: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type: string
        }
        Update: {
          amount?: number
          billing_cycle_end?: string
          billing_cycle_start?: string
          created_at?: string
          description?: string | null
          id?: string
          invoice_number?: string | null
          merchant_id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          business_name: string
          business_type: string
          contact_email: string
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          status: string
          tax_id: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          business_name: string
          business_type: string
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          business_name?: string
          business_type?: string
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchants_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          api_key: string | null
          api_key_hash: string | null
          contact_email: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          rate_limit_per_hour: number | null
          updated_at: string | null
          webhook_url: string | null
          website_url: string | null
        }
        Insert: {
          api_key?: string | null
          api_key_hash?: string | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          rate_limit_per_hour?: number | null
          updated_at?: string | null
          webhook_url?: string | null
          website_url?: string | null
        }
        Update: {
          api_key?: string | null
          api_key_hash?: string | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          rate_limit_per_hour?: number | null
          updated_at?: string | null
          webhook_url?: string | null
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
          product_image_url: string | null
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
          product_image_url?: string | null
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
          product_image_url?: string | null
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
          dismissed: boolean | null
          email_sent_at: string | null
          id: string
          link_url: string | null
          message: string
          offer_id: string | null
          price_data: Json | null
          push_sent_at: string | null
          read_at: string | null
          sent_via_email: boolean | null
          sent_via_push: boolean | null
          title: string
          tracking_id: string | null
          user_id: string
          valid_until: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          dismissed?: boolean | null
          email_sent_at?: string | null
          id?: string
          link_url?: string | null
          message: string
          offer_id?: string | null
          price_data?: Json | null
          push_sent_at?: string | null
          read_at?: string | null
          sent_via_email?: boolean | null
          sent_via_push?: boolean | null
          title: string
          tracking_id?: string | null
          user_id: string
          valid_until?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          dismissed?: boolean | null
          email_sent_at?: string | null
          id?: string
          link_url?: string | null
          message?: string
          offer_id?: string | null
          price_data?: Json | null
          push_sent_at?: string | null
          read_at?: string | null
          sent_via_email?: boolean | null
          sent_via_push?: boolean | null
          title?: string
          tracking_id?: string | null
          user_id?: string
          valid_until?: string | null
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
          manual_product_url: string | null
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
          manual_product_url?: string | null
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
          manual_product_url?: string | null
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
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          discoverable: boolean | null
          display_name: string | null
          email: string
          facebook: string | null
          follower_count: number | null
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
          privacy_preset: Database["public"]["Enums"]["privacy_preset"] | null
          read_receipts_enabled: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          shakedown_helpful_received: number
          shakedowns_created: number
          shakedowns_reviewed: number
          subscription_tier: string | null
          trail_name: string | null
          updated_at: string
          website: string | null
          youtube: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discoverable?: boolean | null
          display_name?: string | null
          email: string
          facebook?: string | null
          follower_count?: number | null
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
          privacy_preset?: Database["public"]["Enums"]["privacy_preset"] | null
          read_receipts_enabled?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          shakedown_helpful_received?: number
          shakedowns_created?: number
          shakedowns_reviewed?: number
          subscription_tier?: string | null
          trail_name?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discoverable?: boolean | null
          display_name?: string | null
          email?: string
          facebook?: string | null
          follower_count?: number | null
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
          privacy_preset?: Database["public"]["Enums"]["privacy_preset"] | null
          read_receipts_enabled?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          shakedown_helpful_received?: number
          shakedowns_created?: number
          shakedowns_reviewed?: number
          subscription_tier?: string | null
          trail_name?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      rate_limit_tracking: {
        Row: {
          id: string
          last_request_at: string
          operation_type: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          id?: string
          last_request_at?: string
          operation_type: string
          request_count?: number
          user_id: string
          window_start: string
        }
        Update: {
          id?: string
          last_request_at?: string
          operation_type?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      shakedown_badges: {
        Row: {
          awarded_at: string
          badge_type: Database["public"]["Enums"]["shakedown_badge"]
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_type: Database["public"]["Enums"]["shakedown_badge"]
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_type?: Database["public"]["Enums"]["shakedown_badge"]
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shakedown_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shakedown_bookmarks: {
        Row: {
          created_at: string
          id: string
          note: string | null
          shakedown_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          shakedown_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          shakedown_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shakedown_bookmarks_shakedown_id_fkey"
            columns: ["shakedown_id"]
            isOneToOne: false
            referencedRelation: "shakedowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_bookmarks_shakedown_id_fkey"
            columns: ["shakedown_id"]
            isOneToOne: false
            referencedRelation: "v_shakedowns_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shakedown_feedback: {
        Row: {
          author_id: string
          content: string
          content_html: string | null
          created_at: string
          depth: number
          edited_at: string | null
          gear_item_id: string | null
          helpful_count: number
          hidden_reason: string | null
          id: string
          is_edited: boolean
          is_hidden: boolean
          parent_id: string | null
          report_count: number
          shakedown_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          content_html?: string | null
          created_at?: string
          depth?: number
          edited_at?: string | null
          gear_item_id?: string | null
          helpful_count?: number
          hidden_reason?: string | null
          id?: string
          is_edited?: boolean
          is_hidden?: boolean
          parent_id?: string | null
          report_count?: number
          shakedown_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          content_html?: string | null
          created_at?: string
          depth?: number
          edited_at?: string | null
          gear_item_id?: string | null
          helpful_count?: number
          hidden_reason?: string | null
          id?: string
          is_edited?: boolean
          is_hidden?: boolean
          parent_id?: string | null
          report_count?: number
          shakedown_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shakedown_feedback_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "community_availability"
            referencedColumns: ["gear_item_id"]
          },
          {
            foreignKeyName: "shakedown_feedback_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "shakedown_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_shakedown_feedback_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_shakedown_id_fkey"
            columns: ["shakedown_id"]
            isOneToOne: false
            referencedRelation: "shakedowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_shakedown_id_fkey"
            columns: ["shakedown_id"]
            isOneToOne: false
            referencedRelation: "v_shakedowns_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      shakedown_feedback_reports: {
        Row: {
          created_at: string
          details: string | null
          feedback_id: string
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          feedback_id: string
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          feedback_id?: string
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shakedown_feedback_reports_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "shakedown_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_reports_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "v_shakedown_feedback_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shakedown_helpful_votes: {
        Row: {
          created_at: string
          feedback_id: string
          id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          id?: string
          voter_id: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shakedown_helpful_votes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "shakedown_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_helpful_votes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "v_shakedown_feedback_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_helpful_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shakedowns: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          concerns: string | null
          created_at: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          feedback_count: number
          helpful_count: number
          hidden_reason: string | null
          id: string
          is_hidden: boolean
          loadout_id: string
          owner_id: string
          privacy: Database["public"]["Enums"]["shakedown_privacy"]
          share_token: string | null
          status: Database["public"]["Enums"]["shakedown_status"]
          trip_end_date: string
          trip_name: string
          trip_start_date: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          concerns?: string | null
          created_at?: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          feedback_count?: number
          helpful_count?: number
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean
          loadout_id: string
          owner_id: string
          privacy?: Database["public"]["Enums"]["shakedown_privacy"]
          share_token?: string | null
          status?: Database["public"]["Enums"]["shakedown_status"]
          trip_end_date: string
          trip_name: string
          trip_start_date: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          concerns?: string | null
          created_at?: string
          experience_level?: Database["public"]["Enums"]["experience_level"]
          feedback_count?: number
          helpful_count?: number
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean
          loadout_id?: string
          owner_id?: string
          privacy?: Database["public"]["Enums"]["shakedown_privacy"]
          share_token?: string | null
          status?: Database["public"]["Enums"]["shakedown_status"]
          trip_end_date?: string
          trip_name?: string
          trip_start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shakedowns_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "loadouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedowns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
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
      user_bulletin_bans: {
        Row: {
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bulletin_bans_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bulletin_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
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
      user_location_shares: {
        Row: {
          city: string | null
          created_at: string
          granularity: string
          id: string
          location: unknown
          merchant_id: string
          neighborhood: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          granularity?: string
          id?: string
          location?: unknown
          merchant_id: string
          neighborhood?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          granularity?: string
          id?: string
          location?: unknown
          merchant_id?: string
          neighborhood?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_location_shares_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_location_shares_user_id_fkey"
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
      vip_accounts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          avatar_url: string
          bio: string
          claimed_by_user_id: string | null
          created_at: string
          id: string
          is_featured: boolean
          name: string
          slug: string
          social_links: Json
          status: string
          updated_at: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          avatar_url: string
          bio: string
          claimed_by_user_id?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          name: string
          slug: string
          social_links?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          avatar_url?: string
          bio?: string
          claimed_by_user_id?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          name?: string
          slug?: string
          social_links?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_accounts_claimed_by_user_id_fkey"
            columns: ["claimed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_bookmarks: {
        Row: {
          created_at: string
          user_id: string
          vip_loadout_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          vip_loadout_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          vip_loadout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_follows: {
        Row: {
          created_at: string
          follower_id: string
          vip_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          vip_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          vip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_follows_vip_id_fkey"
            columns: ["vip_id"]
            isOneToOne: false
            referencedRelation: "vip_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      web_search_usage: {
        Row: {
          cached: boolean
          conversation_id: string | null
          cost_usd: number
          created_at: string
          id: string
          latency_ms: number | null
          results_count: number | null
          search_query: string
          search_type: string
          user_id: string
        }
        Insert: {
          cached?: boolean
          conversation_id?: string | null
          cost_usd?: number
          created_at?: string
          id?: string
          latency_ms?: number | null
          results_count?: number | null
          search_query: string
          search_type: string
          user_id: string
        }
        Update: {
          cached?: boolean
          conversation_id?: string | null
          cost_usd?: number
          created_at?: string
          id?: string
          latency_ms?: number | null
          results_count?: number | null
          search_query?: string
          search_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_search_usage_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          current_step: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          started_at: string
          status: string
          step_results: Json | null
          user_id: string
          workflow_name: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          started_at?: string
          status: string
          step_results?: Json | null
          user_id: string
          workflow_name: string
        }
        Update: {
          completed_at?: string | null
          current_step?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          step_results?: Json | null
          user_id?: string
          workflow_name?: string
        }
        Relationships: []
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
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      merchant_loadout_pricing: {
        Row: {
          bundle_price: number | null
          discount_amount: number | null
          discount_percent: number | null
          individual_total: number | null
          item_count: number | null
          loadout_id: string | null
          merchant_id: string | null
          name: string | null
          total_weight_grams: number | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_loadouts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_execution_stats: {
        Row: {
          avg_execution_ms: number | null
          date: string | null
          failed: number | null
          max_execution_ms: number | null
          success_rate_pct: number | null
          successful: number | null
          tool_name: string | null
          total_executions: number | null
          total_retries: number | null
        }
        Relationships: []
      }
      v_bulletin_posts_with_author: {
        Row: {
          author_avatar: string | null
          author_id: string | null
          author_name: string | null
          content: string | null
          content_tsvector: unknown
          created_at: string | null
          id: string | null
          is_archived: boolean | null
          is_deleted: boolean | null
          linked_content_id: string | null
          linked_content_type:
            | Database["public"]["Enums"]["linked_content_type"]
            | null
          reply_count: number | null
          tag: Database["public"]["Enums"]["post_tag"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bulletin_replies_with_author: {
        Row: {
          author_avatar: string | null
          author_id: string | null
          author_name: string | null
          content: string | null
          created_at: string | null
          depth: number | null
          id: string | null
          is_deleted: boolean | null
          parent_reply_id: string | null
          post_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "bulletin_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "v_bulletin_replies_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "bulletin_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "v_bulletin_posts_with_author"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bulletin_reports_for_mods: {
        Row: {
          action_taken: Database["public"]["Enums"]["moderation_action"] | null
          content_author_id: string | null
          content_preview: string | null
          created_at: string | null
          details: string | null
          id: string | null
          reason: Database["public"]["Enums"]["report_reason"] | null
          report_count: number | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          target_id: string | null
          target_type: string | null
        }
        Relationships: []
      }
      v_shakedown_feedback_with_author: {
        Row: {
          author_avatar: string | null
          author_id: string | null
          author_name: string | null
          author_reputation: number | null
          content: string | null
          content_html: string | null
          created_at: string | null
          depth: number | null
          gear_item_id: string | null
          gear_item_name: string | null
          helpful_count: number | null
          id: string | null
          is_edited: boolean | null
          is_hidden: boolean | null
          parent_id: string | null
          shakedown_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shakedown_feedback_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "community_availability"
            referencedColumns: ["gear_item_id"]
          },
          {
            foreignKeyName: "shakedown_feedback_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "shakedown_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_shakedown_feedback_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_shakedown_id_fkey"
            columns: ["shakedown_id"]
            isOneToOne: false
            referencedRelation: "shakedowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedown_feedback_shakedown_id_fkey"
            columns: ["shakedown_id"]
            isOneToOne: false
            referencedRelation: "v_shakedowns_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      v_shakedowns_feed: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          author_reputation: number | null
          concerns: string | null
          created_at: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          feedback_count: number | null
          helpful_count: number | null
          id: string | null
          item_count: number | null
          loadout_id: string | null
          loadout_name: string | null
          owner_id: string | null
          privacy: Database["public"]["Enums"]["shakedown_privacy"] | null
          status: Database["public"]["Enums"]["shakedown_status"] | null
          total_weight_grams: number | null
          trip_end_date: string | null
          trip_name: string | null
          trip_start_date: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shakedowns_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "loadouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shakedowns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      web_search_usage_stats: {
        Row: {
          avg_latency_ms: number | null
          cache_hit_rate_pct: number | null
          cached_hits: number | null
          date: string | null
          total_cost_usd: number | null
          total_searches: number | null
          unique_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      add_conversation_entity: {
        Args: {
          p_conversation_id: string
          p_entity_id: string
          p_entity_name: string
          p_entity_type: string
        }
        Returns: Json
      }
      add_pending_action: {
        Args: {
          p_action_data: Json
          p_action_type: string
          p_conversation_id: string
        }
        Returns: string
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      archive_old_bulletin_posts: { Args: never; Returns: number }
      archive_old_shakedowns: { Args: never; Returns: number }
      are_friends: {
        Args: { p_user1: string; p_user2: string }
        Returns: boolean
      }
      can_edit_bulletin_post: {
        Args: { p_post_id: string; p_user_id: string }
        Returns: boolean
      }
      can_message_user: {
        Args: { p_recipient_id: string; p_sender_id: string }
        Returns: boolean
      }
      can_send_friend_request: {
        Args: { p_target_user_id: string }
        Returns: Json
      }
      check_and_award_badges: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      check_and_increment_daily_rate_limit: {
        Args: { p_limit: number; p_operation_type: string; p_user_id: string }
        Returns: Json
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
      check_bulletin_rate_limit: {
        Args: { p_action_type: string; p_user_id: string }
        Returns: boolean
      }
      check_duplicate_bulletin_post: {
        Args: { p_content: string; p_user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { p_limit: number; p_operation_type: string; p_user_id: string }
        Returns: boolean
      }
      check_rate_limit_only: {
        Args: {
          p_action: string
          p_limit: number
          p_user_id: string
          p_window_hours: number
        }
        Returns: Json
      }
      check_web_search_quota: {
        Args: { p_daily_limit?: number; p_user_id: string }
        Returns: Json
      }
      claim_vip_account: {
        Args: {
          p_invitation_id: string
          p_user_email: string
          p_user_id: string
          p_vip_id: string
        }
        Returns: Json
      }
      cleanup_daily_rate_limits: { Args: never; Returns: number }
      cleanup_delivery_queue: { Args: never; Returns: number }
      cleanup_expired_conversation_memory: { Args: never; Returns: number }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      clear_conversation_state: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      create_price_alert: {
        Args: {
          p_alert_type: string
          p_message: string
          p_price_data?: Json
          p_title: string
          p_tracking_id: string
          p_user_id: string
          p_valid_until?: string
        }
        Returns: string
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      enqueue_alert_delivery: {
        Args: {
          p_alert_id: string
          p_alert_type: string
          p_delivery_method?: string
          p_user_id: string
        }
        Returns: string
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      execute_gdpr_deletion: {
        Args: { p_deletion_id: string }
        Returns: undefined
      }
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
      fuzzy_search_column:
        | {
            Args: {
              p_column_name: string
              p_filters?: Json
              p_limit?: number
              p_range_column?: string
              p_range_max?: number
              p_range_min?: number
              p_search_value: string
              p_similarity_threshold?: number
              p_table_name: string
              p_user_id: string
            }
            Returns: {
              row_data: Json
              similarity_score: number
            }[]
          }
        | {
            Args: {
              p_column_name: string
              p_filters?: Json
              p_limit?: number
              p_range_column?: string
              p_range_max?: number
              p_range_min?: number
              p_search_value: string
              p_similarity_threshold?: number
              p_table_name: string
              p_user_id: string
            }
            Returns: {
              row_data: Json
              similarity_score: number
            }[]
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
      generate_claim_token: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_bulletin_rate_limit_status: {
        Args: { p_user_id: string }
        Returns: {
          posts_limit: number
          posts_remaining: number
          replies_limit: number
          replies_remaining: number
          resets_at: string
        }[]
      }
      get_category_ancestry: {
        Args: { p_category_id: number }
        Returns: {
          category_main: string
          category_top: string
          product_type: string
        }[]
      }
      get_conversation_state: {
        Args: { p_conversation_id: string }
        Returns: Json
      }
      get_daily_rate_limit_status: {
        Args: { p_limit: number; p_operation_type: string; p_user_id: string }
        Returns: Json
      }
      get_friend_activity_feed: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          metadata: Json
          reference_id: string
          reference_type: string
          user_id: string
        }[]
      }
      get_friend_activity_feed_filtered: {
        Args: {
          p_activity_type?: Database["public"]["Enums"]["activity_type"]
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          metadata: Json
          reference_id: string
          reference_type: string
          user_id: string
        }[]
      }
      get_merchant_analytics: {
        Args: { p_merchant_id: string; p_period_days?: number }
        Returns: {
          conversion_rate: number
          conversions: number
          loadout_views: number
          offers_accepted: number
          offers_sent: number
          revenue: number
          wishlist_adds: number
        }[]
      }
      get_mutual_friends: {
        Args: { p_user1: string; p_user2: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      get_next_delivery_batch: {
        Args: { p_batch_size?: number }
        Returns: {
          alert_id: string
          alert_type: string
          delivery_method: string
          id: string
          user_id: string
        }[]
      }
      get_or_create_direct_conversation: {
        Args: { p_user1: string; p_user2: string }
        Returns: string
      }
      get_or_create_web_search_cache: {
        Args: {
          p_cache_key: string
          p_search_query: string
          p_search_type: string
          p_ttl_hours?: number
        }
        Returns: {
          cache_id: string
          cached_data: Json
          is_expired: boolean
        }[]
      }
      get_proximity_bucket: {
        Args: { distance_meters: number }
        Returns: string
      }
      get_user_conversations: {
        Args: { p_include_archived?: boolean; p_user_id: string }
        Returns: {
          conv_created_at: string
          conv_created_by: string
          conv_id: string
          conv_name: string
          conv_type: string
          conv_updated_at: string
          conversation_id: string
          is_archived: boolean
          is_muted: boolean
          last_message: Json
          last_read_at: string
          participants: Json
          role: string
          unread_count: number
        }[]
      }
      get_user_daily_search_usage: {
        Args: { p_user_id: string }
        Returns: {
          cached_count: number
          search_count: number
          total_cost_usd: number
        }[]
      }
      get_user_tool_stats: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          avg_execution_time_ms: number
          failure_count: number
          success_count: number
          tool_name: string
          total_calls: number
          total_retries: number
        }[]
      }
      get_vip_follower_count: { Args: { p_vip_id: string }; Returns: number }
      get_vip_loadout_count: { Args: { p_vip_id: string }; Returns: number }
      get_vip_loadout_item_count: {
        Args: { p_loadout_id: string }
        Returns: number
      }
      get_vip_loadout_total_weight: {
        Args: { p_loadout_id: string }
        Returns: number
      }
      get_wishlist_insights_with_catalog: {
        Args: {
          merchant_lat: number
          merchant_lng: number
          p_limit?: number
          p_merchant_id: string
          radius_meters: number
        }
        Returns: {
          catalog_item_brand: string
          catalog_item_id: string
          catalog_item_name: string
          catalog_item_price: number
          proximity_100km_plus: number
          proximity_10km: number
          proximity_25km: number
          proximity_50km: number
          proximity_5km: number
          user_count: number
        }[]
      }
      get_wishlist_users_nearby:
        | {
            Args: {
              merchant_lat: number
              merchant_lng: number
              p_catalog_item_id?: string
              radius_meters: number
            }
            Returns: {
              added_days_ago: number
              anonymous_id: string
              can_send_offer: boolean
              proximity_bucket: string
              user_id: string
            }[]
          }
        | {
            Args: {
              merchant_lat: number
              merchant_lng: number
              p_catalog_item_id?: string
              p_limit?: number
              p_offset?: number
              radius_meters: number
            }
            Returns: {
              added_days_ago: number
              anonymous_id: string
              can_send_offer: boolean
              catalog_item_id: string
              proximity_bucket: string
              user_id: string
              wishlist_item_id: string
            }[]
          }
      gettransactionid: { Args: never; Returns: unknown }
      has_message_exchange: {
        Args: { p_user1: string; p_user2: string }
        Returns: boolean
      }
      increment_cache_usage: {
        Args: { p_cache_id: string }
        Returns: undefined
      }
      increment_conversation_turn: {
        Args: { p_conversation_id: string }
        Returns: number
      }
      increment_rate_limit: {
        Args: { p_operation_type: string; p_user_id: string }
        Returns: undefined
      }
      increment_share_view_count: {
        Args: { p_share_token: string; p_viewer_id?: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_loadout_bookmarked: {
        Args: { p_loadout_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_bulletin_banned: { Args: { p_user_id: string }; Returns: boolean }
      is_user_following_vip: {
        Args: { p_user_id: string; p_vip_id: string }
        Returns: boolean
      }
      log_tool_execution: {
        Args: {
          p_error_message?: string
          p_execution_time_ms?: number
          p_message_id: string
          p_retry_count?: number
          p_success: boolean
          p_tool_args: Json
          p_tool_name: string
          p_tool_result: Json
          p_user_id: string
        }
        Returns: string
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      notify_vip_claimed: { Args: { p_vip_id: string }; Returns: number }
      notify_vip_followers: {
        Args: { p_loadout_id: string; p_vip_id: string }
        Returns: number
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      purge_old_tool_logs: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      record_price_snapshot: {
        Args: {
          p_average_price: number
          p_highest_price: number
          p_lowest_price: number
          p_num_sources: number
          p_tracking_id: string
        }
        Returns: string
      }
      request_gdpr_deletion: { Args: { p_user_id: string }; Returns: string }
      reset_unread_count: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      respond_to_friend_request: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: Json
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
      search_users_with_block_status: {
        Args: { p_current_user_id: string; p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          can_message: boolean
          display_name: string
          id: string
        }[]
      }
      send_friend_request: {
        Args: { p_message?: string; p_recipient_id: string }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_conversation_state: {
        Args: { p_conversation_id: string; p_state_update: Json }
        Returns: Json
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      account_type: "standard" | "vip" | "merchant"
      activity_type:
        | "hiking"
        | "camping"
        | "climbing"
        | "skiing"
        | "backpacking"
      activity_visibility: "public" | "friends" | "private"
      conversation_type: "direct" | "group"
      experience_level: "beginner" | "intermediate" | "experienced" | "expert"
      friend_request_status: "pending" | "accepted" | "declined" | "expired"
      gear_condition: "new" | "used" | "worn"
      gear_status: "own" | "wishlist" | "sold" | "lent" | "retired"
      linked_content_type: "loadout" | "shakedown" | "marketplace_item"
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
      moderation_action:
        | "delete_content"
        | "warn_user"
        | "ban_1d"
        | "ban_7d"
        | "ban_permanent"
        | "dismiss"
      participant_role: "member" | "admin"
      post_tag:
        | "question"
        | "shakedown"
        | "trade"
        | "trip_planning"
        | "gear_advice"
        | "other"
      privacy_preset: "only_me" | "friends_only" | "everyone" | "custom"
      report_reason: "spam" | "harassment" | "inappropriate_content" | "other"
      report_status: "pending" | "reviewed" | "resolved" | "dismissed"
      season: "spring" | "summer" | "fall" | "winter"
      shakedown_badge: "shakedown_helper" | "trail_expert" | "community_legend"
      shakedown_privacy: "public" | "friends_only" | "private"
      shakedown_status: "open" | "completed" | "archived"
      user_role: "user" | "admin"
      weight_unit: "g" | "oz" | "lb"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: ["standard", "vip", "merchant"],
      activity_type: ["hiking", "camping", "climbing", "skiing", "backpacking"],
      activity_visibility: ["public", "friends", "private"],
      conversation_type: ["direct", "group"],
      experience_level: ["beginner", "intermediate", "experienced", "expert"],
      friend_request_status: ["pending", "accepted", "declined", "expired"],
      gear_condition: ["new", "used", "worn"],
      gear_status: ["own", "wishlist", "sold", "lent", "retired"],
      linked_content_type: ["loadout", "shakedown", "marketplace_item"],
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
      moderation_action: [
        "delete_content",
        "warn_user",
        "ban_1d",
        "ban_7d",
        "ban_permanent",
        "dismiss",
      ],
      participant_role: ["member", "admin"],
      post_tag: [
        "question",
        "shakedown",
        "trade",
        "trip_planning",
        "gear_advice",
        "other",
      ],
      privacy_preset: ["only_me", "friends_only", "everyone", "custom"],
      report_reason: ["spam", "harassment", "inappropriate_content", "other"],
      report_status: ["pending", "reviewed", "resolved", "dismissed"],
      season: ["spring", "summer", "fall", "winter"],
      shakedown_badge: ["shakedown_helper", "trail_expert", "community_legend"],
      shakedown_privacy: ["public", "friends_only", "private"],
      shakedown_status: ["open", "completed", "archived"],
      user_role: ["user", "admin"],
      weight_unit: ["g", "oz", "lb"],
    },
  },
} as const
