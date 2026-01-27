import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Calendar as CalendarIcon } from "lucide-react";
import { useAvailableSlots, AppointmentWithProvider } from "@/hooks/useAppointments";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentWithProvider | null;
  onReschedule: (data: {
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
  }) => void;
  isRescheduling: boolean;
}

export const RescheduleDialog = ({
  open,
  onOpenChange,
  appointment,
  onReschedule,
  isRescheduling,
}: RescheduleDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const providerId = appointment?.provider_id;
  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(providerId, selectedDate);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDate(undefined);
      setSelectedTime(null);
    }
  }, [open]);

  const handleReschedule = () => {
    if (!appointment || !selectedDate || !selectedTime) return;

    const slot = slots?.find((s) => s.start === selectedTime);
    if (!slot) return;

    onReschedule({
      id: appointment.id,
      appointment_date: format(selectedDate, "yyyy-MM-dd"),
      start_time: slot.start,
      end_time: slot.end,
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const availableSlots = slots?.filter((s) => s.available) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Select a new date and time for your appointment with{" "}
            {appointment?.provider_profile?.full_name || "the provider"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Date Selection */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Select Date
            </h4>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedTime(null);
              }}
              disabled={(date) =>
                date < new Date() || date > addDays(new Date(), 60)
              }
              className={cn("rounded-md border pointer-events-auto")}
            />
          </div>

          {/* Time Selection */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Select Time
            </h4>

            {!selectedDate ? (
              <div className="text-sm text-muted-foreground p-4 border rounded-md text-center">
                Please select a date first
              </div>
            ) : slotsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border rounded-md text-center">
                No available slots on this date. Please select another date.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.start}
                    variant={selectedTime === slot.start ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTime(slot.start)}
                    className="justify-center"
                  >
                    {formatTime(slot.start)}
                  </Button>
                ))}
              </div>
            )}

            {selectedDate && selectedTime && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">New Appointment:</p>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")} at {formatTime(selectedTime)}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={!selectedDate || !selectedTime || isRescheduling}
          >
            {isRescheduling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rescheduling...
              </>
            ) : (
              "Confirm Reschedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
