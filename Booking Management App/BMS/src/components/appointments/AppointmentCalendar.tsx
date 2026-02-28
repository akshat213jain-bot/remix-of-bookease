import { useMemo } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppointmentWithProvider } from "@/hooks/useAppointments";
import { parseISO, isSameDay, format } from "date-fns";
import { cn } from "@/lib/utils";

interface AppointmentCalendarProps {
  appointments: AppointmentWithProvider[];
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export const AppointmentCalendar = ({
  appointments,
  selectedDate,
  onDateSelect,
}: AppointmentCalendarProps) => {
  // Get dates that have appointments
  const appointmentDates = useMemo(() => {
    const dates = new Map<string, { count: number; statuses: string[] }>();
    
    appointments.forEach((apt) => {
      const dateKey = apt.appointment_date;
      const existing = dates.get(dateKey) || { count: 0, statuses: [] };
      existing.count++;
      if (!existing.statuses.includes(apt.status)) {
        existing.statuses.push(apt.status);
      }
      dates.set(dateKey, existing);
    });
    
    return dates;
  }, [appointments]);

  // Get appointments for selected date
  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return appointments.filter((apt) =>
      isSameDay(parseISO(apt.appointment_date), selectedDate)
    );
  }, [appointments, selectedDate]);

  // Custom day content to show appointment indicators
  const modifiers = useMemo(() => {
    const hasAppointment: Date[] = [];
    const hasPending: Date[] = [];
    const hasConfirmed: Date[] = [];

    appointmentDates.forEach((data, dateStr) => {
      const date = parseISO(dateStr);
      hasAppointment.push(date);
      if (data.statuses.includes("pending")) {
        hasPending.push(date);
      }
      if (data.statuses.includes("approved")) {
        hasConfirmed.push(date);
      }
    });

    return { hasAppointment, hasPending, hasConfirmed };
  }, [appointmentDates]);

  const modifiersClassNames = {
    hasAppointment: "relative",
    hasPending: "bg-amber-100 dark:bg-amber-900/30",
    hasConfirmed: "bg-primary/10",
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-primary text-primary-foreground";
      case "pending":
        return "bg-amber-500 text-white";
      case "completed":
        return "bg-muted text-muted-foreground";
      case "cancelled":
      case "rejected":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-secondary";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Calendar View</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            className={cn("p-3 pointer-events-auto w-full")}
            components={{
              DayContent: ({ date }) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const data = appointmentDates.get(dateStr);
                return (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <span>{date.getDate()}</span>
                    {data && data.count > 0 && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {data.statuses.includes("approved") && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                        {data.statuses.includes("pending") && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            }}
          />
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Confirmed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {format(selectedDate, "MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No appointments on this date
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {apt.provider_profile?.full_name || "Provider"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                      </p>
                    </div>
                    <Badge className={cn("text-xs", getStatusColor(apt.status))}>
                      {apt.status === "approved" ? "Confirmed" : apt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
