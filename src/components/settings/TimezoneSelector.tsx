import { useState, useEffect } from "react";
import { Globe, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Sao_Paulo", label: "São Paulo (Brazil)" },
  { value: "Europe/London", label: "London (UK)" },
  { value: "Europe/Paris", label: "Paris (France)" },
  { value: "Europe/Berlin", label: "Berlin (Germany)" },
  { value: "Europe/Moscow", label: "Moscow (Russia)" },
  { value: "Asia/Dubai", label: "Dubai (UAE)" },
  { value: "Asia/Kolkata", label: "India Standard Time" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo (Japan)" },
  { value: "Asia/Shanghai", label: "Shanghai (China)" },
  { value: "Australia/Sydney", label: "Sydney (Australia)" },
  { value: "Pacific/Auckland", label: "Auckland (New Zealand)" },
];

interface TimezoneSelectorProps {
  isProvider?: boolean;
}

export const TimezoneSelector = ({ isProvider = false }: TimezoneSelectorProps) => {
  const { user } = useAuth();
  const [timezone, setTimezone] = useState("UTC");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimezone = async () => {
      if (!user?.id) return;

      try {
        if (isProvider) {
          const { data, error } = await supabase
            .from("provider_profiles")
            .select("timezone")
            .eq("user_id", user.id)
            .maybeSingle();

          if (error) throw error;
          if (data?.timezone) setTimezone(data.timezone);
        } else {
          const { data, error } = await supabase
            .from("profiles")
            .select("timezone")
            .eq("user_id", user.id)
            .maybeSingle();

          if (error) throw error;
          if (data?.timezone) setTimezone(data.timezone);
        }
      } catch (error) {
        console.error("Failed to fetch timezone:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimezone();
  }, [user?.id, isProvider]);

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      if (isProvider) {
        const { error } = await supabase
          .from("provider_profiles")
          .update({ timezone })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profiles")
          .update({ timezone })
          .eq("user_id", user.id);

        if (error) throw error;
      }

      toast.success("Timezone updated successfully");
    } catch (error: any) {
      toast.error("Failed to update timezone: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const detectTimezone = () => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = COMMON_TIMEZONES.find((tz) => tz.value === detected);
    if (match) {
      setTimezone(match.value);
      toast.success(`Detected timezone: ${match.label}`);
    } else {
      toast.info(`Your timezone (${detected}) is not in our common list. Using UTC.`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timezone Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-10 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Timezone Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Set your timezone so appointment times are displayed correctly for your
          location.
        </p>

        <div className="space-y-2">
          <Label htmlFor="timezone">Your Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={detectTimezone}>
            Detect My Timezone
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
