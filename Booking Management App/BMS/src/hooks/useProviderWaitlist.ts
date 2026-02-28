import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProviderProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

export interface WaitlistEntryWithUser {
  id: string;
  user_id: string;
  provider_id: string;
  preferred_date: string | null;
  preferred_day_of_week: number | null;
  preferred_start_time: string | null;
  preferred_end_time: string | null;
  is_flexible: boolean;
  is_active: boolean;
  notified_at: string | null;
  created_at: string;
  user_profile?: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const formatDayOfWeek = (day: number | null): string => {
  if (day === null || day < 0 || day > 6) return "Any day";
  return dayNames[day];
};

export const useProviderWaitlist = () => {
  const { providerProfile } = useProviderProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const providerId = providerProfile?.id;

  // Fetch provider's waitlist entries
  const waitlistQuery = useQuery({
    queryKey: ["provider-waitlist", providerId],
    queryFn: async (): Promise<WaitlistEntryWithUser[]> => {
      if (!providerId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("slot_waitlist")
        .select("id, user_id, provider_id, preferred_date, preferred_day_of_week, preferred_start_time, preferred_end_time, is_flexible, is_active, notified_at, created_at")
        .eq("provider_id", providerId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch user profiles
      const userIds: string[] = [];
      data.forEach((entry: WaitlistEntryWithUser) => {
        if (entry.user_id && !userIds.includes(entry.user_id)) {
          userIds.push(entry.user_id);
        }
      });

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, phone, avatar_url")
          .in("user_id", userIds);

        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p]));
          data.forEach((entry: WaitlistEntryWithUser) => {
            entry.user_profile = profileMap.get(entry.user_id);
          });
        }
      }

      return data;
    },
    enabled: !!providerId,
  });

  // Remove entry from waitlist (mark as inactive)
  const removeEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      if (!providerId) throw new Error("Provider not found");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("slot_waitlist")
        .update({ is_active: false })
        .eq("id", entryId)
        .eq("provider_id", providerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-waitlist", providerId] });
      toast({
        title: "Entry Removed",
        description: "The waitlist entry has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove entry",
        variant: "destructive",
      });
    },
  });

  return {
    waitlistEntries: waitlistQuery.data || [],
    isLoading: waitlistQuery.isLoading,
    error: waitlistQuery.error,
    removeEntry: removeEntryMutation.mutate,
    isRemoving: removeEntryMutation.isPending,
  };
};
