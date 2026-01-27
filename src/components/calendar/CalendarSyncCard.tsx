import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGoogleCalendar, formatAppointmentForCalendar } from "@/hooks/useGoogleCalendar";
import { CalendarCheck, Calendar, Link2, Link2Off, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CalendarSyncCardProps {
  appointments?: Array<{
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    provider_name?: string;
    patient_name?: string;
    is_video_consultation?: boolean;
    meeting_url?: string;
    notes?: string;
    location?: string;
    status: string;
  }>;
  isProvider?: boolean;
}

const CalendarSyncCard = ({ appointments = [], isProvider = false }: CalendarSyncCardProps) => {
  const {
    isConnected,
    isSyncing,
    connectCalendar,
    disconnectCalendar,
    syncAppointment,
  } = useGoogleCalendar();
  const { toast } = useToast();

  const handleSyncAll = async () => {
    const upcomingAppointments = appointments.filter(
      (apt) => apt.status === "approved" && new Date(apt.appointment_date) >= new Date()
    );

    if (upcomingAppointments.length === 0) {
      toast({
        title: "No appointments to sync",
        description: "You don't have any upcoming confirmed appointments.",
      });
      return;
    }

    let successCount = 0;
    for (const apt of upcomingAppointments) {
      const details = formatAppointmentForCalendar({
        ...apt,
        provider_name: isProvider ? undefined : apt.provider_name,
        patient_name: isProvider ? apt.patient_name : undefined,
      });
      const result = await syncAppointment(apt.id, details);
      if (result) successCount++;
    }

    toast({
      title: "Calendar Sync Complete",
      description: `${successCount} of ${upcomingAppointments.length} appointments synced to Google Calendar.`,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-2 rounded-md">
              <CalendarCheck className="h-4 w-4" />
              <span>Connected to Google Calendar</span>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="w-full"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CalendarCheck className="h-4 w-4 mr-2" />
                )}
                Sync All Appointments
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={disconnectCalendar}
                className="w-full"
              >
                <Link2Off className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your Google Calendar to automatically sync your appointments.
            </p>
            <Button
              size="sm"
              onClick={connectCalendar}
              className="w-full"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Connect Google Calendar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarSyncCard;
