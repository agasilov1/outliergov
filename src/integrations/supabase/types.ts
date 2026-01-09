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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      anomalies_offline: {
        Row: {
          allowed_vs_peer_median: number | null
          allowed_vs_peer_median_log: number | null
          beneficiary_count: number | null
          created_at: string | null
          id: string
          npi: string
          peer_group_size: number | null
          peer_median_allowed: number | null
          peer_p75_allowed: number | null
          percentile_rank: number | null
          provider_name: string | null
          service_count: number | null
          specialty: string | null
          state: string | null
          total_allowed_amount: number | null
          year: number
        }
        Insert: {
          allowed_vs_peer_median?: number | null
          allowed_vs_peer_median_log?: number | null
          beneficiary_count?: number | null
          created_at?: string | null
          id?: string
          npi: string
          peer_group_size?: number | null
          peer_median_allowed?: number | null
          peer_p75_allowed?: number | null
          percentile_rank?: number | null
          provider_name?: string | null
          service_count?: number | null
          specialty?: string | null
          state?: string | null
          total_allowed_amount?: number | null
          year: number
        }
        Update: {
          allowed_vs_peer_median?: number | null
          allowed_vs_peer_median_log?: number | null
          beneficiary_count?: number | null
          created_at?: string | null
          id?: string
          npi?: string
          peer_group_size?: number | null
          peer_median_allowed?: number | null
          peer_p75_allowed?: number | null
          percentile_rank?: number | null
          provider_name?: string | null
          service_count?: number | null
          specialty?: string | null
          state?: string | null
          total_allowed_amount?: number | null
          year?: number
        }
        Relationships: []
      }
      anomaly_flag_years: {
        Row: {
          anomaly_flag_id: string
          created_at: string | null
          id: string
          p995_threshold: number
          peer_size: number
          percentile_rank: number
          value: number
          year: number
        }
        Insert: {
          anomaly_flag_id: string
          created_at?: string | null
          id?: string
          p995_threshold: number
          peer_size: number
          percentile_rank: number
          value: number
          year: number
        }
        Update: {
          anomaly_flag_id?: string
          created_at?: string | null
          id?: string
          p995_threshold?: number
          peer_size?: number
          percentile_rank?: number
          value?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_flag_years_anomaly_flag_id_fkey"
            columns: ["anomaly_flag_id"]
            isOneToOne: false
            referencedRelation: "anomaly_flags_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_flags: {
        Row: {
          computed_at: string | null
          id: string
          peer_group_size: number
          percentile_2023: number
          percentile_2024: number
          provider_id: string
          rule_version: string
          specialty: string
          state: string
          threshold_2023: number
          threshold_2024: number
        }
        Insert: {
          computed_at?: string | null
          id?: string
          peer_group_size: number
          percentile_2023: number
          percentile_2024: number
          provider_id: string
          rule_version?: string
          specialty: string
          state: string
          threshold_2023: number
          threshold_2024: number
        }
        Update: {
          computed_at?: string | null
          id?: string
          peer_group_size?: number
          percentile_2023?: number
          percentile_2024?: number
          provider_id?: string
          rule_version?: string
          specialty?: string
          state?: string
          threshold_2023?: number
          threshold_2024?: number
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_flags_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_flags_v2: {
        Row: {
          compute_run_id: string | null
          computed_at: string | null
          consecutive_years_required: number
          dataset_release_id: string
          flag_reason: string | null
          flagged: boolean
          id: string
          metric_name: string
          min_peer_size_required: number
          normalized_specialty: string
          normalized_state: string
          peer_group_key: string
          peer_group_version: string
          provider_id: string
          rule_set_version: string
          threshold_percentile_required: number
        }
        Insert: {
          compute_run_id?: string | null
          computed_at?: string | null
          consecutive_years_required?: number
          dataset_release_id: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          metric_name: string
          min_peer_size_required?: number
          normalized_specialty: string
          normalized_state: string
          peer_group_key: string
          peer_group_version: string
          provider_id: string
          rule_set_version: string
          threshold_percentile_required?: number
        }
        Update: {
          compute_run_id?: string | null
          computed_at?: string | null
          consecutive_years_required?: number
          dataset_release_id?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          metric_name?: string
          min_peer_size_required?: number
          normalized_specialty?: string
          normalized_state?: string
          peer_group_key?: string
          peer_group_version?: string
          provider_id?: string
          rule_set_version?: string
          threshold_percentile_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_flags_v2_compute_run_id_fkey"
            columns: ["compute_run_id"]
            isOneToOne: false
            referencedRelation: "compute_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomaly_flags_v2_dataset_release_id_fkey"
            columns: ["dataset_release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomaly_flags_v2_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      compute_runs: {
        Row: {
          created_at: string | null
          created_by: string | null
          dataset_release_id: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          parameters_json: Json
          rule_set_version: string
          run_type: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dataset_release_id?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          parameters_json?: Json
          rule_set_version: string
          run_type: string
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dataset_release_id?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          parameters_json?: Json
          rule_set_version?: string
          run_type?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "compute_runs_dataset_release_id_fkey"
            columns: ["dataset_release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_releases: {
        Row: {
          created_at: string | null
          dataset_key: string
          file_hash: string | null
          id: string
          ingested_at: string | null
          notes: string | null
          release_label: string
          source_published_at: string | null
          source_url: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          dataset_key: string
          file_hash?: string | null
          id?: string
          ingested_at?: string | null
          notes?: string | null
          release_label: string
          source_published_at?: string | null
          source_url?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          dataset_key?: string
          file_hash?: string | null
          id?: string
          ingested_at?: string | null
          notes?: string | null
          release_label?: string
          source_published_at?: string | null
          source_url?: string | null
          status?: string
        }
        Relationships: []
      }
      firms: {
        Row: {
          created_at: string | null
          expired: boolean | null
          expired_at: string | null
          expired_reason: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expired?: boolean | null
          expired_at?: string | null
          expired_reason?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expired?: boolean | null
          expired_at?: string | null
          expired_reason?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          firm_id: string | null
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          firm_id?: string | null
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          firm_id?: string | null
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_group_definitions: {
        Row: {
          created_at: string | null
          definition_json: Json
          id: string
          key: string
          version: string
        }
        Insert: {
          created_at?: string | null
          definition_json: Json
          id?: string
          key: string
          version: string
        }
        Update: {
          created_at?: string | null
          definition_json?: Json
          id?: string
          key?: string
          version?: string
        }
        Relationships: []
      }
      peer_group_stats: {
        Row: {
          created_at: string | null
          dataset_release_id: string
          id: string
          mean: number | null
          metric_name: string
          normalized_specialty: string
          normalized_state: string
          p50: number | null
          p95: number | null
          p99: number | null
          p995: number | null
          peer_group_key: string
          peer_group_version: string
          peer_size: number
          year: number
        }
        Insert: {
          created_at?: string | null
          dataset_release_id: string
          id?: string
          mean?: number | null
          metric_name: string
          normalized_specialty: string
          normalized_state: string
          p50?: number | null
          p95?: number | null
          p99?: number | null
          p995?: number | null
          peer_group_key: string
          peer_group_version: string
          peer_size: number
          year: number
        }
        Update: {
          created_at?: string | null
          dataset_release_id?: string
          id?: string
          mean?: number | null
          metric_name?: string
          normalized_specialty?: string
          normalized_state?: string
          p50?: number | null
          p95?: number | null
          p99?: number | null
          p995?: number | null
          peer_group_key?: string
          peer_group_version?: string
          peer_size?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "peer_group_stats_dataset_release_id_fkey"
            columns: ["dataset_release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          expired: boolean | null
          expired_reason: string | null
          firm_id: string | null
          full_name: string | null
          id: string
          must_change_password: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expired?: boolean | null
          expired_reason?: string | null
          firm_id?: string | null
          full_name?: string | null
          id: string
          must_change_password?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expired?: boolean | null
          expired_reason?: string | null
          firm_id?: string | null
          full_name?: string | null
          id?: string
          must_change_password?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_attributes: {
        Row: {
          created_at: string | null
          dataset_release_id: string
          id: string
          is_primary_record: boolean | null
          normalized_specialty: string
          normalized_state: string
          provider_display_name: string | null
          provider_id: string
          raw_specialty: string | null
          raw_state: string | null
          taxonomy_code: string | null
          unmapped_specialty: boolean | null
          year: number
        }
        Insert: {
          created_at?: string | null
          dataset_release_id: string
          id?: string
          is_primary_record?: boolean | null
          normalized_specialty: string
          normalized_state: string
          provider_display_name?: string | null
          provider_id: string
          raw_specialty?: string | null
          raw_state?: string | null
          taxonomy_code?: string | null
          unmapped_specialty?: boolean | null
          year: number
        }
        Update: {
          created_at?: string | null
          dataset_release_id?: string
          id?: string
          is_primary_record?: boolean | null
          normalized_specialty?: string
          normalized_state?: string
          provider_display_name?: string | null
          provider_id?: string
          raw_specialty?: string | null
          raw_state?: string | null
          taxonomy_code?: string | null
          unmapped_specialty?: boolean | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_attributes_dataset_release_id_fkey"
            columns: ["dataset_release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_attributes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_yearly_metrics: {
        Row: {
          beneficiary_count: number | null
          created_at: string | null
          dataset_release_id: string | null
          id: string
          provider_id: string
          service_count: number | null
          total_allowed_amount: number
          total_payment_amount: number
          year: number
        }
        Insert: {
          beneficiary_count?: number | null
          created_at?: string | null
          dataset_release_id?: string | null
          id?: string
          provider_id: string
          service_count?: number | null
          total_allowed_amount: number
          total_payment_amount: number
          year: number
        }
        Update: {
          beneficiary_count?: number | null
          created_at?: string | null
          dataset_release_id?: string | null
          id?: string
          provider_id?: string
          service_count?: number | null
          total_allowed_amount?: number
          total_payment_amount?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_yearly_metrics_dataset_release_id_fkey"
            columns: ["dataset_release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_yearly_metrics_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          created_at: string | null
          entity_type: string | null
          id: string
          npi: string
          provider_name: string
          specialty: string
          state: string
        }
        Insert: {
          created_at?: string | null
          entity_type?: string | null
          id?: string
          npi: string
          provider_name: string
          specialty: string
          state: string
        }
        Update: {
          created_at?: string | null
          entity_type?: string | null
          id?: string
          npi?: string
          provider_name?: string
          specialty?: string
          state?: string
        }
        Relationships: []
      }
      specialty_map: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          normalized_specialty: string
          notes: string | null
          raw_value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          normalized_specialty: string
          notes?: string | null
          raw_value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          normalized_specialty?: string
          notes?: string | null
          raw_value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_anomaly_flags: {
        Args: never
        Returns: {
          peer_groups_analyzed: number
          providers_analyzed: number
          providers_flagged: number
        }[]
      }
      compute_anomaly_flags_v2: {
        Args: {
          p_consecutive_years_required?: number
          p_created_by?: string
          p_dataset_release_id: string
          p_metric_name?: string
          p_min_peer_size_required?: number
          p_peer_group_key?: string
          p_peer_group_version?: string
          p_rule_set_version?: string
          p_threshold_percentile?: number
          p_years_window?: number[]
        }
        Returns: {
          compute_run_id: string
          peer_groups_analyzed: number
          providers_analyzed: number
          providers_flagged: number
          providers_suppressed_low_sample: number
        }[]
      }
      compute_peer_group_stats: {
        Args: {
          p_dataset_release_id: string
          p_metric_name?: string
          p_peer_group_key?: string
          p_peer_group_version?: string
          p_years: number[]
        }
        Returns: {
          groups_computed: number
          years_processed: number
        }[]
      }
      get_active_dataset_release: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_specialty_unmapped: {
        Args: { raw_specialty: string }
        Returns: boolean
      }
      normalize_specialty: { Args: { raw_specialty: string }; Returns: string }
      normalize_state: { Args: { raw_state: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "firm_user"
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
      app_role: ["admin", "firm_user"],
    },
  },
} as const
