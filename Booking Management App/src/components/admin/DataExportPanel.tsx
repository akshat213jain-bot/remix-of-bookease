import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Database, FileJson, Loader2 } from 'lucide-react';
import { useDataExport } from '@/hooks/useDataExport';

export const DataExportPanel = () => {
  const [useExtendedJson, setUseExtendedJson] = useState(true);
  const { tables, isExporting, exportProgress, exportSingleTable, exportAllTables } = useDataExport();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Developer Data Export
        </CardTitle>
        <CardDescription>
          Export database tables as MongoDB Extended JSON for backup or MongoDB Compass import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Settings */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="extended-json" className="font-medium">
              MongoDB Extended JSON Format
            </Label>
            <p className="text-sm text-muted-foreground">
              Uses $oid, $date, $numberInt format for MongoDB Compass compatibility
            </p>
          </div>
          <Switch
            id="extended-json"
            checked={useExtendedJson}
            onCheckedChange={setUseExtendedJson}
          />
        </div>

        {/* Export All Button */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => exportAllTables(useExtendedJson)}
            disabled={isExporting}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {exportProgress}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export All Tables ({tables.length} tables)
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Downloads a single JSON file containing all database tables
          </p>
        </div>

        {/* Individual Tables */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Export Individual Tables</h4>
          <ScrollArea className="h-[300px] border rounded-lg p-2">
            <div className="grid gap-2">
              {tables.map((table) => (
                <div
                  key={table}
                  className="flex items-center justify-between p-2 hover:bg-muted rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono">{table}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportSingleTable(table as any, useExtendedJson)}
                    disabled={isExporting}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Format Info */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
          <h5 className="font-medium">Import to MongoDB Compass:</h5>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Open MongoDB Compass and connect to your database</li>
            <li>Select or create a database</li>
            <li>Click "Add Data" → "Import JSON or CSV file"</li>
            <li>Select the exported JSON file</li>
            <li>Choose "JSON" format and import</li>
          </ol>
        </div>

        {/* Format Preview */}
        <div className="space-y-2">
          <h5 className="font-medium text-sm">Format Preview</h5>
          <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
            {useExtendedJson
              ? `{
  "id": { "$oid": "550e8400e29b41d4a716446655440000" },
  "created_at": { "$date": "2025-01-27T10:30:00Z" },
  "amount": { "$numberInt": "100" },
  "rating": { "$numberDouble": "4.5" },
  "name": "John Doe"
}`
              : `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-27T10:30:00Z",
  "amount": 100,
  "rating": 4.5,
  "name": "John Doe"
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};
