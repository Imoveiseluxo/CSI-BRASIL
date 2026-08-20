export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      companies: {
        Row: {
          busca: unknown;
          capital_social: number | null;
          cnae_principal: string | null;
          cnpj: string;
          confidence: number | null;
          data_abertura: string | null;
          evidence_id: string;
          id: string;
          municipio: string | null;
          nome_fantasia: string | null;
          organization_id: string;
          produced_at: string;
          produced_by: string | null;
          produced_by_kind: string;
          razao_social: string;
          situacao: string | null;
          source_id: string;
          transform_id: string | null;
          uf: string | null;
          updated_at: string;
        };
        Insert: {
          busca?: unknown;
          capital_social?: number | null;
          cnae_principal?: string | null;
          cnpj: string;
          confidence?: number | null;
          data_abertura?: string | null;
          evidence_id: string;
          id?: string;
          municipio?: string | null;
          nome_fantasia?: string | null;
          organization_id: string;
          produced_at?: string;
          produced_by?: string | null;
          produced_by_kind: string;
          razao_social: string;
          situacao?: string | null;
          source_id: string;
          transform_id?: string | null;
          uf?: string | null;
          updated_at?: string;
        };
        Update: {
          busca?: unknown;
          capital_social?: number | null;
          cnae_principal?: string | null;
          cnpj?: string;
          confidence?: number | null;
          data_abertura?: string | null;
          evidence_id?: string;
          id?: string;
          municipio?: string | null;
          nome_fantasia?: string | null;
          organization_id?: string;
          produced_at?: string;
          produced_by?: string | null;
          produced_by_kind?: string;
          razao_social?: string;
          situacao?: string | null;
          source_id?: string;
          transform_id?: string | null;
          uf?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "companies_evidence_mesma_org";
            columns: ["evidence_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "evidence";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "companies_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "companies_source_mesma_org";
            columns: ["source_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      evidence: {
        Row: {
          busca: unknown;
          collected_at: string;
          collected_by: string | null;
          collected_by_kind: string;
          content: Json;
          content_hash: string;
          id: string;
          organization_id: string;
          request_key: string | null;
          source_id: string;
        };
        Insert: {
          busca?: unknown;
          collected_at?: string;
          collected_by?: string | null;
          collected_by_kind: string;
          content: Json;
          content_hash: string;
          id?: string;
          organization_id: string;
          request_key?: string | null;
          source_id: string;
        };
        Update: {
          busca?: unknown;
          collected_at?: string;
          collected_by?: string | null;
          collected_by_kind?: string;
          content?: Json;
          content_hash?: string;
          id?: string;
          organization_id?: string;
          request_key?: string | null;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_source_mesma_org";
            columns: ["source_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      monitors: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          name: string;
          organization_id: string;
          project_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          organization_id: string;
          project_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          organization_id?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monitors_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitors_project_mesma_org";
            columns: ["project_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      query_versions: {
        Row: {
          created_at: string;
          created_by: string | null;
          expression: string;
          id: string;
          monitor_id: string;
          organization_id: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expression: string;
          id?: string;
          monitor_id: string;
          organization_id: string;
          version: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expression?: string;
          id?: string;
          monitor_id?: string;
          organization_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "query_versions_monitor_mesma_org";
            columns: ["monitor_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "monitors";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "query_versions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      sources: {
        Row: {
          created_at: string;
          created_by: string | null;
          endpoint: string | null;
          id: string;
          is_active: boolean;
          kind: string;
          name: string;
          organization_id: string;
          webhook_token_hash: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          endpoint?: string | null;
          id?: string;
          is_active?: boolean;
          kind: string;
          name: string;
          organization_id: string;
          webhook_token_hash?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          endpoint?: string | null;
          id?: string;
          is_active?: boolean;
          kind?: string;
          name?: string;
          organization_id?: string;
          webhook_token_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sources_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      buscar: {
        Args: { p_org: string; p_termo: string };
        Returns: {
          coletado_em: string;
          confianca: number;
          detalhe: string;
          fonte: string;
          id: string;
          relevancia: number;
          tipo: string;
          titulo: string;
          trecho: string;
        }[];
      };
      has_org_role: {
        Args: { p_org: string; p_roles: string[] };
        Returns: boolean;
      };
      is_org_member: { Args: { p_org: string }; Returns: boolean };
      sem_acento: { Args: { t: string }; Returns: string };
      unaccent: { Args: { "": string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
