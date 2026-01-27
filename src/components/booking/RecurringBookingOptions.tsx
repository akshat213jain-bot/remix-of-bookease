import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Repeat } from "lucide-react";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

export type RecurrencePattern = "none" | "weekly" | "biweekly" | "monthly";

interface RecurringBookingOptionsProps {
  recurrencePattern: RecurrencePattern;
  onRecurrencePatternChange: (pattern: RecurrencePattern) => void;
  recurrenceEndDate: Date | undefined;
  onRecurrenceEndDateChange: (date: Date | undefined) => void;
  selectedDate: Date | undefined;
}

const recurrenceOptions = [
  { value: "none", label: "One-time", description: "Single appointment" },
  { value: "weekly", label: "Weekly", description: "Every week" },
  { value: "biweekly", label: "Bi-weekly", description: "Every 2 weeks" },
  { value: "monthly", label: "Monthly", description: "Once a month" },
];

export const RecurringBookingOptions = ({
  recurrencePattern,
  onRecurrencePatternChange,
  recurrenceEndDate,
  onRecurrenceEndDateChange,
  selectedDate,
}: RecurringBookingOptionsProps) => {
  const maxEndDate = selectedDate ? addMonths(selectedDate, 6) : addMonths(new Date(), 6);
  const minEndDate = selectedDate || new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Repeat className="h-4 w-4 text-primary" />
        <Label className="font-medium">Booking Type</Label>
      </div>

      <RadioGroup
        value={recurrencePattern}
        onValueChange={(value) => onRecurrencePatternChange(value as RecurrencePattern)}
        className="grid grid-cols-2 gap-2"
      >
        {recurrenceOptions.map((option) => (
          <div key={option.value}>
            <RadioGroupItem
              value={option.value}
              id={option.value}
              className="peer sr-only"
            />
            <Label
              htmlFor={option.value}
              className={cn(
                "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors",
                "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              )}
            >
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {recurrencePattern !== "none" && (
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm">End recurring appointments on:</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !recurrenceEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {recurrenceEndDate ? format(recurrenceEndDate, "PPP") : "Select end date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={recurrenceEndDate}
                onSelect={onRecurrenceEndDateChange}
                disabled={(date) => date < minEndDate || date > maxEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            Appointments will be created up to {format(maxEndDate, "MMMM yyyy")}
          </p>
        </div>
      )}
    </div>
  );
};

export default RecurringBookingOptions;
