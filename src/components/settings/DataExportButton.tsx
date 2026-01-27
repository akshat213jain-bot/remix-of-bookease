import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileJson, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const DataExportButton = () => {
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();

    const exportData = async () => {
        setIsExporting(true);
        try {
            const { data, error } = await supabase.functions.invoke("export-user-data", {
                body: {},
            });

            if (error) throw error;

            // Create downloadable JSON file
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `bookease-data-export-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({
                title: "Export Complete",
                description: "Your data has been downloaded successfully",
            });
        } catch (error) {
            toast({
                title: "Export Failed",
                description: error instanceof Error ? error.message : "Failed to export data",
                variant: "destructive",
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <FileJson className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Export Your Data</CardTitle>
                </div>
                <CardDescription>
                    Download a copy of all your personal data stored in BookEase. This includes your
                    profile, appointments, reviews, and more.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={isExporting}>
                            {isExporting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Export My Data
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Export Your Data</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will generate a JSON file containing all your personal data stored in
                                BookEase, including:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>Profile information</li>
                                    <li>Appointment history</li>
                                    <li>Reviews and ratings</li>
                                    <li>Favorites and preferences</li>
                                    <li>Subscription details</li>
                                    <li>Loyalty points and referrals</li>
                                </ul>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={exportData}>
                                Download
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
};
