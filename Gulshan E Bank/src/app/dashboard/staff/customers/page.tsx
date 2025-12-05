
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Ban } from "lucide-react";

export default function CustomerManagementPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
       <Card>
          <CardHeader>
              <CardTitle>All Customers</CardTitle>
              <CardDescription>View, update, or verify customer details.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                  <Ban className="h-12 w-12 mb-4" />
                  <p>No customers to display.</p>
              </div>
          </CardContent>
       </Card>
    </div>
  );
}
