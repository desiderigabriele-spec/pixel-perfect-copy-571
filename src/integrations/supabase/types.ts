export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      paper_accounts: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          balance?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      paper_trades: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          direction: "buy" | "sell";
          quantity: number;
          leverage: number;
          entry_price: number;
          exit_price: number | null;
          sl_price: number | null;
          tp_price: number | null;
          pnl: number | null;
          pips: number | null;
          status: "open" | "closed";
          opened_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          direction: "buy" | "sell";
          quantity: number;
          leverage?: number;
          entry_price: number;
          exit_price?: number | null;
          sl_price?: number | null;
          tp_price?: number | null;
          pnl?: number | null;
          pips?: number | null;
          status?: "open" | "closed";
          opened_at?: string;
          closed_at?: string | null;
        };
        Update: {
          exit_price?: number | null;
          sl_price?: number | null;
          tp_price?: number | null;
          pnl?: number | null;
          pips?: number | null;
          status?: "open" | "closed";
          closed_at?: string | null;
        };
        Relationships: [];
      };
      paper_pending_orders: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          direction: "buy" | "sell";
          size_usd: number;
          leverage: number;
          entry_price: number;
          sl_price: number | null;
          tp_price: number | null;
          price_above: boolean;
          status: "pending" | "filled" | "cancelled";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          direction: "buy" | "sell";
          size_usd: number;
          leverage?: number;
          entry_price: number;
          sl_price?: number | null;
          tp_price?: number | null;
          price_above: boolean;
          status?: "pending" | "filled" | "cancelled";
          created_at?: string;
        };
        Update: {
          status?: "pending" | "filled" | "cancelled";
        };
        Relationships: [];
      };
      avatrade_verifications: {
        Row: {
          avatrade_account_id: string;
          id: string;
          notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["verification_status"];
          submitted_at: string;
          user_id: string;
        };
        Insert: {
          avatrade_account_id: string;
          id?: string;
          notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          submitted_at?: string;
          user_id: string;
        };
        Update: {
          avatrade_account_id?: string;
          id?: string;
          notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          submitted_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      challenge_messages: {
        Row: {
          body: string;
          challenge_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          challenge_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          challenge_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_messages_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
        ];
      };
      challenges: {
        Row: {
          created_at: string;
          creator_id: string;
          creator_pips: number | null;
          creator_side: Database["public"]["Enums"]["trade_side"];
          duration_minutes: number;
          ends_at: string | null;
          entry_price: number | null;
          exit_price: number | null;
          goal_pips: number | null;
          goal_reached: boolean | null;
          id: string;
          invite_code: string | null;
          mode: Database["public"]["Enums"]["challenge_mode"];
          opponent_id: string | null;
          opponent_pips: number | null;
          opponent_side: Database["public"]["Enums"]["trade_side"] | null;
          settled_at: string | null;
          stake_amount: number;
          stake_type: Database["public"]["Enums"]["stake_type"];
          starts_at: string | null;
          status: Database["public"]["Enums"]["challenge_status"];
          symbol: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["challenge_visibility"];
          winner_id: string | null;
        };
        Insert: {
          created_at?: string;
          creator_id: string;
          creator_pips?: number | null;
          creator_side?: Database["public"]["Enums"]["trade_side"];
          duration_minutes: number;
          ends_at?: string | null;
          entry_price?: number | null;
          exit_price?: number | null;
          goal_pips?: number | null;
          goal_reached?: boolean | null;
          id?: string;
          invite_code?: string | null;
          mode?: Database["public"]["Enums"]["challenge_mode"];
          opponent_id?: string | null;
          opponent_pips?: number | null;
          opponent_side?: Database["public"]["Enums"]["trade_side"] | null;
          settled_at?: string | null;
          stake_amount?: number;
          stake_type?: Database["public"]["Enums"]["stake_type"];
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["challenge_status"];
          symbol: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["challenge_visibility"];
          winner_id?: string | null;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          creator_pips?: number | null;
          creator_side?: Database["public"]["Enums"]["trade_side"];
          duration_minutes?: number;
          ends_at?: string | null;
          entry_price?: number | null;
          exit_price?: number | null;
          goal_pips?: number | null;
          goal_reached?: boolean | null;
          id?: string;
          invite_code?: string | null;
          mode?: Database["public"]["Enums"]["challenge_mode"];
          opponent_id?: string | null;
          opponent_pips?: number | null;
          opponent_side?: Database["public"]["Enums"]["trade_side"] | null;
          settled_at?: string | null;
          stake_amount?: number;
          stake_type?: Database["public"]["Enums"]["stake_type"];
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["challenge_status"];
          symbol?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["challenge_visibility"];
          winner_id?: string | null;
        };
        Relationships: [];
      };
      live_chat_messages: {
        Row: {
          body: string;
          challenge_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          challenge_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          challenge_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
        ];
      };
      live_reactions: {
        Row: {
          challenge_id: string;
          created_at: string;
          emoji: string;
          id: string;
          user_id: string;
        };
        Insert: {
          challenge_id: string;
          created_at?: string;
          emoji: string;
          id?: string;
          user_id: string;
        };
        Update: {
          challenge_id?: string;
          created_at?: string;
          emoji?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "live_reactions_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_seed: string;
          country: string | null;
          created_at: string;
          id: string;
          language: string | null;
          points_balance: number;
          primary_asset: string | null;
          style: Database["public"]["Enums"]["trading_style"] | null;
          username: string;
        };
        Insert: {
          avatar_seed?: string;
          country?: string | null;
          created_at?: string;
          id: string;
          language?: string | null;
          points_balance?: number;
          primary_asset?: string | null;
          style?: Database["public"]["Enums"]["trading_style"] | null;
          username: string;
        };
        Update: {
          avatar_seed?: string;
          country?: string | null;
          created_at?: string;
          id?: string;
          language?: string | null;
          points_balance?: number;
          primary_asset?: string | null;
          style?: Database["public"]["Enums"]["trading_style"] | null;
          username?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_affiliated: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "user";
      challenge_mode: "1v1" | "solo_goal";
      challenge_status: "waiting" | "live" | "settled" | "cancelled";
      challenge_visibility: "public" | "private";
      stake_type: "points" | "honor";
      trade_side: "long" | "short";
      trading_style: "scalper" | "intraday" | "swing";
      verification_status: "pending" | "verified" | "rejected";
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
    Enums: {
      app_role: ["admin", "user"],
      challenge_mode: ["1v1", "solo_goal"],
      challenge_status: ["waiting", "live", "settled", "cancelled"],
      challenge_visibility: ["public", "private"],
      stake_type: ["points", "honor"],
      trade_side: ["long", "short"],
      trading_style: ["scalper", "intraday", "swing"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const;
