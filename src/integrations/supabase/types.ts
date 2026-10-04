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
      administration_rate_dealers: {
        Row: {
          administration_rate_id: string
          dealer_id: string
        }
        Insert: {
          administration_rate_id: string
          dealer_id: string
        }
        Update: {
          administration_rate_id?: string
          dealer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "administration_rate_dealers_administration_rate_id_fkey"
            columns: ["administration_rate_id"]
            isOneToOne: false
            referencedRelation: "administration_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "administration_rate_dealers_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      administration_rates: {
        Row: {
          active: boolean
          created_at: string
          group_id: string
          id: string
          rate: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_id: string
          id?: string
          rate: number
        }
        Update: {
          active?: boolean
          created_at?: string
          group_id?: string
          id?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "administration_rates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ranges: {
        Row: {
          active: boolean
          created_at: string
          credit_value: number
          group_id: string
          id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          credit_value: number
          group_id: string
          id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          credit_value?: number
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ranges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      dealers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      group_dealers: {
        Row: {
          dealer_id: string
          group_id: string
        }
        Insert: {
          dealer_id: string
          group_id: string
        }
        Update: {
          dealer_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_dealers_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_dealers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          initial_term: number
          name: string
          remaining_term: number
          reserve_fund: number
          term_reference_date: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          initial_term: number
          name: string
          remaining_term: number
          reserve_fund?: number
          term_reference_date?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          initial_term?: number
          name?: string
          remaining_term?: number
          reserve_fund?: number
          term_reference_date?: string
        }
        Relationships: []
      }
      installment_types: {
        Row: {
          active: boolean
          created_at: string
          group_id: string
          id: string
          multiplier: number
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_id: string
          id?: string
          multiplier: number
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          group_id?: string
          id?: string
          multiplier?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_types_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_rules: {
        Row: {
          active: boolean
          created_at: string
          group_id: string
          id: string
          name: string
          rate: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_id: string
          id?: string
          name?: string
          rate: number
        }
        Update: {
          active?: boolean
          created_at?: string
          group_id?: string
          id?: string
          name?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "insurance_rules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          dealer_id: string | null
          email: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          dealer_id?: string | null
          email: string
          id: string
          name?: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          dealer_id?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          administration_rate: number
          administration_rate_id: string | null
          base_amount: number
          created_at: string
          credit_range_id: string | null
          credit_value: number
          final_amount: number
          group_code: string
          group_id: string | null
          id: string
          initial_term: number
          installment_amount: number
          installment_multiplier: number
          installment_type_id: string | null
          installment_type_name: string
          insurance_amount: number
          insurance_included: boolean
          insurance_rate: number
          proposal_id: string
          quantity: number
          remaining_term: number
          reserve_fund: number
          simulation_id: string | null
          sort_order: number
        }
        Insert: {
          administration_rate: number
          administration_rate_id?: string | null
          base_amount: number
          created_at?: string
          credit_range_id?: string | null
          credit_value: number
          final_amount: number
          group_code: string
          group_id?: string | null
          id?: string
          initial_term: number
          installment_amount: number
          installment_multiplier: number
          installment_type_id?: string | null
          installment_type_name: string
          insurance_amount?: number
          insurance_included?: boolean
          insurance_rate?: number
          proposal_id: string
          quantity?: number
          remaining_term: number
          reserve_fund: number
          simulation_id?: string | null
          sort_order?: number
        }
        Update: {
          administration_rate?: number
          administration_rate_id?: string | null
          base_amount?: number
          created_at?: string
          credit_range_id?: string | null
          credit_value?: number
          final_amount?: number
          group_code?: string
          group_id?: string | null
          id?: string
          initial_term?: number
          installment_amount?: number
          installment_multiplier?: number
          installment_type_id?: string | null
          installment_type_name?: string
          insurance_amount?: number
          insurance_included?: boolean
          insurance_rate?: number
          proposal_id?: string
          quantity?: number
          remaining_term?: number
          reserve_fund?: number
          simulation_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_administration_rate_id_fkey"
            columns: ["administration_rate_id"]
            isOneToOne: false
            referencedRelation: "administration_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_credit_range_id_fkey"
            columns: ["credit_range_id"]
            isOneToOne: false
            referencedRelation: "credit_ranges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_installment_type_id_fkey"
            columns: ["installment_type_id"]
            isOneToOne: false
            referencedRelation: "installment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          client_name: string | null
          created_at: string
          id: string
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          id?: string
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          id?: string
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      simulations: {
        Row: {
          administration_rate: number
          administration_rate_id: string | null
          base_amount: number
          client_name: string | null
          created_at: string
          credit_range_id: string | null
          credit_value: number
          final_amount: number
          group_code: string
          group_id: string | null
          id: string
          initial_term: number
          installment_amount: number
          installment_multiplier: number
          installment_type_id: string | null
          installment_type_name: string
          insurance_amount: number
          insurance_included: boolean
          insurance_rate: number
          remaining_term: number
          reserve_fund: number
          seller_id: string
        }
        Insert: {
          administration_rate: number
          administration_rate_id?: string | null
          base_amount: number
          client_name?: string | null
          created_at?: string
          credit_range_id?: string | null
          credit_value: number
          final_amount: number
          group_code: string
          group_id?: string | null
          id?: string
          initial_term: number
          installment_amount: number
          installment_multiplier: number
          installment_type_id?: string | null
          installment_type_name: string
          insurance_amount?: number
          insurance_included?: boolean
          insurance_rate?: number
          remaining_term: number
          reserve_fund: number
          seller_id: string
        }
        Update: {
          administration_rate?: number
          administration_rate_id?: string | null
          base_amount?: number
          client_name?: string | null
          created_at?: string
          credit_range_id?: string | null
          credit_value?: number
          final_amount?: number
          group_code?: string
          group_id?: string | null
          id?: string
          initial_term?: number
          installment_amount?: number
          installment_multiplier?: number
          installment_type_id?: string | null
          installment_type_name?: string
          insurance_amount?: number
          insurance_included?: boolean
          insurance_rate?: number
          remaining_term?: number
          reserve_fund?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulations_administration_rate_id_fkey"
            columns: ["administration_rate_id"]
            isOneToOne: false
            referencedRelation: "administration_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulations_credit_range_id_fkey"
            columns: ["credit_range_id"]
            isOneToOne: false
            referencedRelation: "credit_ranges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulations_installment_type_id_fkey"
            columns: ["installment_type_id"]
            isOneToOne: false
            referencedRelation: "installment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      delete_legacy_simulation: {
        Args: { _simulation_id: string }
        Returns: undefined
      }
      delete_saved_proposal: {
        Args: { _proposal_id: string }
        Returns: undefined
      }
      ensure_profile: { Args: { _name?: string }; Returns: undefined }
      get_admin_overview: { Args: { _top_sellers?: number }; Returns: Json }
      get_history_page: {
        Args: {
          _credit?: string
          _date?: string
          _group?: string
          _page?: number
          _page_size?: number
          _seller?: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      replace_proposal_items: {
        Args: { _client_name: string; _items: Json; _proposal_id: string }
        Returns: undefined
      }
      update_legacy_simulation: {
        Args: { _client_name: string; _item: Json; _simulation_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "seller"
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
    Enums: {
      app_role: ["admin", "seller"],
    },
  },
} as const
