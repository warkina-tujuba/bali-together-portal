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
      accommodations: {
        Row: {
          address: string | null
          booking_source: string | null
          booking_url: string | null
          check_in: string | null
          check_out: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          place_id: string | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          booking_source?: string | null
          booking_url?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          place_id?: string | null
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          booking_source?: string | null
          booking_url?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          place_id?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          cover_image_url: string | null
          created_at: string
          day_date: string
          description: string | null
          id: string
          location: string | null
          sort_index: number
          start_time: string | null
          tags: string[] | null
          title: string
          trip_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          day_date: string
          description?: string | null
          id?: string
          location?: string | null
          sort_index?: number
          start_time?: string | null
          tags?: string[] | null
          title: string
          trip_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          day_date?: string
          description?: string | null
          id?: string
          location?: string | null
          sort_index?: number
          start_time?: string | null
          tags?: string[] | null
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      flights: {
        Row: {
          airline: string | null
          airline_iata: string | null
          created_at: string
          destination_city: string | null
          destination_iata: string | null
          direction: string
          flight_number: string
          id: string
          origin_city: string | null
          origin_iata: string | null
          raw_api: Json | null
          scheduled_at: string | null
          status: string | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          airline?: string | null
          airline_iata?: string | null
          created_at?: string
          destination_city?: string | null
          destination_iata?: string | null
          direction?: string
          flight_number: string
          id?: string
          origin_city?: string | null
          origin_iata?: string | null
          raw_api?: Json | null
          scheduled_at?: string | null
          status?: string | null
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          airline?: string | null
          airline_iata?: string | null
          created_at?: string
          destination_city?: string | null
          destination_iata?: string | null
          direction?: string
          flight_number?: string
          id?: string
          origin_city?: string | null
          origin_iata?: string | null
          raw_api?: Json | null
          scheduled_at?: string | null
          status?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flights_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          token: string
          trip_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          token: string
          trip_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          token?: string
          trip_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_days: {
        Row: {
          cover_image_url: string | null
          created_at: string
          day_date: string
          id: string
          sort_index: number
          summary: string | null
          title: string
          trip_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          day_date: string
          id?: string
          sort_index?: number
          summary?: string | null
          title: string
          trip_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          day_date?: string
          id?: string
          sort_index?: number
          summary?: string | null
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      live_locations: {
        Row: {
          accuracy: number | null
          heading: number | null
          lat: number
          lng: number
          sharing: boolean
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          heading?: number | null
          lat: number
          lng: number
          sharing?: boolean
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          heading?: number | null
          lat?: number
          lng?: number
          sharing?: boolean
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          trip_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          dietary: string | null
          email: string | null
          full_name: string | null
          id: string
          notes: string | null
          onboarding_complete: boolean
          onboarding_step: number
          phone: string | null
          room_preference: string | null
          trip_id: string | null
          updated_at: string
          whatsapp_joined_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dietary?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          notes?: string | null
          onboarding_complete?: boolean
          onboarding_step?: number
          phone?: string | null
          room_preference?: string | null
          trip_id?: string | null
          updated_at?: string
          whatsapp_joined_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dietary?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          onboarding_complete?: boolean
          onboarding_step?: number
          phone?: string | null
          room_preference?: string | null
          trip_id?: string | null
          updated_at?: string
          whatsapp_joined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          destination: string
          end_date: string
          id: string
          is_active: boolean
          map_center_lat: number | null
          map_center_lng: number | null
          map_default_zoom: number | null
          name: string
          occasion: string | null
          start_date: string
          updated_at: string
          whatsapp_invite_url: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          destination: string
          end_date: string
          id?: string
          is_active?: boolean
          map_center_lat?: number | null
          map_center_lng?: number | null
          map_default_zoom?: number | null
          name: string
          occasion?: string | null
          start_date: string
          updated_at?: string
          whatsapp_invite_url?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          destination?: string
          end_date?: string
          id?: string
          is_active?: boolean
          map_center_lat?: number | null
          map_center_lng?: number | null
          map_default_zoom?: number | null
          name?: string
          occasion?: string | null
          start_date?: string
          updated_at?: string
          whatsapp_invite_url?: string | null
        }
        Relationships: []
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
      current_user_trip_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "guest"
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
      app_role: ["admin", "guest"],
    },
  },
} as const
