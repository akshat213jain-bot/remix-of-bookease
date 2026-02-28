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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { addDays } from "date-fns";
import { useAvailableSlots } from "@/hooks/useAppointments";

interface ProviderRescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  providerId: string;
  currentDate: string;
  currentTime: string;
  patientName: string;
  onPropose: (data: {
    id: string;
    proposed_date: string;
    proposed_start_time: string;
    proposed_end_time: string;
    reschedule_reason?: string;
  }) => void;
  isProposing: boolean;
}

export const ProviderRescheduleDialog = ({
  open,
  onOpenChange,
  appointmentId,
  providerId,
  currentDate,
  currentTime,
  patientName,
  onPropose,
  isProposing,
}: ProviderRescheduleDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data: availableSlots, isLoading: slotsLoading } = useAvailableSlots(
    providerId,
    selectedDate
  );

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDate(undefined);
      setSelectedTime(null);
      setReason("");
    }
  }, [open]);

  const handlePropose = () => {
    if (!selectedDate || !selectedTime) return;

    const slot = availableSlots?.find((s) => s.start === selectedTime);
    if (!slot) return;

    onPropose({
      id: appointmentId,
      proposed_date: selectedDate.toISOString().split("T")[0],
      proposed_start_time: slot.start,
      proposed_end_time: slot.end,
      reschedule_reason: reason || undefined,
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggest New Time</DialogTitle>
          <DialogDescription>
            Propose a new appointment time for {patientName}. Current: {currentDate} at{" "}
            {formatTime(currentTime)}. The patient will need to accept your proposal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Selection */}
          <div>
            <Label className="mb-2 block">Select New Date</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedTime(null);
              }}
              className="rounded-md border w-full"
              disabled={(date) =>
                date < new Date() || date > addDays(new Date(), 60)
              }
            />
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div>
              <Label className="mb-2 block">Select New Time</Label>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableSlots && availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots
                    .filter((slot) => slot.available)
                    .map((slot) => (
                      <Button
                        key={slot.start}
                        variant={selectedTime === slot.start ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(slot.start)}
                        className="text-xs"
                      >
                        {formatTime(slot.start)}
                      </Button>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No available slots for this date.
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="mb-2 block">
              Reason for Rescheduling (optional)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Let the patient know why you need to reschedule..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePropose}
            disabled={!selectedDate || !selectedTime || isProposing}
          >
            {isProposing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Proposal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};