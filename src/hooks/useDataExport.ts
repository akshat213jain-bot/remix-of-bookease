import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { downloadAllTablesAsJson, downloadTableAsJson } from '@/lib/mongoExport';
import { toast } from 'sonner';

// Fix #2: Explicit safe columns per table — no phone_verification_code, stripe keys, push auth keys
const TABLE_COLUMNS: Record<string, string> = {
  appointments: 'id, user_id, provider_id, appointment_date, start_time, end_time, status, notes, cancellation_reason, is_video_consultation, meeting_url, meeting_room_name, payment_status, payment_amount, payment_date, payment_method, recurrence_pattern, recurrence_end_date, parent_appointment_id, is_recurring_parent, booking_group_id, created_at, updated_at',
  approval_requests: 'id, requester_id, request_type, status, details, admin_notes, related_id, reviewed_by, reviewed_at, created_at, updated_at',
  booking_groups: 'id, user_id, name, status, total_amount, discount_applied, created_at, updated_at',
  chat_conversations: 'id, user_id, provider_id, last_message_at, created_at, updated_at',
  chat_messages: 'id, conversation_id, sender_id, message, is_read, created_at',
  disputes: 'id, appointment_id, user_id, provider_id, dispute_type, description, status, resolution, resolved_by, resolved_at, created_at, updated_at',
  email_templates: 'id, name, subject, html_content, description, variables, is_active, created_at, updated_at',
  favorite_providers: 'id, user_id, provider_id, created_at',
  group_discounts: 'id, provider_id, min_appointments, discount_percentage, is_active, created_at, updated_at',
  loyalty_points: 'id, user_id, total_points, lifetime_points, created_at, updated_at',
  loyalty_transactions: 'id, user_id, points, transaction_type, description, related_appointment_id, created_at',
  notifications: 'id, user_id, title, message, type, is_read, related_appointment_id, created_at',
  outgoing_emails: 'id, message_id, provider, to_emails, subject, email_type, status, sender_email, last_event, last_event_at, created_at, updated_at',
  profiles: 'id, user_id, full_name, email, phone, avatar_url, status, status_reason, preferred_language, timezone, city, country, referral_code, created_at, updated_at',
  provider_availability: 'id, provider_id, day_of_week, start_time, end_time, slot_duration, is_active, created_at, updated_at',
  provider_blocked_dates: 'id, provider_id, blocked_date, reason, created_at',
  provider_profiles: 'id, user_id, profession, specialty, bio, consultation_fee, location, years_of_experience, is_approved, is_active, video_enabled, video_consultation_fee, require_video_payment, average_rating, total_reviews, is_verified, buffer_time_before, buffer_time_after, timezone, created_at, updated_at',
  push_subscriptions: 'id, user_id, endpoint, created_at',
  referrals: 'id, referrer_id, referred_id, referral_code, status, bonus_awarded, created_at, completed_at',
  reviews: 'id, user_id, provider_id, appointment_id, rating, review_text, is_visible, provider_response, provider_response_at, created_at, updated_at',
  satisfaction_surveys: 'id, user_id, provider_id, appointment_id, overall_rating, communication_rating, punctuality_rating, value_rating, would_recommend, feedback, sent_at, completed_at, created_at',
  slot_waitlist: 'id, user_id, provider_id, preferred_date, preferred_day_of_week, preferred_start_time, preferred_end_time, is_flexible, is_active, notified_at, created_at',
  subscription_plans: 'id, name, description, price, appointments_included, duration_days, is_active, created_at, updated_at',
  system_settings: 'id, key, value, description, created_at, updated_at',
  user_analytics: 'id, user_id, event_type, event_data, created_at',
  user_roles: 'id, user_id, role, created_at',
  user_subscriptions: 'id, user_id, plan_id, status, appointments_remaining, starts_at, expires_at, created_at, updated_at',
};

const TABLES = Object.keys(TABLE_COLUMNS);

type TableName = string;

export const useDataExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  const fetchTableData = async (tableName: TableName): Promise<Record<string, unknown>[]> => {
    const columns = TABLE_COLUMNS[tableName] || '*';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(tableName)
      .select(columns);
    
    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      return [];
    }
    
    return (data || []) as Record<string, unknown>[];
  };

  const exportSingleTable = async (tableName: TableName, useExtendedJson: boolean = true) => {
    setIsExporting(true);
    setExportProgress(`Exporting ${tableName}...`);
    
    try {
      const data = await fetchTableData(tableName);
      downloadTableAsJson(tableName, data, useExtendedJson);
      toast.success(`Exported ${tableName} (${data.length} records)`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${tableName}`);
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const exportAllTables = async (useExtendedJson: boolean = true) => {
    setIsExporting(true);
    const allData: Record<string, Record<string, unknown>[]> = {};
    
    try {
      for (let i = 0; i < TABLES.length; i++) {
        const tableName = TABLES[i];
        setExportProgress(`Exporting ${tableName} (${i + 1}/${TABLES.length})...`);
        allData[tableName] = await fetchTableData(tableName);
      }
      
      downloadAllTablesAsJson(allData, useExtendedJson);
      
      const totalRecords = Object.values(allData).reduce((sum, arr) => sum + arr.length, 0);
      toast.success(`Exported all tables (${totalRecords} total records)`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export database');
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  return {
    tables: TABLES,
    isExporting,
    exportProgress,
    exportSingleTable,
    exportAllTables,
  };
};
