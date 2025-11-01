export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      deck_share_links: {
        Row: {
          created_at: string;
          deck_id: string;
          expires_at: string | null;
          revoked_at: string | null;
          token: string;
        };
        Insert: {
          created_at?: string;
          deck_id: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          token?: string;
        };
        Update: {
          created_at?: string;
          deck_id?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deck_share_links_deck_id_fkey";
            columns: ["deck_id"];
            isOneToOne: false;
            referencedRelation: "decks";
            referencedColumns: ["id"];
          },
        ];
      };
      languages: {
        Row: {
          id: string;
          code: string;
          name: string;
          name_native: string | null;
          is_active: boolean;
          sort_order: number;
          flag_emoji: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          name_native?: string | null;
          is_active?: boolean;
          sort_order?: number;
          flag_emoji?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          name_native?: string | null;
          is_active?: boolean;
          sort_order?: number;
          flag_emoji?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      decks: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          lang_a: string;
          lang_b: string;
          owner_user_id: string;
          title: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["deck_visibility"];
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          lang_a: string;
          lang_b: string;
          owner_user_id: string;
          title: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["deck_visibility"];
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          lang_a?: string;
          lang_b?: string;
          owner_user_id?: string;
          title?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["deck_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "decks_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pair_tags: {
        Row: {
          pair_id: string;
          tag_id: string;
        };
        Insert: {
          pair_id: string;
          tag_id: string;
        };
        Update: {
          pair_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pair_tags_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pair_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      pairs: {
        Row: {
          added_at: string;
          deck_id: string;
          deleted_at: string | null;
          id: string;
          search_tsv: unknown;
          term_a: string;
          term_a_norm: string | null;
          term_b: string;
          term_b_norm: string | null;
          updated_at: string;
        };
        Insert: {
          added_at?: string;
          deck_id: string;
          deleted_at?: string | null;
          id?: string;
          search_tsv?: unknown;
          term_a: string;
          term_a_norm?: string | null;
          term_b: string;
          term_b_norm?: string | null;
          updated_at?: string;
        };
        Update: {
          added_at?: string;
          deck_id?: string;
          deleted_at?: string | null;
          id?: string;
          search_tsv?: unknown;
          term_a?: string;
          term_a_norm?: string | null;
          term_b?: string;
          term_b_norm?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pairs_deck_id_fkey";
            columns: ["deck_id"];
            isOneToOne: false;
            referencedRelation: "decks";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          settings: Json;
          timezone: string | null;
          updated_at: string;
          username: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          settings?: Json;
          timezone?: string | null;
          updated_at?: string;
          username: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          settings?: Json;
          timezone?: string | null;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          description: string | null;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      user_pair_state: {
        Row: {
          deck_id: string;
          due_at: string | null;
          interval_days: number;
          last_grade: number | null;
          last_reviewed_at: string | null;
          pair_id: string;
          reps: number;
          streak_correct: number;
          total_correct: number;
          user_id: string;
        };
        Insert: {
          deck_id: string;
          due_at?: string | null;
          interval_days?: number;
          last_grade?: number | null;
          last_reviewed_at?: string | null;
          pair_id: string;
          reps?: number;
          streak_correct?: number;
          total_correct?: number;
          user_id: string;
        };
        Update: {
          deck_id?: string;
          due_at?: string | null;
          interval_days?: number;
          last_grade?: number | null;
          last_reviewed_at?: string | null;
          pair_id?: string;
          reps?: number;
          streak_correct?: number;
          total_correct?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_user_pair_state_pair_deck";
            columns: ["pair_id", "deck_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id", "deck_id"];
          },
          {
            foreignKeyName: "user_pair_state_pair_id_fkey";
            columns: ["pair_id"];
            isOneToOne: false;
            referencedRelation: "pairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_pair_state_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      immutable_unaccent: { Args: { "": string }; Returns: string };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      unaccent: { Args: { "": string }; Returns: string };
    };
    Enums: {
      deck_visibility: "private" | "unlisted" | "public";
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      deck_visibility: ["private", "unlisted", "public"],
    },
  },
} as const;

