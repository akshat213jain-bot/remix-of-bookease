import { useState, useEffect } from "react";
import { Clock, Save } from "lucide-react";
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

const BUFFER_OPTIONS = [
  { value: "0", label: "No buffer" },
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
];

export const BufferTimeSettings = () => {
  const { user } = useAuth();
  const [bufferBefore, setBufferBefore] = useState("0");
  const [bufferAfter, setBufferAfter] = useState("15");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("provider_profiles")
          .select("buffer_time_before, buffer_time_after")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setBufferBefore(String(data.buffer_time_before || 0));
          setBufferAfter(String(data.buffer_time_after || 15));
        }
      } catch (error) {
        console.error("Failed to fetch buffer settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("provider_profiles")
        .update({
          buffer_time_before: parseInt(bufferBefore, 10),
          buffer_time_after: parseInt(bufferAfter, 10),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Buffer time settings saved");
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buffer Time Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Buffer Time Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Set buffer time between appointments to prepare for your next patient
          or handle any overruns.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="buffer-before">Buffer Before Appointments</Label>
            <Select value={bufferBefore} onValueChange={setBufferBefore}>
              <SelectTrigger id="buffer-before">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUFFER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Time blocked before each appointment starts
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buffer-after">Buffer After Appointments</Label>
            <Select value={bufferAfter} onValueChange={setBufferAfter}>
              <SelectTrigger id="buffer-after">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUFFER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Time blocked after each appointment ends
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};
