/**
 * MongoDB Extended JSON Export Utility
 * Converts Supabase data to MongoDB Extended JSON format for MongoDB Compass import
 */

// Convert UUID to MongoDB ObjectId-like format
export const toExtendedJson = (data: Record<string, unknown>): Record<string, unknown> => {
  const converted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      converted[key] = null;
    } else if (typeof value === 'string') {
      // Check if it's a UUID (convert to $oid-like format)
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        converted[key] = { "$oid": value.replace(/-/g, '') };
      }
      // Check if it's a date/timestamp
      else if (/^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}:\d{2}/.test(value)) {
        converted[key] = { "$date": value };
      }
      else {
        converted[key] = value;
      }
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        converted[key] = { "$numberInt": String(value) };
      } else {
        converted[key] = { "$numberDouble": String(value) };
      }
    } else if (typeof value === 'boolean') {
      converted[key] = value;
    } else if (Array.isArray(value)) {
      converted[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? toExtendedJson(item as Record<string, unknown>) 
          : item
      );
    } else if (typeof value === 'object') {
      converted[key] = toExtendedJson(value as Record<string, unknown>);
    } else {
      converted[key] = value;
    }
  }
  
  return converted;
};

// Convert array of records to Extended JSON format
export const convertToExtendedJsonArray = (data: Record<string, unknown>[]): Record<string, unknown>[] => {
  return data.map(record => toExtendedJson(record));
};

// Generate downloadable JSON file
export const downloadAsJson = (data: unknown, filename: string): void => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Download all tables as a single JSON file
export const downloadAllTablesAsJson = (
  tablesData: Record<string, Record<string, unknown>[]>,
  useExtendedJson: boolean = true
): void => {
  const exportData: Record<string, unknown> = {
    _metadata: {
      exportedAt: new Date().toISOString(),
      format: useExtendedJson ? 'MongoDB Extended JSON' : 'Standard JSON',
      source: 'Supabase/Lovable Cloud',
      tables: Object.keys(tablesData),
    },
    collections: {} as Record<string, unknown>,
  };

  for (const [tableName, records] of Object.entries(tablesData)) {
    (exportData.collections as Record<string, unknown>)[tableName] = useExtendedJson 
      ? convertToExtendedJsonArray(records) 
      : records;
  }

  downloadAsJson(exportData, `database_backup_${new Date().toISOString().split('T')[0]}`);
};

// Download single table
export const downloadTableAsJson = (
  tableName: string,
  data: Record<string, unknown>[],
  useExtendedJson: boolean = true
): void => {
  const exportData = useExtendedJson ? convertToExtendedJsonArray(data) : data;
  downloadAsJson(exportData, `${tableName}_${new Date().toISOString().split('T')[0]}`);
};
