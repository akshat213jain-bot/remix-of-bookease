
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Ban } from "lucide-react";

export default function KycCompliancePage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold tracking-tight">KYC & Compliance</h1>
       <Card>
          <CardHeader>
              <CardTitle>Pending Verification</CardTitle>
              <CardDescription>Verify documents and flag suspicious activities.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                  <Ban className="h-12 w-12 mb-4" />
                  <p>No KYC documents pending verification.</p>
              </div>
          </CardContent>
       </Card>
    </div>
  );
}
