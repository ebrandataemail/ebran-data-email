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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ads_assets: {
        Row: {
          account_identifier: string | null
          created_at: string
          description: string | null
          environment: string
          expires_at: string | null
          id: string
          metadata: Json
          name: string
          platform: string
          project_id: string | null
          status: string
          updated_at: string
          user_id: string
          value_enc: string
          website_url: string | null
        }
        Insert: {
          account_identifier?: string | null
          created_at?: string
          description?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          name: string
          platform: string
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          value_enc: string
          website_url?: string | null
        }
        Update: {
          account_identifier?: string | null
          created_at?: string
          description?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          platform?: string
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          value_enc?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_assets_project_owner_fkey"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          message_id: string
          parts: Json
          role: string
          seq: number
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          message_id: string
          parts: Json
          role: string
          seq?: never
          user_id?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          message_id?: string
          parts?: Json
          role?: string
          seq?: never
          user_id?: string
        }
        Relationships: []
      }
      client_brand_assets: {
        Row: {
          asset_type: string
          client_id: string
          created_at: string
          file_path: string | null
          id: string
          name: string
          notes: string | null
          user_id: string
          value: string | null
        }
        Insert: {
          asset_type: string
          client_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          name: string
          notes?: string | null
          user_id?: string
          value?: string | null
        }
        Update: {
          asset_type?: string
          client_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_brand_assets_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      client_brand_profiles: {
        Row: {
          agency_goals: string | null
          client_id: string
          company_overview: string | null
          created_at: string
          do_rules: string | null
          dont_rules: string | null
          id: string
          important_notes: string | null
          pain_points: string | null
          primary_color: string
          secondary_color: string
          service_priority: string
          tags: string[]
          tone_of_voice: string | null
          updated_at: string
          user_id: string
          vault_notes: string | null
        }
        Insert: {
          agency_goals?: string | null
          client_id: string
          company_overview?: string | null
          created_at?: string
          do_rules?: string | null
          dont_rules?: string | null
          id?: string
          important_notes?: string | null
          pain_points?: string | null
          primary_color?: string
          secondary_color?: string
          service_priority?: string
          tags?: string[]
          tone_of_voice?: string | null
          updated_at?: string
          user_id?: string
          vault_notes?: string | null
        }
        Update: {
          agency_goals?: string | null
          client_id?: string
          company_overview?: string | null
          created_at?: string
          do_rules?: string | null
          dont_rules?: string | null
          id?: string
          important_notes?: string | null
          pain_points?: string | null
          primary_color?: string
          secondary_color?: string
          service_priority?: string
          tags?: string[]
          tone_of_voice?: string | null
          updated_at?: string
          user_id?: string
          vault_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_brand_profiles_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      client_design_comments: {
        Row: {
          client_id: string
          comment: string
          created_at: string
          id: string
          user_id: string
          version_id: string
          x: number | null
          y: number | null
        }
        Insert: {
          client_id: string
          comment: string
          created_at?: string
          id?: string
          user_id?: string
          version_id: string
          x?: number | null
          y?: number | null
        }
        Update: {
          client_id?: string
          comment?: string
          created_at?: string
          id?: string
          user_id?: string
          version_id?: string
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_design_comments_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "client_design_comments_version_owner_fkey"
            columns: ["version_id", "user_id"]
            isOneToOne: false
            referencedRelation: "client_design_versions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      client_design_reviews: {
        Row: {
          client_id: string
          created_at: string
          decision: string
          id: string
          note: string | null
          user_id: string
          version_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          decision: string
          id?: string
          note?: string | null
          user_id?: string
          version_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_design_reviews_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "client_design_reviews_version_owner_fkey"
            columns: ["version_id", "user_id"]
            isOneToOne: false
            referencedRelation: "client_design_versions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      client_design_versions: {
        Row: {
          client_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          reviewed_at: string | null
          status: string
          task_id: string | null
          title: string
          user_id: string
          version_label: string
        }
        Insert: {
          client_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          reviewed_at?: string | null
          status?: string
          task_id?: string | null
          title: string
          user_id?: string
          version_label?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          reviewed_at?: string | null
          status?: string
          task_id?: string | null
          title?: string
          user_id?: string
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_design_versions_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "client_design_versions_task_owner_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      client_digital_assets: {
        Row: {
          asset_name: string
          asset_type: string
          asset_url: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          owner_email: string | null
          platform: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          asset_name: string
          asset_type?: string
          asset_url?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_email?: string | null
          platform?: string | null
          user_id?: string
          username?: string | null
        }
        Update: {
          asset_name?: string
          asset_type?: string
          asset_url?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_email?: string | null
          platform?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_digital_assets_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          document_date: string | null
          document_type: string
          expiry_date: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          title: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          document_date?: string | null
          document_type?: string
          expiry_date?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          title: string
          user_id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          document_date?: string | null
          document_type?: string
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      client_task_notes: {
        Row: {
          client_id: string
          color: string
          created_at: string
          id: string
          note: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          id?: string
          note: string
          task_id?: string | null
          user_id?: string
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          id?: string
          note?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_task_notes_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "client_task_notes_task_owner_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          assignee: string | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          sort_order: number
          status: string
          task_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          sort_order?: number
          status?: string
          task_type?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          assignee?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          sort_order?: number
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      client_timeline_events: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          title: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          title: string
          user_id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_timeline_events_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          client_status: string
          company_profile: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          industry: string | null
          internal_notes: string | null
          legal_name: string | null
          logo_path: string | null
          name: string
          scope_of_work: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_status?: string
          company_profile?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          legal_name?: string | null
          logo_path?: string | null
          name: string
          scope_of_work?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_status?: string
          company_profile?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          legal_name?: string | null
          logo_path?: string | null
          name?: string
          scope_of_work?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      developer_assets: {
        Row: {
          created_at: string
          description: string | null
          environment: string
          expires_at: string | null
          id: string
          metadata: Json
          name: string
          project_id: string | null
          provider: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
          username: string | null
          value_enc: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          name: string
          project_id?: string | null
          provider?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id?: string
          username?: string | null
          value_enc: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          project_id?: string | null
          provider?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          username?: string | null
          value_enc?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "developer_assets_project_owner_fkey"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          alt_password_enc: string | null
          created_at: string
          email: string
          id: string
          lovable_status: string
          note: string | null
          password_enc: string | null
          project_id: string | null
          provider: string
          pw_classes: number | null
          pw_common_pattern: boolean
          pw_fingerprint: string | null
          pw_length: number | null
          pw_matches_email: boolean
          updated_at: string
          usage_tag: string | null
          user_id: string
        }
        Insert: {
          alt_password_enc?: string | null
          created_at?: string
          email: string
          id?: string
          lovable_status?: string
          note?: string | null
          password_enc?: string | null
          project_id?: string | null
          provider: string
          pw_classes?: number | null
          pw_common_pattern?: boolean
          pw_fingerprint?: string | null
          pw_length?: number | null
          pw_matches_email?: boolean
          updated_at?: string
          usage_tag?: string | null
          user_id?: string
        }
        Update: {
          alt_password_enc?: string | null
          created_at?: string
          email?: string
          id?: string
          lovable_status?: string
          note?: string | null
          password_enc?: string | null
          project_id?: string | null
          provider?: string
          pw_classes?: number | null
          pw_common_pattern?: boolean
          pw_fingerprint?: string | null
          pw_length?: number | null
          pw_matches_email?: boolean
          updated_at?: string
          usage_tag?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_project_owner_fkey"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      gmail_mailbox_connections: {
        Row: {
          connected_at: string
          email_account_id: string
          google_email: string
          google_subject: string | null
          id: string
          last_checked_at: string | null
          refresh_token_ciphertext: string
          scopes: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          email_account_id: string
          google_email: string
          google_subject?: string | null
          id?: string
          last_checked_at?: string | null
          refresh_token_ciphertext: string
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          email_account_id?: string
          google_email?: string
          google_subject?: string | null
          id?: string
          last_checked_at?: string | null
          refresh_token_ciphertext?: string
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_mailbox_connections_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: true
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_oauth_states: {
        Row: {
          created_at: string
          email_account_id: string
          expires_at: string
          redirect_after: string
          state_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_account_id: string
          expires_at: string
          redirect_after: string
          state_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_account_id?: string
          expires_at?: string
          redirect_after?: string
          state_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_oauth_states_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lovable_projects: {
        Row: {
          account_id: string
          created_at: string
          id: string
          name: string
          note: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          name: string
          note?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lovable_projects_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      social_account_snapshots: {
        Row: {
          captured_at: string
          followers_count: number | null
          following_count: number | null
          id: string
          impressions_count: number | null
          metadata: Json
          posts_count: number | null
          profile_visits: number | null
          reach_count: number | null
          social_account_id: string
          source: string
          total_likes: number | null
          total_views: number | null
          user_id: string
        }
        Insert: {
          captured_at?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          impressions_count?: number | null
          metadata?: Json
          posts_count?: number | null
          profile_visits?: number | null
          reach_count?: number | null
          social_account_id: string
          source?: string
          total_likes?: number | null
          total_views?: number | null
          user_id?: string
        }
        Update: {
          captured_at?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          impressions_count?: number | null
          metadata?: Json
          posts_count?: number | null
          profile_visits?: number | null
          reach_count?: number | null
          social_account_id?: string
          source?: string
          total_likes?: number | null
          total_views?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_snapshots_account_owner_fkey"
            columns: ["social_account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          account_type: string
          avatar_url: string | null
          bio: string | null
          connected_at: string | null
          connection_mode: string
          connection_status: string
          created_at: string
          display_name: string
          followers_count: number | null
          following_count: number | null
          id: string
          last_synced_at: string | null
          metadata: Json
          notes: string | null
          platform: string
          posts_count: number | null
          profile_url: string | null
          project_id: string | null
          provider_account_id: string | null
          sync_error: string | null
          total_likes: number | null
          total_views: number | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          connected_at?: string | null
          connection_mode?: string
          connection_status?: string
          created_at?: string
          display_name: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json
          notes?: string | null
          platform: string
          posts_count?: number | null
          profile_url?: string | null
          project_id?: string | null
          provider_account_id?: string | null
          sync_error?: string | null
          total_likes?: number | null
          total_views?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          connected_at?: string | null
          connection_mode?: string
          connection_status?: string
          created_at?: string
          display_name?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json
          notes?: string | null
          platform?: string
          posts_count?: number | null
          profile_url?: string | null
          project_id?: string | null
          provider_account_id?: string | null
          sync_error?: string | null
          total_likes?: number | null
          total_views?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_project_owner_fkey"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      social_posts: {
        Row: {
          caption: string | null
          comments_count: number | null
          created_at: string
          engagement_rate: number | null
          id: string
          likes_count: number | null
          media_type: string
          metadata: Json
          permalink: string | null
          platform_post_id: string | null
          published_at: string | null
          reach_count: number | null
          saves_count: number | null
          shares_count: number | null
          social_account_id: string
          source: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          engagement_rate?: number | null
          id?: string
          likes_count?: number | null
          media_type?: string
          metadata?: Json
          permalink?: string | null
          platform_post_id?: string | null
          published_at?: string | null
          reach_count?: number | null
          saves_count?: number | null
          shares_count?: number | null
          social_account_id: string
          source?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          engagement_rate?: number | null
          id?: string
          likes_count?: number | null
          media_type?: string
          metadata?: Json
          permalink?: string | null
          platform_post_id?: string | null
          published_at?: string | null
          reach_count?: number | null
          saves_count?: number | null
          shares_count?: number | null
          social_account_id?: string
          source?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_account_owner_fkey"
            columns: ["social_account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      social_sync_logs: {
        Row: {
          finished_at: string | null
          id: string
          message: string | null
          metadata: Json
          platform: string
          records_synced: number
          social_account_id: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          platform: string
          records_synced?: number
          social_account_id?: string | null
          started_at?: string
          status: string
          user_id?: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          platform?: string
          records_synced?: number
          social_account_id?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_sync_logs_account_owner_fkey"
            columns: ["social_account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_activities: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json
          task_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json
          task_id: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          task_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activities_task_owner_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_brief_acceptance_criteria: {
        Row: {
          created_at: string
          criterion: string
          deliverable_id: string
          id: string
          is_completed: boolean
          is_required: boolean
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          criterion: string
          deliverable_id: string
          id?: string
          is_completed?: boolean
          is_required?: boolean
          sort_order?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          criterion?: string
          deliverable_id?: string
          id?: string
          is_completed?: boolean
          is_required?: boolean
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_brief_acceptance_deliverable_owner_fkey"
            columns: ["deliverable_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_brief_deliverables"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_brief_approvals: {
        Row: {
          brief_id: string
          created_at: string
          decision: string
          id: string
          note: string | null
          reviewer_id: string
          user_id: string
          version_number: number
        }
        Insert: {
          brief_id: string
          created_at?: string
          decision: string
          id?: string
          note?: string | null
          reviewer_id?: string
          user_id?: string
          version_number: number
        }
        Update: {
          brief_id?: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          reviewer_id?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_brief_approvals_brief_owner_fkey"
            columns: ["brief_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_briefs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_brief_comments: {
        Row: {
          brief_id: string
          comment: string
          created_at: string
          id: string
          section_key: string | null
          user_id: string
        }
        Insert: {
          brief_id: string
          comment: string
          created_at?: string
          id?: string
          section_key?: string | null
          user_id?: string
        }
        Update: {
          brief_id?: string
          comment?: string
          created_at?: string
          id?: string
          section_key?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_brief_comments_brief_owner_fkey"
            columns: ["brief_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_briefs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_brief_deliverables: {
        Row: {
          brief_id: string
          created_at: string
          description: string | null
          format: string | null
          id: string
          quantity: number
          revision_quota: number
          scope_type: string
          sort_order: number
          specifications: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brief_id: string
          created_at?: string
          description?: string | null
          format?: string | null
          id?: string
          quantity?: number
          revision_quota?: number
          scope_type?: string
          sort_order?: number
          specifications?: Json
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          brief_id?: string
          created_at?: string
          description?: string | null
          format?: string | null
          id?: string
          quantity?: number
          revision_quota?: number
          scope_type?: string
          sort_order?: number
          specifications?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_brief_deliverables_brief_owner_fkey"
            columns: ["brief_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_briefs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_brief_revision_requests: {
        Row: {
          brief_id: string
          created_at: string
          deliverable_id: string | null
          description: string
          estimated_extra_cost: number | null
          estimated_extra_hours: number | null
          id: string
          quota_consumed: boolean
          request_type: string
          resolved_at: string | null
          round_number: number | null
          status: string
          user_id: string
        }
        Insert: {
          brief_id: string
          created_at?: string
          deliverable_id?: string | null
          description: string
          estimated_extra_cost?: number | null
          estimated_extra_hours?: number | null
          id?: string
          quota_consumed?: boolean
          request_type: string
          resolved_at?: string | null
          round_number?: number | null
          status?: string
          user_id?: string
        }
        Update: {
          brief_id?: string
          created_at?: string
          deliverable_id?: string | null
          description?: string
          estimated_extra_cost?: number | null
          estimated_extra_hours?: number | null
          id?: string
          quota_consumed?: boolean
          request_type?: string
          resolved_at?: string | null
          round_number?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_brief_revisions_brief_owner_fkey"
            columns: ["brief_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_briefs"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "task_brief_revisions_deliverable_owner_fkey"
            columns: ["deliverable_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_brief_deliverables"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_brief_share_feedback: {
        Row: {
          client_name: string
          comment: string | null
          created_at: string
          decision: string | null
          id: string
          share_id: string
          user_id: string
        }
        Insert: {
          client_name: string
          comment?: string | null
          created_at?: string
          decision?: string | null
          id?: string
          share_id: string
          user_id: string
        }
        Update: {
          client_name?: string
          comment?: string | null
          created_at?: string
          decision?: string | null
          id?: string
          share_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_brief_share_feedback_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "task_brief_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      task_brief_shares: {
        Row: {
          allow_comments: boolean
          allow_confirmation: boolean
          brief_id: string
          created_at: string
          expires_at: string | null
          id: string
          revoked_at: string | null
          token_hash: string
          user_id: string
          version_number: number
        }
        Insert: {
          allow_comments?: boolean
          allow_confirmation?: boolean
          brief_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          token_hash: string
          user_id?: string
          version_number?: number
        }
        Update: {
          allow_comments?: boolean
          allow_confirmation?: boolean
          brief_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_brief_shares_brief_owner_fkey"
            columns: ["brief_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_briefs"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "task_brief_shares_version_fkey"
            columns: ["brief_id", "version_number"]
            isOneToOne: false
            referencedRelation: "task_brief_versions"
            referencedColumns: ["brief_id", "version_number"]
          },
        ]
      }
      task_brief_sources: {
        Row: {
          brief_id: string
          created_at: string
          extracted_text: string | null
          id: string
          metadata: Json
          source_status: string
          source_type: string
          source_url: string | null
          storage_path: string | null
          title: string
          user_id: string
        }
        Insert: {
          brief_id: string
          created_at?: string
          extracted_text?: string | null
          id?: string
          metadata?: Json
          source_status?: string
          source_type: string
          source_url?: string | null
          storage_path?: string | null
          title: string
          user_id?: string
        }
        Update: {
          brief_id?: string
          created_at?: string
          extracted_text?: string | null
          id?: string
          metadata?: Json
          source_status?: string
          source_type?: string
          source_url?: string | null
          storage_path?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_brief_sources_brief_owner_fkey"
            columns: ["brief_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_briefs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_brief_versions: {
        Row: {
          brief_id: string
          change_note: string | null
          created_at: string
          created_by: string | null
          id: string
          snapshot: Json
          status: string
          user_id: string
          version_number: number
        }
        Insert: {
          brief_id: string
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot: Json
          status: string
          user_id?: string
          version_number: number
        }
        Update: {
          brief_id?: string
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot?: Json
          status?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_brief_versions_brief_owner_fkey"
            columns: ["brief_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_briefs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_briefs: {
        Row: {
          ai_summary: string | null
          approved_at: string | null
          approved_by: string | null
          assumptions: Json
          budget_max: number | null
          budget_min: number | null
          client_id: string
          created_at: string
          currency: string
          current_version: number
          estimated_days: number | null
          estimated_hours: number | null
          id: string
          open_questions: Json
          priority_suggestion: string | null
          project_id: string | null
          sections: Json
          status: string
          suggested_tools: Json
          task_id: string
          title: string
          updated_at: string
          user_id: string
          work_steps: Json
        }
        Insert: {
          ai_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assumptions?: Json
          budget_max?: number | null
          budget_min?: number | null
          client_id: string
          created_at?: string
          currency?: string
          current_version?: number
          estimated_days?: number | null
          estimated_hours?: number | null
          id?: string
          open_questions?: Json
          priority_suggestion?: string | null
          project_id?: string | null
          sections?: Json
          status?: string
          suggested_tools?: Json
          task_id: string
          title: string
          updated_at?: string
          user_id?: string
          work_steps?: Json
        }
        Update: {
          ai_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assumptions?: Json
          budget_max?: number | null
          budget_min?: number | null
          client_id?: string
          created_at?: string
          currency?: string
          current_version?: number
          estimated_days?: number | null
          estimated_hours?: number | null
          id?: string
          open_questions?: Json
          priority_suggestion?: string | null
          project_id?: string | null
          sections?: Json
          status?: string
          suggested_tools?: Json
          task_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          work_steps?: Json
        }
        Relationships: [
          {
            foreignKeyName: "task_briefs_client_owner_fkey"
            columns: ["client_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "task_briefs_project_owner_fkey"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "task_briefs_task_owner_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string
          deliverable_id: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          deliverable_id?: string | null
          id?: string
          task_id: string
          user_id?: string
        }
        Update: {
          comment?: string
          created_at?: string
          deliverable_id?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_deliverable_owner_fkey"
            columns: ["deliverable_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_deliverables"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "task_comments_task_owner_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_deliverable_versions: {
        Row: {
          change_note: string | null
          created_at: string
          deliverable_id: string
          id: string
          snapshot: Json
          task_id: string
          title: string
          user_id: string
          version_number: number
        }
        Insert: {
          change_note?: string | null
          created_at?: string
          deliverable_id: string
          id?: string
          snapshot?: Json
          task_id: string
          title: string
          user_id?: string
          version_number: number
        }
        Update: {
          change_note?: string | null
          created_at?: string
          deliverable_id?: string
          id?: string
          snapshot?: Json
          task_id?: string
          title?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_deliverable_versions_deliverable_owner_fkey"
            columns: ["deliverable_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_deliverables"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "task_deliverable_versions_task_owner_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_deliverables: {
        Row: {
          content: string | null
          created_at: string
          deliverable_type: string
          description: string | null
          file_name: string | null
          file_path: string | null
          id: string
          metadata: Json
          mime_type: string | null
          sort_order: number
          status: string
          task_id: string
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          deliverable_type?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          sort_order?: number
          status?: string
          task_id: string
          title: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          deliverable_type?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          sort_order?: number
          status?: string
          task_id?: string
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_deliverables_task_owner_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_reviews: {
        Row: {
          created_at: string
          decision: string
          deliverable_id: string | null
          id: string
          note: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          deliverable_id?: string | null
          id?: string
          note?: string | null
          task_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          decision?: string
          deliverable_id?: string | null
          id?: string
          note?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reviews_deliverable_owner_fkey"
            columns: ["deliverable_id", "user_id"]
            isOneToOne: false
            referencedRelation: "task_deliverables"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "task_reviews_task_owner_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_shared_task_brief: { Args: { p_token_hash: string }; Returns: Json }
      submit_shared_task_brief_feedback: {
        Args: {
          p_client_name: string
          p_comment: string
          p_decision?: string
          p_token_hash: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
