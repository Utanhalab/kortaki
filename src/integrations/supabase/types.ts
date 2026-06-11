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
      bookings: {
        Row: {
          appointment_at: string
          barber_name: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          created_at: string
          id: string
          price: number
          reminded_types: string[]
          service_name: string
          shop_id: number
          shop_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_at: string
          barber_name?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string
          id?: string
          price?: number
          reminded_types?: string[]
          service_name: string
          shop_id: number
          shop_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_at?: string
          barber_name?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string
          id?: string
          price?: number
          reminded_types?: string[]
          service_name?: string
          shop_id?: number
          shop_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          booking_cancelled: boolean
          booking_confirmed: boolean
          promotions: boolean
          queue_alerts: boolean
          reminder_15: boolean
          reminder_24h: boolean
          reminder_60: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_cancelled?: boolean
          booking_confirmed?: boolean
          promotions?: boolean
          queue_alerts?: boolean
          reminder_15?: boolean
          reminder_24h?: boolean
          reminder_60?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_cancelled?: boolean
          booking_confirmed?: boolean
          promotions?: boolean
          queue_alerts?: boolean
          reminder_15?: boolean
          reminder_24h?: boolean
          reminder_60?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          data: Json
          id: string
          read: boolean
          sent_at: string
          shop_id: number | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          data?: Json
          id?: string
          read?: boolean
          sent_at?: string
          shop_id?: number | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          data?: Json
          id?: string
          read?: boolean
          sent_at?: string
          shop_id?: number | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_sends: {
        Row: {
          audience_type: string
          id: string
          message: string
          recipient_count: number
          scheduled_for: string | null
          sent_at: string
          sent_by: string
          shop_id: number
        }
        Insert: {
          audience_type: string
          id?: string
          message: string
          recipient_count?: number
          scheduled_for?: string | null
          sent_at?: string
          sent_by: string
          shop_id: number
        }
        Update: {
          audience_type?: string
          id?: string
          message?: string
          recipient_count?: number
          scheduled_for?: string | null
          sent_at?: string
          sent_by?: string
          shop_id?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      queue_activity: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          shop_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          shop_id: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          shop_id?: number
        }
        Relationships: []
      }
      queue_entries: {
        Row: {
          barber_name: string | null
          called_at: string | null
          client_id: string
          customer_name: string
          done_at: string | null
          id: string
          joined_at: string
          notify_at_position: number
          position: number
          removed_reason: string | null
          service_duration_minutes: number
          service_name: string
          service_price: number
          shop_id: number
          status: string
          user_id: string | null
        }
        Insert: {
          barber_name?: string | null
          called_at?: string | null
          client_id: string
          customer_name: string
          done_at?: string | null
          id?: string
          joined_at?: string
          notify_at_position?: number
          position: number
          removed_reason?: string | null
          service_duration_minutes?: number
          service_name: string
          service_price?: number
          shop_id: number
          status?: string
          user_id?: string | null
        }
        Update: {
          barber_name?: string | null
          called_at?: string | null
          client_id?: string
          customer_name?: string
          done_at?: string | null
          id?: string
          joined_at?: string
          notify_at_position?: number
          position?: number
          removed_reason?: string | null
          service_duration_minutes?: number
          service_name?: string
          service_price?: number
          shop_id?: number
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      queue_settings: {
        Row: {
          avg_cut_minutes: number
          is_open: boolean
          max_size: number
          shop_id: number
          updated_at: string
        }
        Insert: {
          avg_cut_minutes?: number
          is_open?: boolean
          max_size?: number
          shop_id: number
          updated_at?: string
        }
        Update: {
          avg_cut_minutes?: number
          is_open?: boolean
          max_size?: number
          shop_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_owners: {
        Row: {
          created_at: string
          id: string
          shop_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shop_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shop_id?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_shop_owner: {
        Args: { _shop_id: number; _user_id: string }
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
    Enums: {},
  },
} as const
