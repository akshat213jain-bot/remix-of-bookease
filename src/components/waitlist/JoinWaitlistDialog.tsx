import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, BellOff, Clock, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useWaitlist } from "@/hooks/useWaitlist";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays } from "date-fns";

interface JoinWaitlistDialogProps {
  providerId: string;
  providerName: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return {
    value: `${hour.toString().padStart(2, "0")}:00`,
    label: `${hour12}:00 ${ampm}`,
  };
});

export const JoinWaitlistDialog = ({ providerId, providerName }: JoinWaitlistDialogProps) => {
  const { user } = useAuth();
  const { waitlist, joinWaitlist, isJoining, leaveWaitlist, isLeaving, isOnWaitlist } = useWaitlist(providerId);
  const [open, setOpen] = useState(false);
  const [isFlexible, setIsFlexible] = useState(true);
  const [preferredDate, setPreferredDate] = useState<Date | undefined>();
  const [preferredDay, setPreferredDay] = useState<string>("");
  const [preferredStartTime, setPreferredStartTime] = useState<string>("");
  const [preferredEndTime, setPreferredEndTime] = useState<string>("");
  const [useSpecificDate, setUseSpecificDate] = useState(true);

  const onWaitlist = isOnWaitlist(providerId);
  const currentEntry = waitlist.find((e) => e.provider_id === providerId);

  const handleJoin = () => {
    joinWaitlist({
      provider_id: providerId,
      preferred_date: useSpecificDate && preferredDate ? format(preferredDate, "yyyy-MM-dd") : undefined,
      preferred_day_of_week: !useSpecificDate && preferredDay ? parseInt(preferredDay) : undefined,
      preferred_start_time: preferredStartTime || undefined,
      preferred_end_time: preferredEndTime || undefined,
      is_flexible: isFlexible,
    });
    setOpen(false);
    // Reset form
    setPreferredDate(undefined);
    setPreferredDay("");
    setPreferredStartTime("");
    setPreferredEndTime("");
  };

  const handleLeave = () => {
    if (currentEntry) {
      leaveWaitlist(currentEntry.id);
    }
  };

  if (!user) {
    return null;
  }

  if (onWaitlist) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">You're on the waitlist</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeave}
              disabled={isLeaving}
            >
              {isLeaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-1" />
                  Leave
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            We'll notify you when a slot becomes available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Bell className="h-4 w-4 mr-2" />
          Join Waitlist
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Join Waitlist</DialogTitle>
          <DialogDescription>
            Get notified when a slot with {providerName} becomes available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Flexible option */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Any available slot</Label>
              <p className="text-xs text-muted-foreground">
                Notify me about any cancellation
              </p>
            </div>
            <Switch checked={isFlexible} onCheckedChange={setIsFlexible} />
          </div>

          {!isFlexible && (
            <>
              {/* Date preference type */}
              <div className="space-y-2">
                <Label>Preference Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={useSpecificDate ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseSpecificDate(true)}
                  >
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Specific Date
                  </Button>
                  <Button
                    type="button"
                    variant={!useSpecificDate ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseSpecificDate(false)}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Day of Week
                  </Button>
                </div>
              </div>

              {useSpecificDate ? (
                <div className="space-y-2">
                  <Label>Preferred Date</Label>
                  <Calendar
                    mode="single"
                    selected={preferredDate}
                    onSelect={setPreferredDate}
                    disabled={(date) => date < new Date() || date > addDays(new Date(), 60)}
                    className="rounded-md border"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Preferred Day</Label>
                  <Select value={preferredDay} onValueChange={setPreferredDay}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Time preference */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Select value={preferredStartTime} onValueChange={setPreferredStartTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Select value={preferredEndTime} onValueChange={setPreferredEndTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="End time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={isJoining}>
            {isJoining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Join Waitlist
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JoinWaitlistDialog;
