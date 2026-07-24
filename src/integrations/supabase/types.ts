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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          anthropic_api_key: string | null
          created_at: string | null
          id: string
          name: string
          news_api_key: string | null
          openai_api_key: string | null
          primary_color: string | null
          updated_at: string | null
          windsor_api_key: string | null
        }
        Insert: {
          anthropic_api_key?: string | null
          created_at?: string | null
          id?: string
          name: string
          news_api_key?: string | null
          openai_api_key?: string | null
          primary_color?: string | null
          updated_at?: string | null
          windsor_api_key?: string | null
        }
        Update: {
          anthropic_api_key?: string | null
          created_at?: string | null
          id?: string
          name?: string
          news_api_key?: string | null
          openai_api_key?: string | null
          primary_color?: string | null
          updated_at?: string | null
          windsor_api_key?: string | null
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          mode: string | null
          model: string | null
          name: string
          provider: string | null
          system_prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          mode?: string | null
          model?: string | null
          name: string
          provider?: string | null
          system_prompt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          mode?: string | null
          model?: string | null
          name?: string
          provider?: string | null
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id: string
          parts?: Json
          role: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_threads: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          mode: string
          model: string
          provider: string
          report_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          mode?: string
          model?: string
          provider?: string
          report_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          mode?: string
          model?: string
          provider?: string
          report_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_threads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_threads_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      app_features: {
        Row: {
          enabled: boolean
          key: string
          label: string
          updated_at: string | null
        }
        Insert: {
          enabled?: boolean
          key: string
          label: string
          updated_at?: string | null
        }
        Update: {
          enabled?: boolean
          key?: string
          label?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      client_users: {
        Row: {
          client_id: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          agency_id: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      demandas: {
        Row: {
          assignee_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          month: number
          quantity: number
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          quantity?: number
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          quantity?: number
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "entregas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ga_connections: {
        Row: {
          created_at: string
          ga_property_id: string
          google_email: string | null
          id: string
          label: string | null
          refresh_token: string
          report_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ga_property_id: string
          google_email?: string | null
          id?: string
          label?: string | null
          refresh_token: string
          report_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ga_property_id?: string
          google_email?: string | null
          id?: string
          label?: string | null
          refresh_token?: string
          report_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ga_connections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_campaigns: {
        Row: {
          abs_top_impression_share: number | null
          avg_cpc: number
          campaign_name: string
          campaign_type: string | null
          clicks: number
          conv_rate: number
          conversions: number
          cost: number
          cost_per_conv: number
          ctr: number
          dataset_id: string
          id: string
          impressions: number
          status: string | null
          top_impression_share: number | null
          view_conversions: number
        }
        Insert: {
          abs_top_impression_share?: number | null
          avg_cpc?: number
          campaign_name: string
          campaign_type?: string | null
          clicks?: number
          conv_rate?: number
          conversions?: number
          cost?: number
          cost_per_conv?: number
          ctr?: number
          dataset_id: string
          id?: string
          impressions?: number
          status?: string | null
          top_impression_share?: number | null
          view_conversions?: number
        }
        Update: {
          abs_top_impression_share?: number | null
          avg_cpc?: number
          campaign_name?: string
          campaign_type?: string | null
          clicks?: number
          conv_rate?: number
          conversions?: number
          cost?: number
          cost_per_conv?: number
          ctr?: number
          dataset_id?: string
          id?: string
          impressions?: number
          status?: string | null
          top_impression_share?: number | null
          view_conversions?: number
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_campaigns_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "google_ads_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_datasets: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          id: string
          period_end: string | null
          period_label: string
          period_start: string | null
          source_filename: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          period_end?: string | null
          period_label: string
          period_start?: string | null
          source_filename?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          period_end?: string | null
          period_label?: string
          period_start?: string | null
          source_filename?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_datasets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          organization_name: string | null
          organization_urn: string | null
          refresh_token: string | null
          refresh_token_expires_at: string | null
          report_id: string
          scope: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          organization_name?: string | null
          organization_urn?: string | null
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          report_id: string
          scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          organization_name?: string | null
          organization_urn?: string | null
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          report_id?: string
          scope?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_connections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_connections: {
        Row: {
          access_token: string
          connected_by: string | null
          created_at: string
          discovered_pages: Json
          fb_user_id: string | null
          fb_user_name: string | null
          id: string
          report_id: string
          scope: string | null
          selected_assets: Json | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          connected_by?: string | null
          created_at?: string
          discovered_pages?: Json
          fb_user_id?: string | null
          fb_user_name?: string | null
          id?: string
          report_id: string
          scope?: string | null
          selected_assets?: Json | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          connected_by?: string | null
          created_at?: string
          discovered_pages?: Json
          fb_user_id?: string | null
          fb_user_name?: string | null
          id?: string
          report_id?: string
          scope?: string | null
          selected_assets?: Json | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_connections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      pipedrive_connections: {
        Row: {
          access_token: string
          api_domain: string
          company_domain: string
          created_at: string
          expires_at: string
          id: string
          pd_user_email: string | null
          pd_user_id: number | null
          pd_user_name: string | null
          refresh_token: string
          report_id: string
          scope: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          api_domain: string
          company_domain: string
          created_at?: string
          expires_at: string
          id?: string
          pd_user_email?: string | null
          pd_user_id?: number | null
          pd_user_name?: string | null
          refresh_token: string
          report_id: string
          scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          api_domain?: string
          company_domain?: string
          created_at?: string
          expires_at?: string
          id?: string
          pd_user_email?: string | null
          pd_user_id?: number | null
          pd_user_name?: string | null
          refresh_token?: string
          report_id?: string
          scope?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipedrive_connections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rdstation_connections: {
        Row: {
          access_token: string
          account_name: string | null
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          report_id: string
          show_conversions: boolean
          show_emails: boolean
          updated_at: string
        }
        Insert: {
          access_token: string
          account_name?: string | null
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          report_id: string
          show_conversions?: boolean
          show_emails?: boolean
          updated_at?: string
        }
        Update: {
          access_token?: string
          account_name?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          report_id?: string
          show_conversions?: boolean
          show_emails?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdstation_connections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_sections: {
        Row: {
          created_at: string
          embed_code: string | null
          id: string
          position: number
          report_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          embed_code?: string | null
          id?: string
          position?: number
          report_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          embed_code?: string | null
          id?: string
          position?: number
          report_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_sections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          agency_id: string | null
          client_id: string | null
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          embed_code: string | null
          id: string
          logo_url: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          agency_id?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          embed_code?: string | null
          id?: string
          logo_url?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          agency_id?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          embed_code?: string | null
          id?: string
          logo_url?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_config: {
        Row: {
          created_at: string
          id: string
          label: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_events: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          color: string | null
          company_id: string | null
          created_at: string
          description: string | null
          drive_link: string | null
          editorial_line: string | null
          event_date: string
          format: string | null
          funnel_stage: string | null
          id: string
          kanban_stage: string | null
          objective: string | null
          social_network: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          drive_link?: string | null
          editorial_line?: string | null
          event_date: string
          format?: string | null
          funnel_stage?: string | null
          id?: string
          kanban_stage?: string | null
          objective?: string | null
          social_network?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          drive_link?: string | null
          editorial_line?: string | null
          event_date?: string
          format?: string | null
          funnel_stage?: string | null
          id?: string
          kanban_stage?: string | null
          objective?: string | null
          social_network?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          agency_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      windsor_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          payload: Json
          report_id: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          payload: Json
          report_id?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          payload?: Json
          report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "windsor_cache_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      windsor_connections: {
        Row: {
          account_id: string
          account_name: string | null
          connector: string
          created_at: string
          id: string
          report_id: string
        }
        Insert: {
          account_id: string
          account_name?: string | null
          connector: string
          created_at?: string
          id?: string
          report_id: string
        }
        Update: {
          account_id?: string
          account_name?: string | null
          connector?: string
          created_at?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "windsor_connections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "team"
        | "conexoes"
        | "admin_global"
        | "admin_agencia"
        | "equipe"
        | "usuario"
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
      app_role: [
        "admin",
        "user",
        "team",
        "conexoes",
        "admin_global",
        "admin_agencia",
        "equipe",
        "usuario",
      ],
    },
  },
} as const
