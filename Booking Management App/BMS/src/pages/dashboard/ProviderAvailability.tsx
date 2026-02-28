import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  Clock,
  CalendarDays,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import { useProviderAvailability } from "@/hooks/useProviderAvailability";
import { format } from "date-fns";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
  slotDuration: number;
}

const defaultSchedule: Record<number, DaySchedule> = {
  0: { enabled: false, start: "09:00", end: "13:00", slotDuration: 30 },
  1: { enabled: true, start: "09:00", end: "17:00", slotDuration: 30 },
  2: { enabled: true, start: "09:00", end: "17:00", slotDuration: 30 },
  3: { enabled: true, start: "09:00", end: "17:00", slotDuration: 30 },
  4: { enabled: true, start: "09:00", end: "17:00", slotDuration: 30 },
  5: { enabled: true, start: "09:00", end: "17:00", slotDuration: 30 },
  6: { enabled: false, start: "09:00", end: "13:00", slotDuration: 30 },
};

const ProviderAvailability = () => {
  const {
    availability,
    blockedDates,
    isLoading,
    providerId,
    saveAvailability,
    isSaving,
    addBlockedDate,
    removeBlockedDate,
  } = useProviderAvailability();

  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(defaultSchedule);
  const [slotDuration, setSlotDuration] = useState("30");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // Initialize schedule from database
  useEffect(() => {
    if (availability.length > 0) {
      const newSchedule = { ...defaultSchedule };
      
      // First, set all days to disabled
      Object.keys(newSchedule).forEach((key) => {
        newSchedule[parseInt(key)].enabled = false;
      });

      // Then enable days that exist in the database
      availability.forEach((avail) => {
        newSchedule[avail.day_of_week] = {
          enabled: avail.is_active,
          start: avail.start_time.substring(0, 5),
          end: avail.end_time.substring(0, 5),
          slotDuration: avail.slot_duration,
        };
      });

      setSchedule(newSchedule);
      
      // Set slot duration from first available day
      if (availability.length > 0) {
        setSlotDuration(availability[0].slot_duration.toString());
      }
    }
  }, [availability]);

  // Sync blocked dates from database to calendar selection
  useEffect(() => {
    if (blockedDates.length > 0) {
      const dates = blockedDates.map((bd) => new Date(bd.blocked_date + "T00:00:00"));
      setSelectedDates(dates);
    }
  }, [blockedDates]);

  const toggleDay = (dayValue: number) => {
    setSchedule((prev) => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        enabled: !prev[dayValue].enabled,
      },
    }));
  };

  const updateTime = (dayValue: number, field: "start" | "end", value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    const schedules = DAYS_OF_WEEK
      .filter((day) => schedule[day.value].enabled)
      .map((day) => ({
        day_of_week: day.value,
        start_time: schedule[day.value].start,
        end_time: schedule[day.value].end,
        slot_duration: parseInt(slotDuration),
        is_active: true,
      }));

    saveAvailability(schedules);
  };

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) return;
    
    // Find newly added dates
    const newDates = dates.filter(
      (date) => !selectedDates.some((sd) => sd.toDateString() === date.toDateString())
    );

    // Find removed dates
    const removedDates = selectedDates.filter(
      (sd) => !dates.some((date) => date.toDateString() === sd.toDateString())
    );

    // Add new dates
    newDates.forEach((date) => {
      const formattedDate = format(date, "yyyy-MM-dd");
      addBlockedDate({ date: formattedDate });
    });

    // Remove dates
    removedDates.forEach((date) => {
      const blockedDate = blockedDates.find(
        (bd) => new Date(bd.blocked_date + "T00:00:00").toDateString() === date.toDateString()
      );
      if (blockedDate) {
        removeBlockedDate(blockedDate.id);
      }
    });

    setSelectedDates(dates);
  };

  const handleRemoveBlockedDate = (blockedDateId: string) => {
    removeBlockedDate(blockedDateId);
  };

  if (isLoading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!providerId) {
    return (
      <Layout showFooter={false}>
        <div className="container py-8 max-w-4xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Provider Profile Not Found</h1>
            <p className="text-muted-foreground mb-4">
              Please complete your provider profile first.
            </p>
            <Link to="/dashboard/provider/profile">
              <Button>Complete Profile</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="container py-8 max-w-4xl">
        {/* Back Button */}
        <Link to="/dashboard/provider" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold">Manage Availability</h1>
            <p className="text-muted-foreground">Set your working hours and appointment settings</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Slot Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Appointment Settings
              </CardTitle>
              <CardDescription>Configure your default slot duration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="slot-duration">Slot Duration</Label>
                <Select value={slotDuration} onValueChange={setSlotDuration}>
                  <SelectTrigger id="slot-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Duration of each appointment slot
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>Set your regular working hours for each day</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {DAYS_OF_WEEK.map((day) => {
                const daySchedule = schedule[day.value];
                return (
                  <div
                    key={day.value}
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border ${
                      daySchedule.enabled ? "bg-background" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full sm:w-32">
                      <Switch
                        checked={daySchedule.enabled}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <span className={`font-medium ${!daySchedule.enabled && "text-muted-foreground"}`}>
                        {day.label}
                      </span>
                    </div>

                    {daySchedule.enabled && (
                      <div className="flex flex-wrap items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={daySchedule.start}
                            onChange={(e) => updateTime(day.value, "start", e.target.value)}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={daySchedule.end}
                            onChange={(e) => updateTime(day.value, "end", e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </div>
                    )}

                    {!daySchedule.enabled && (
                      <span className="text-sm text-muted-foreground">Unavailable</span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Blocked Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Block Specific Dates</CardTitle>
              <CardDescription>
                Mark dates when you're unavailable (holidays, vacations, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={handleDateSelect}
                    className="rounded-md border"
                    disabled={(date) => date < new Date()}
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-3">Blocked Dates</h4>
                  {blockedDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No dates blocked. Click on dates in the calendar to block them.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {blockedDates.map((blockedDate) => (
                        <div
                          key={blockedDate.id}
                          className="flex items-center justify-between p-2 rounded-md border"
                        >
                          <span className="text-sm">
                            {format(new Date(blockedDate.blocked_date + "T00:00:00"), "EEE, MMM d, yyyy")}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveBlockedDate(blockedDate.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button (Mobile) */}
          <div className="sm:hidden">
            <Button className="w-full" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProviderAvailability;
