export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      addons: {
        Row: {
          addon_created_at: string
          addon_description: string | null
          addon_id: string
          addon_is_active: boolean
          addon_name: string
          addon_price_ore: number
          addon_pricing_model: Database["public"]["Enums"]["addon_pricing_model"]
          addon_updated_at: string
        }
        Insert: {
          addon_created_at?: string
          addon_description?: string | null
          addon_id?: string
          addon_is_active?: boolean
          addon_name: string
          addon_price_ore: number
          addon_pricing_model: Database["public"]["Enums"]["addon_pricing_model"]
          addon_updated_at?: string
        }
        Update: {
          addon_created_at?: string
          addon_description?: string | null
          addon_id?: string
          addon_is_active?: boolean
          addon_name?: string
          addon_price_ore?: number
          addon_pricing_model?: Database["public"]["Enums"]["addon_pricing_model"]
          addon_updated_at?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          admin_auth_user_id: string
          admin_created_at: string
          admin_display_name: string
          admin_id: string
          admin_updated_at: string
          admin_username: string
        }
        Insert: {
          admin_auth_user_id: string
          admin_created_at?: string
          admin_display_name: string
          admin_id?: string
          admin_updated_at?: string
          admin_username: string
        }
        Update: {
          admin_auth_user_id?: string
          admin_created_at?: string
          admin_display_name?: string
          admin_id?: string
          admin_updated_at?: string
          admin_username?: string
        }
        Relationships: []
      }
      booking_addons: {
        Row: {
          booking_addon_addon_id: string
          booking_addon_booking_id: string
          booking_addon_price_ore: number
        }
        Insert: {
          booking_addon_addon_id: string
          booking_addon_booking_id: string
          booking_addon_price_ore: number
        }
        Update: {
          booking_addon_addon_id?: string
          booking_addon_booking_id?: string
          booking_addon_price_ore?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_addons_booking_addon_addon_id_fkey"
            columns: ["booking_addon_addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["addon_id"]
          },
          {
            foreignKeyName: "booking_addons_booking_addon_booking_id_fkey"
            columns: ["booking_addon_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_addon_total_ore: number
          booking_booker_email: string
          booking_booker_name: string
          booking_booker_phone: string
          booking_cancellation_fee_ore: number | null
          booking_cancellation_terms: string | null
          booking_cancelled_at: string | null
          booking_company_id: string
          booking_created_at: string
          booking_discount_percent: number
          booking_end_at: string
          booking_expected_total_ore: number
          booking_hold_expires_at: string | null
          booking_id: string
          booking_internal_note: string | null
          booking_invoice_date: string | null
          booking_invoice_number: string | null
          booking_invoiced_at: string | null
          booking_invoiced_by: string | null
          booking_invoicing_status: Database["public"]["Enums"]["booking_invoicing_status"]
          booking_number: string
          booking_participant_count: number
          booking_practical_notes: string | null
          booking_reference: string | null
          booking_room_id: string
          booking_room_price_ore: number
          booking_start_at: string
          booking_status: Database["public"]["Enums"]["booking_status"]
          booking_updated_at: string
        }
        Insert: {
          booking_addon_total_ore?: number
          booking_booker_email: string
          booking_booker_name: string
          booking_booker_phone: string
          booking_cancellation_fee_ore?: number | null
          booking_cancellation_terms?: string | null
          booking_cancelled_at?: string | null
          booking_company_id: string
          booking_created_at?: string
          booking_discount_percent?: number
          booking_end_at: string
          booking_expected_total_ore?: number
          booking_hold_expires_at?: string | null
          booking_id?: string
          booking_internal_note?: string | null
          booking_invoice_date?: string | null
          booking_invoice_number?: string | null
          booking_invoiced_at?: string | null
          booking_invoiced_by?: string | null
          booking_invoicing_status?: Database["public"]["Enums"]["booking_invoicing_status"]
          booking_number: string
          booking_participant_count: number
          booking_practical_notes?: string | null
          booking_reference?: string | null
          booking_room_id: string
          booking_room_price_ore: number
          booking_start_at: string
          booking_status?: Database["public"]["Enums"]["booking_status"]
          booking_updated_at?: string
        }
        Update: {
          booking_addon_total_ore?: number
          booking_booker_email?: string
          booking_booker_name?: string
          booking_booker_phone?: string
          booking_cancellation_fee_ore?: number | null
          booking_cancellation_terms?: string | null
          booking_cancelled_at?: string | null
          booking_company_id?: string
          booking_created_at?: string
          booking_discount_percent?: number
          booking_end_at?: string
          booking_expected_total_ore?: number
          booking_hold_expires_at?: string | null
          booking_id?: string
          booking_internal_note?: string | null
          booking_invoice_date?: string | null
          booking_invoice_number?: string | null
          booking_invoiced_at?: string | null
          booking_invoiced_by?: string | null
          booking_invoicing_status?: Database["public"]["Enums"]["booking_invoicing_status"]
          booking_number?: string
          booking_participant_count?: number
          booking_practical_notes?: string | null
          booking_reference?: string | null
          booking_room_id?: string
          booking_room_price_ore?: number
          booking_start_at?: string
          booking_status?: Database["public"]["Enums"]["booking_status"]
          booking_updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_booking_company_id_fkey"
            columns: ["booking_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bookings_booking_room_id_fkey"
            columns: ["booking_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["room_id"]
          },
        ]
      }
      companies: {
        Row: {
          company_attention: string | null
          company_auth_user_id: string
          company_billing_address: string | null
          company_billing_city: string | null
          company_billing_country: string | null
          company_billing_interval: string
          company_billing_notes: string | null
          company_billing_postal_code: string | null
          company_contact_name: string | null
          company_created_at: string
          company_cvr_number: string | null
          company_department: string | null
          company_discount_percent: number
          company_display_name: string
          company_economic_customer_number: string | null
          company_email: string
          company_id: string
          company_internal_note: string | null
          company_invoice_email: string | null
          company_legal_name: string | null
          company_master_data_completed_at: string | null
          company_membership_status: Database["public"]["Enums"]["company_membership_status"]
          company_reference: string | null
          company_updated_at: string
          company_username: string
        }
        Insert: {
          company_attention?: string | null
          company_auth_user_id: string
          company_billing_address?: string | null
          company_billing_city?: string | null
          company_billing_country?: string | null
          company_billing_interval?: string
          company_billing_notes?: string | null
          company_billing_postal_code?: string | null
          company_contact_name?: string | null
          company_created_at?: string
          company_cvr_number?: string | null
          company_department?: string | null
          company_discount_percent?: number
          company_display_name: string
          company_economic_customer_number?: string | null
          company_email: string
          company_id?: string
          company_internal_note?: string | null
          company_invoice_email?: string | null
          company_legal_name?: string | null
          company_master_data_completed_at?: string | null
          company_membership_status?: Database["public"]["Enums"]["company_membership_status"]
          company_reference?: string | null
          company_updated_at?: string
          company_username: string
        }
        Update: {
          company_attention?: string | null
          company_auth_user_id?: string
          company_billing_address?: string | null
          company_billing_city?: string | null
          company_billing_country?: string | null
          company_billing_interval?: string
          company_billing_notes?: string | null
          company_billing_postal_code?: string | null
          company_contact_name?: string | null
          company_created_at?: string
          company_cvr_number?: string | null
          company_department?: string | null
          company_discount_percent?: number
          company_display_name?: string
          company_economic_customer_number?: string | null
          company_email?: string
          company_id?: string
          company_internal_note?: string | null
          company_invoice_email?: string | null
          company_legal_name?: string | null
          company_master_data_completed_at?: string | null
          company_membership_status?: Database["public"]["Enums"]["company_membership_status"]
          company_reference?: string | null
          company_updated_at?: string
          company_username?: string
        }
        Relationships: []
      }
      house_event_rooms: {
        Row: {
          house_event_room_event_id: string
          house_event_room_room_id: string
        }
        Insert: {
          house_event_room_event_id: string
          house_event_room_room_id: string
        }
        Update: {
          house_event_room_event_id?: string
          house_event_room_room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_event_rooms_house_event_room_event_id_fkey"
            columns: ["house_event_room_event_id"]
            isOneToOne: false
            referencedRelation: "house_events"
            referencedColumns: ["house_event_id"]
          },
          {
            foreignKeyName: "house_event_rooms_house_event_room_room_id_fkey"
            columns: ["house_event_room_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["room_id"]
          },
        ]
      }
      house_events: {
        Row: {
          house_event_created_at: string
          house_event_description: string
          house_event_end_at: string
          house_event_id: string
          house_event_start_at: string
          house_event_title: string | null
          house_event_updated_at: string
        }
        Insert: {
          house_event_created_at?: string
          house_event_description: string
          house_event_end_at: string
          house_event_id?: string
          house_event_start_at: string
          house_event_title?: string | null
          house_event_updated_at?: string
        }
        Update: {
          house_event_created_at?: string
          house_event_description?: string
          house_event_end_at?: string
          house_event_id?: string
          house_event_start_at?: string
          house_event_title?: string | null
          house_event_updated_at?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          notice_body: string
          notice_created_at: string
          notice_ends_at: string | null
          notice_id: string
          notice_is_active: boolean
          notice_starts_at: string | null
          notice_updated_at: string
        }
        Insert: {
          notice_body: string
          notice_created_at?: string
          notice_ends_at?: string | null
          notice_id?: string
          notice_is_active?: boolean
          notice_starts_at?: string | null
          notice_updated_at?: string
        }
        Update: {
          notice_body?: string
          notice_created_at?: string
          notice_ends_at?: string | null
          notice_id?: string
          notice_is_active?: boolean
          notice_starts_at?: string | null
          notice_updated_at?: string
        }
        Relationships: []
      }
      outbound_emails: {
        Row: {
          outbound_email_booking_id: string | null
          outbound_email_company_id: string | null
          outbound_email_created_at: string
          outbound_email_error: string | null
          outbound_email_id: string
          outbound_email_kind: Database["public"]["Enums"]["outbound_email_kind"]
          outbound_email_resend_id: string | null
          outbound_email_sent_at: string | null
          outbound_email_status: Database["public"]["Enums"]["outbound_email_status"]
          outbound_email_to: string
          outbound_email_updated_at: string
        }
        Insert: {
          outbound_email_booking_id?: string | null
          outbound_email_company_id?: string | null
          outbound_email_created_at?: string
          outbound_email_error?: string | null
          outbound_email_id?: string
          outbound_email_kind: Database["public"]["Enums"]["outbound_email_kind"]
          outbound_email_resend_id?: string | null
          outbound_email_sent_at?: string | null
          outbound_email_status?: Database["public"]["Enums"]["outbound_email_status"]
          outbound_email_to: string
          outbound_email_updated_at?: string
        }
        Update: {
          outbound_email_booking_id?: string | null
          outbound_email_company_id?: string | null
          outbound_email_created_at?: string
          outbound_email_error?: string | null
          outbound_email_id?: string
          outbound_email_kind?: Database["public"]["Enums"]["outbound_email_kind"]
          outbound_email_resend_id?: string | null
          outbound_email_sent_at?: string | null
          outbound_email_status?: Database["public"]["Enums"]["outbound_email_status"]
          outbound_email_to?: string
          outbound_email_updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_emails_outbound_email_booking_id_fkey"
            columns: ["outbound_email_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "outbound_emails_outbound_email_company_id_fkey"
            columns: ["outbound_email_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
        ]
      }
      room_addons: {
        Row: {
          room_addon_addon_id: string
          room_addon_room_id: string
        }
        Insert: {
          room_addon_addon_id: string
          room_addon_room_id: string
        }
        Update: {
          room_addon_addon_id?: string
          room_addon_room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_addons_room_addon_addon_id_fkey"
            columns: ["room_addon_addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["addon_id"]
          },
          {
            foreignKeyName: "room_addons_room_addon_room_id_fkey"
            columns: ["room_addon_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["room_id"]
          },
        ]
      }
      room_images: {
        Row: {
          room_image_created_at: string
          room_image_id: string
          room_image_room_id: string
          room_image_sort_order: number
          room_image_url: string
        }
        Insert: {
          room_image_created_at?: string
          room_image_id?: string
          room_image_room_id: string
          room_image_sort_order?: number
          room_image_url: string
        }
        Update: {
          room_image_created_at?: string
          room_image_id?: string
          room_image_room_id?: string
          room_image_sort_order?: number
          room_image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_images_room_image_room_id_fkey"
            columns: ["room_image_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["room_id"]
          },
        ]
      }
      rooms: {
        Row: {
          room_capacity: number
          room_closes_at: string
          room_created_at: string
          room_description: string | null
          room_id: string
          room_is_active: boolean
          room_location: string | null
          room_name: string
          room_opens_at: string
          room_practical_info: string | null
          room_price_ore: number
          room_updated_at: string
        }
        Insert: {
          room_capacity: number
          room_closes_at: string
          room_created_at?: string
          room_description?: string | null
          room_id?: string
          room_is_active?: boolean
          room_location?: string | null
          room_name: string
          room_opens_at: string
          room_practical_info?: string | null
          room_price_ore: number
          room_updated_at?: string
        }
        Update: {
          room_capacity?: number
          room_closes_at?: string
          room_created_at?: string
          room_description?: string | null
          room_id?: string
          room_is_active?: boolean
          room_location?: string | null
          room_name?: string
          room_opens_at?: string
          room_practical_info?: string | null
          room_price_ore?: number
          room_updated_at?: string
        }
        Relationships: []
      }
      terms_acceptances: {
        Row: {
          terms_acceptance_accepted_at: string
          terms_acceptance_booking_id: string | null
          terms_acceptance_company_id: string
          terms_acceptance_id: string
          terms_acceptance_terms_version_id: string
        }
        Insert: {
          terms_acceptance_accepted_at?: string
          terms_acceptance_booking_id?: string | null
          terms_acceptance_company_id: string
          terms_acceptance_id?: string
          terms_acceptance_terms_version_id: string
        }
        Update: {
          terms_acceptance_accepted_at?: string
          terms_acceptance_booking_id?: string | null
          terms_acceptance_company_id?: string
          terms_acceptance_id?: string
          terms_acceptance_terms_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptances_terms_acceptance_booking_id_fkey"
            columns: ["terms_acceptance_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "terms_acceptances_terms_acceptance_company_id_fkey"
            columns: ["terms_acceptance_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "terms_acceptances_terms_acceptance_terms_version_id_fkey"
            columns: ["terms_acceptance_terms_version_id"]
            isOneToOne: false
            referencedRelation: "terms_versions"
            referencedColumns: ["terms_version_id"]
          },
        ]
      }
      terms_versions: {
        Row: {
          terms_version_content: string
          terms_version_created_at: string
          terms_version_id: string
          terms_version_name: string
          terms_version_published_at: string | null
          terms_version_version: string
        }
        Insert: {
          terms_version_content: string
          terms_version_created_at?: string
          terms_version_id?: string
          terms_version_name: string
          terms_version_published_at?: string | null
          terms_version_version: string
        }
        Update: {
          terms_version_content?: string
          terms_version_created_at?: string
          terms_version_id?: string
          terms_version_name?: string
          terms_version_published_at?: string | null
          terms_version_version?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          verification_code_attempts: number
          verification_code_booking_id: string
          verification_code_consumed_at: string | null
          verification_code_created_at: string
          verification_code_expires_at: string
          verification_code_hash: string
          verification_code_id: string
          verification_code_updated_at: string
        }
        Insert: {
          verification_code_attempts?: number
          verification_code_booking_id: string
          verification_code_consumed_at?: string | null
          verification_code_created_at?: string
          verification_code_expires_at: string
          verification_code_hash: string
          verification_code_id?: string
          verification_code_updated_at?: string
        }
        Update: {
          verification_code_attempts?: number
          verification_code_booking_id?: string
          verification_code_consumed_at?: string | null
          verification_code_created_at?: string
          verification_code_expires_at?: string
          verification_code_hash?: string
          verification_code_id?: string
          verification_code_updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_codes_verification_code_booking_id_fkey"
            columns: ["verification_code_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["booking_id"]
          },
        ]
      }
    }
    Views: {
      calendar_entries: {
        Row: {
          calendar_entry_end_at: string | null
          calendar_entry_id: string | null
          calendar_entry_kind: string | null
          calendar_entry_start_at: string | null
          company_display_name: string | null
          house_event_title: string | null
          room_id: string | null
          room_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assert_booking_room_free: {
        Args: { p_end_at: string; p_room_id: string; p_start_at: string }
        Returns: undefined
      }
      assert_event_room_free: {
        Args: {
          p_end_at: string
          p_exclude_event_id?: string
          p_room_id: string
          p_start_at: string
        }
        Returns: undefined
      }
      booking_blocked_until: { Args: { p_end_at: string }; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      expire_stale_holds: { Args: never; Returns: number }
      next_booking_number: { Args: never; Returns: string }
    }
    Enums: {
      addon_pricing_model: "fixed" | "per_participant"
      booking_invoicing_status: "not_invoiced" | "invoiced" | "not_invoicable"
      booking_status:
        | "pending_verification"
        | "confirmed"
        | "cancelled"
        | "expired"
      company_membership_status: "member" | "external"
      outbound_email_kind:
        | "company-invitation"
        | "verification-code"
        | "password-reset"
        | "booking-confirmation"
        | "reminder"
        | "booking-changed"
        | "booking-cancelled"
        | "admin-new-booking"
        | "admin-booking-cancelled"
        | "admin-company-completed"
      outbound_email_status:
        | "queued"
        | "sent"
        | "delivered"
        | "bounced"
        | "complained"
        | "delivery_delayed"
        | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      addon_pricing_model: ["fixed", "per_participant"],
      booking_invoicing_status: ["not_invoiced", "invoiced", "not_invoicable"],
      booking_status: [
        "pending_verification",
        "confirmed",
        "cancelled",
        "expired",
      ],
      company_membership_status: ["member", "external"],
      outbound_email_kind: [
        "company-invitation",
        "verification-code",
        "password-reset",
        "booking-confirmation",
        "reminder",
        "booking-changed",
        "booking-cancelled",
        "admin-new-booking",
        "admin-booking-cancelled",
        "admin-company-completed",
      ],
      outbound_email_status: [
        "queued",
        "sent",
        "delivered",
        "bounced",
        "complained",
        "delivery_delayed",
        "failed",
      ],
    },
  },
} as const

