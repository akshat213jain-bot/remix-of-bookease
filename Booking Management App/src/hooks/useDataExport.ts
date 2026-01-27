import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { downloadAllTablesAsJson, downloadTableAsJson } from '@/lib/mongoExport';
import { toast } from 'sonner';

// All exportable tables in the database
const TABLES = [
  'appointments',
  'approval_requests',
  'booking_groups',
  'chat_conversations',
  'chat_messages',
  'disputes',
  'email_templates',
  'favorite_providers',
  'group_discounts',
  'loyalty_points',
  'loyalty_transactions',
  'notifications',
  'outgoing_emails',
  'profiles',
  'provider_availability',
  'provider_blocked_dates',
  'provider_profiles',
  'push_subscriptions',
  'referrals',
  'reviews',
  'satisfaction_surveys',
  'slot_waitlist',
  'subscription_plans',
  'system_settings',
  'user_analytics',
  'user_roles',
  'user_subscriptions',
] as const;

type TableName = typeof TABLES[number];

export const useDataExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  const fetchTableData = async (tableName: TableName): Promise<Record<string, unknown>[]> => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
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
