import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";

export const BookingHistoryExport = () => {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const fetchAppointments = async () => {
    if (!user?.id) return [];

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        provider:provider_profiles(
          profession,
          specialty,
          user_id
        )
      `)
      .eq("user_id", user.id)
      .order("appointment_date", { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const appointments = await fetchAppointments();

      const headers = [
        "Date",
        "Time",
        "Provider",
        "Profession",
        "Specialty",
        "Status",
        "Type",
        "Amount",
        "Payment Status",
        "Notes",
      ];

      const rows = appointments.map((apt) => [
        format(new Date(apt.appointment_date), "yyyy-MM-dd"),
        `${apt.start_time} - ${apt.end_time}`,
        apt.provider?.profession || "Unknown",
        apt.provider?.profession || "",
        apt.provider?.specialty || "",
        apt.status,
        apt.is_video_consultation ? "Video" : "In-Person",
        apt.payment_amount || 0,
        apt.payment_status || "N/A",
        apt.notes || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `booking-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Booking history exported successfully");
    } catch (error: any) {
      toast.error("Failed to export: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = async () => {
    setIsExporting(true);
    try {
      const appointments = await fetchAppointments();

      const exportData = appointments.map((apt) => ({
        date: apt.appointment_date,
        startTime: apt.start_time,
        endTime: apt.end_time,
        provider: apt.provider?.profession || "Unknown",
        profession: apt.provider?.profession || "",
        specialty: apt.provider?.specialty || "",
        status: apt.status,
        type: apt.is_video_consultation ? "video" : "in-person",
        amount: apt.payment_amount || 0,
        paymentStatus: apt.payment_status || "N/A",
        notes: apt.notes || "",
        createdAt: apt.created_at,
      }));

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `booking-history-${format(new Date(), "yyyy-MM-dd")}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Booking history exported successfully");
    } catch (error: any) {
      toast.error("Failed to export: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export History
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
