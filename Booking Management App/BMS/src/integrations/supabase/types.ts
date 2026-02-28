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
      appointments: {
        Row: {
          appointment_date: string
          booking_group_id: string | null
          cancellation_reason: string | null
          created_at: string
          end_time: string
          id: string
          is_recurring_parent: boolean | null
          is_video_consultation: boolean | null
          meeting_room_name: string | null
          meeting_url: string | null
          notes: string | null
          parent_appointment_id: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          proposed_date: string | null
          proposed_end_time: string | null
          proposed_start_time: string | null
          provider_id: string
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          reschedule_reason: string | null
          reschedule_requested_by: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          booking_group_id?: string | null
          cancellation_reason?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_recurring_parent?: boolean | null
          is_video_consultation?: boolean | null
          meeting_room_name?: string | null
          meeting_url?: string | null
          notes?: string | null
          parent_appointment_id?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          proposed_date?: string | null
          proposed_end_time?: string | null
          proposed_start_time?: string | null
          provider_id: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reschedule_reason?: string | null
          reschedule_requested_by?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          booking_group_id?: string | null
          cancellation_reason?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_recurring_parent?: boolean | null
          is_video_consultation?: boolean | null
          meeting_room_name?: string | null
          meeting_url?: string | null
          notes?: string | null
          parent_appointment_id?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          proposed_date?: string | null
          proposed_end_time?: string | null
          proposed_start_time?: string | null
          provider_id?: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reschedule_reason?: string | null
          reschedule_requested_by?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_booking_group_id_fkey"
            columns: ["booking_group_id"]
            isOneToOne: false
            referencedRelation: "booking_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_parent_appointment_id_fkey"
            columns: ["parent_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: Json | null
          id: string
          related_id: string | null
          request_type: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          related_id?: string | null
          request_type: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          related_id?: string | null
          request_type?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string | null
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          points: number | null
        }
        Insert: {
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points?: number | null
        }
        Update: {
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points?: number | null
        }
        Relationships: []
      }
      booking_groups: {
        Row: {
          created_at: string
          discount_applied: number | null
          id: string
          name: string | null
          status: string | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_applied?: number | null
          id?: string
          name?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_applied?: number | null
          id?: string
          name?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          appointment_id: string | null
          call_type: string
          callee_id: string
          caller_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          room_name: string | null
          room_url: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          call_type?: string
          callee_id: string
          caller_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          room_name?: string | null
          room_url: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          call_type?: string
          callee_id?: string
          caller_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          room_name?: string | null
          room_url?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          provider_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          provider_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          provider_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_uses: {
        Row: {
          appointment_id: string | null
          coupon_id: string
          discount_applied: number
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          coupon_id: string
          discount_applied: number
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          coupon_id?: string
          discount_applied?: number
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_purchase: number | null
          provider_id: string | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_purchase?: number | null
          provider_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_purchase?: number | null
          provider_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      disputes: {
        Row: {
          appointment_id: string
          created_at: string
          description: string
          dispute_type: string
          id: string
          provider_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          description: string
          dispute_type: string
          id?: string
          provider_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          description?: string
          dispute_type?: string
          id?: string
          provider_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      favorite_providers: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      gift_card_transactions: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string | null
          gift_card_id: string
          id: string
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string | null
          gift_card_id: string
          id?: string
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string | null
          gift_card_id?: string
          id?: string
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          code: string
          created_at: string | null
          current_balance: number
          expires_at: string | null
          id: string
          initial_value: number
          is_active: boolean | null
          message: string | null
          purchased_by: string | null
          recipient_email: string | null
          recipient_name: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_balance: number
          expires_at?: string | null
          id?: string
          initial_value: number
          is_active?: boolean | null
          message?: string | null
          purchased_by?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_balance?: number
          expires_at?: string | null
          id?: string
          initial_value?: number
          is_active?: boolean | null
          message?: string | null
          purchased_by?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
        }
        Relationships: []
      }
      group_discounts: {
        Row: {
          created_at: string
          discount_percentage: number
          id: string
          is_active: boolean | null
          min_appointments: number
          provider_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_percentage?: number
          id?: string
          is_active?: boolean | null
          min_appointments?: number
          provider_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_percentage?: number
          id?: string
          is_active?: boolean | null
          min_appointments?: number
          provider_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_discounts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_discounts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_discounts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          lifetime_points: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lifetime_points?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lifetime_points?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          related_appointment_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points: number
          related_appointment_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          related_appointment_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_related_appointment_id_fkey"
            columns: ["related_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_appointment_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_appointment_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_appointment_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_appointment_id_fkey"
            columns: ["related_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      outgoing_emails: {
        Row: {
          created_at: string
          email_type: string | null
          id: string
          last_event: string | null
          last_event_at: string | null
          last_payload: Json | null
          message_id: string
          provider: string
          provider_response: string | null
          sender_email: string | null
          status: string
          subject: string
          to_emails: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_type?: string | null
          id?: string
          last_event?: string | null
          last_event_at?: string | null
          last_payload?: Json | null
          message_id: string
          provider?: string
          provider_response?: string | null
          sender_email?: string | null
          status?: string
          subject: string
          to_emails: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_type?: string | null
          id?: string
          last_event?: string | null
          last_event_at?: string | null
          last_payload?: Json | null
          message_id?: string
          provider?: string
          provider_response?: string | null
          sender_email?: string | null
          status?: string
          subject?: string
          to_emails?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          phone_verification_code: string | null
          phone_verification_expires_at: string | null
          phone_verified: boolean | null
          preferred_language: string | null
          referral_code: string | null
          sms_notifications_enabled: boolean | null
          status: string
          status_reason: string | null
          status_updated_at: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          referral_code?: string | null
          sms_notifications_enabled?: boolean | null
          status?: string
          status_reason?: string | null
          status_updated_at?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          referral_code?: string | null
          sms_notifications_enabled?: boolean | null
          status?: string
          status_reason?: string | null
          status_updated_at?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          provider_id: string
          slot_duration: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          provider_id: string
          slot_duration?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          provider_id?: string
          slot_duration?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      provider_blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: string
          provider_id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: string
          provider_id: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: string
          provider_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_blocked_dates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_blocked_dates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_blocked_dates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      provider_profiles: {
        Row: {
          average_rating: number | null
          bio: string | null
          buffer_time_after: number | null
          buffer_time_before: number | null
          consultation_fee: number | null
          created_at: string
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          is_verified: boolean | null
          location: string | null
          phone: string | null
          phone_verified: boolean | null
          profession: string
          require_video_payment: boolean | null
          sms_notifications_enabled: boolean | null
          specialty: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean | null
          stripe_onboarding_complete: boolean | null
          stripe_payouts_enabled: boolean | null
          timezone: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          verification_documents: string[] | null
          verification_type: string | null
          verified_at: string | null
          video_consultation_fee: number | null
          video_enabled: boolean | null
          years_of_experience: number | null
        }
        Insert: {
          average_rating?: number | null
          bio?: string | null
          buffer_time_after?: number | null
          buffer_time_before?: number | null
          consultation_fee?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          profession: string
          require_video_payment?: boolean | null
          sms_notifications_enabled?: boolean | null
          specialty?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_complete?: boolean | null
          stripe_payouts_enabled?: boolean | null
          timezone?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          verification_documents?: string[] | null
          verification_type?: string | null
          verified_at?: string | null
          video_consultation_fee?: number | null
          video_enabled?: boolean | null
          years_of_experience?: number | null
        }
        Update: {
          average_rating?: number | null
          bio?: string | null
          buffer_time_after?: number | null
          buffer_time_before?: number | null
          consultation_fee?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          profession?: string
          require_video_payment?: boolean | null
          sms_notifications_enabled?: boolean | null
          specialty?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_complete?: boolean | null
          stripe_payouts_enabled?: boolean | null
          timezone?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          verification_documents?: string[] | null
          verification_type?: string | null
          verified_at?: string | null
          video_consultation_fee?: number | null
          video_enabled?: boolean | null
          years_of_experience?: number | null
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
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_awarded: boolean
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          bonus_awarded?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          bonus_awarded?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          is_visible: boolean | null
          provider_id: string
          provider_response: string | null
          provider_response_at: string | null
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          is_visible?: boolean | null
          provider_id: string
          provider_response?: string | null
          provider_response_at?: string | null
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          is_visible?: boolean | null
          provider_id?: string
          provider_response?: string | null
          provider_response_at?: string | null
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      satisfaction_surveys: {
        Row: {
          appointment_id: string
          communication_rating: number | null
          completed_at: string | null
          created_at: string
          feedback: string | null
          id: string
          overall_rating: number | null
          provider_id: string
          punctuality_rating: number | null
          sent_at: string | null
          user_id: string
          value_rating: number | null
          would_recommend: boolean | null
        }
        Insert: {
          appointment_id: string
          communication_rating?: number | null
          completed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          overall_rating?: number | null
          provider_id: string
          punctuality_rating?: number | null
          sent_at?: string | null
          user_id: string
          value_rating?: number | null
          would_recommend?: boolean | null
        }
        Update: {
          appointment_id?: string
          communication_rating?: number | null
          completed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          overall_rating?: number | null
          provider_id?: string
          punctuality_rating?: number | null
          sent_at?: string | null
          user_id?: string
          value_rating?: number | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_surveys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string | null
          description: string | null
          discounted_price: number
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          original_price: number
          provider_id: string
          savings_amount: number | null
          savings_percentage: number | null
          services: Json | null
          updated_at: string | null
          valid_days: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discounted_price: number
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          original_price: number
          provider_id: string
          savings_amount?: number | null
          savings_percentage?: number | null
          services?: Json | null
          updated_at?: string | null
          valid_days?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discounted_price?: number
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          original_price?: number
          provider_id?: string
          savings_amount?: number | null
          savings_percentage?: number | null
          services?: Json | null
          updated_at?: string | null
          valid_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_packages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_packages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      slot_waitlist: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_flexible: boolean | null
          notified_at: string | null
          preferred_date: string | null
          preferred_day_of_week: number | null
          preferred_end_time: string | null
          preferred_start_time: string | null
          provider_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_flexible?: boolean | null
          notified_at?: string | null
          preferred_date?: string | null
          preferred_day_of_week?: number | null
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          provider_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_flexible?: boolean | null
          notified_at?: string | null
          preferred_date?: string | null
          preferred_day_of_week?: number | null
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          provider_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_waitlist_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_waitlist_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_waitlist_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          appointments_included: number
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          appointments_included?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          appointments_included?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tips: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string | null
          id: string
          provider_id: string
          status: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          provider_id: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          provider_id?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      user_analytics: {
        Row: {
          average_booking_value: number | null
          created_at: string
          favorite_provider_id: string | null
          id: string
          last_booking_at: string | null
          most_booked_day: number | null
          most_booked_time: string | null
          total_bookings: number | null
          total_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_booking_value?: number | null
          created_at?: string
          favorite_provider_id?: string | null
          id?: string
          last_booking_at?: string | null
          most_booked_day?: number | null
          most_booked_time?: string | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_booking_value?: number | null
          created_at?: string
          favorite_provider_id?: string | null
          id?: string
          last_booking_at?: string | null
          most_booked_day?: number | null
          most_booked_time?: string | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_analytics_favorite_provider_id_fkey"
            columns: ["favorite_provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_analytics_favorite_provider_id_fkey"
            columns: ["favorite_provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_analytics_favorite_provider_id_fkey"
            columns: ["favorite_provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_packages: {
        Row: {
          expires_at: string
          id: string
          package_id: string
          purchased_at: string | null
          remaining_services: Json | null
          status: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          expires_at: string
          id?: string
          package_id: string
          purchased_at?: string | null
          remaining_services?: Json | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          package_id?: string
          purchased_at?: string | null
          remaining_services?: Json | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_subscriptions: {
        Row: {
          appointments_remaining: number
          created_at: string
          expires_at: string
          id: string
          plan_id: string
          starts_at: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointments_remaining?: number
          created_at?: string
          expires_at: string
          id?: string
          plan_id: string
          starts_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointments_remaining?: number
          created_at?: string
          expires_at?: string
          id?: string
          plan_id?: string
          starts_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      provider_blocked_dates_public: {
        Row: {
          blocked_date: string | null
          id: string | null
          provider_id: string | null
        }
        Insert: {
          blocked_date?: string | null
          id?: string | null
          provider_id?: string | null
        }
        Update: {
          blocked_date?: string | null
          id?: string | null
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_blocked_dates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_blocked_dates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_blocked_dates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      provider_profiles_public: {
        Row: {
          average_rating: number | null
          bio: string | null
          buffer_time_after: number | null
          buffer_time_before: number | null
          consultation_fee: number | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          is_approved: boolean | null
          is_verified: boolean | null
          location: string | null
          profession: string | null
          require_video_payment: boolean | null
          specialty: string | null
          timezone: string | null
          total_reviews: number | null
          user_id: string | null
          video_consultation_fee: number | null
          video_enabled: boolean | null
          years_of_experience: number | null
        }
        Insert: {
          average_rating?: number | null
          bio?: string | null
          buffer_time_after?: number | null
          buffer_time_before?: number | null
          consultation_fee?: number | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          profession?: string | null
          require_video_payment?: boolean | null
          specialty?: string | null
          timezone?: string | null
          total_reviews?: number | null
          user_id?: string | null
          video_consultation_fee?: number | null
          video_enabled?: boolean | null
          years_of_experience?: number | null
        }
        Update: {
          average_rating?: number | null
          bio?: string | null
          buffer_time_after?: number | null
          buffer_time_before?: number | null
          consultation_fee?: number | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          profession?: string | null
          require_video_payment?: boolean | null
          specialty?: string | null
          timezone?: string | null
          total_reviews?: number | null
          user_id?: string | null
          video_consultation_fee?: number | null
          video_enabled?: boolean | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      provider_public_info: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          city: string | null
          consultation_fee: number | null
          country: string | null
          full_name: string | null
          is_verified: boolean | null
          location: string | null
          profession: string | null
          provider_id: string | null
          specialty: string | null
          total_reviews: number | null
          user_id: string | null
          video_consultation_fee: number | null
          video_enabled: boolean | null
          years_of_experience: number | null
        }
        Relationships: []
      }
      reviews_public: {
        Row: {
          created_at: string | null
          id: string | null
          is_visible: boolean | null
          provider_id: string | null
          provider_response: string | null
          provider_response_at: string | null
          rating: number | null
          review_text: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_visible?: boolean | null
          provider_id?: string | null
          provider_response?: string | null
          provider_response_at?: string | null
          rating?: number | null
          review_text?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_visible?: boolean | null
          provider_id?: string | null
          provider_response?: string | null
          provider_response_at?: string | null
          rating?: number | null
          review_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_public_info"
            referencedColumns: ["provider_id"]
          },
        ]
      }
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_coupon: {
        Args: {
          p_amount: number
          p_code: string
          p_service_id?: string
          p_user_id: string
        }
        Returns: {
          coupon_id: string
          discount_amount: number
          discount_type: string
          discount_value: number
          error_message: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "user" | "provider" | "admin"
      appointment_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
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
      app_role: ["user", "provider", "admin"],
      appointment_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
