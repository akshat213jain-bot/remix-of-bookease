import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProviderProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

interface ProviderAvailability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
}

interface BlockedDate {
  id: string;
  provider_id: string;
  blocked_date: string;
  reason: string | null;
}

interface AvailabilityInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
}

export const useProviderAvailability = () => {
  const { providerProfile } = useProviderProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const providerId = providerProfile?.id;

  const availabilityQuery = useQuery({
    queryKey: ["provider-availability", providerId],
    queryFn: async (): Promise<ProviderAvailability[]> => {
      if (!providerId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("provider_availability")
        .select("id, provider_id, day_of_week, start_time, end_time, slot_duration, is_active")
        .eq("provider_id", providerId)
        .order("day_of_week");

      if (error) throw error;
      return data || [];
    },
    enabled: !!providerId,
  });

  const blockedDatesQuery = useQuery({
    queryKey: ["provider-blocked-dates", providerId],
    queryFn: async (): Promise<BlockedDate[]> => {
      if (!providerId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("provider_blocked_dates")
        .select("id, provider_id, blocked_date, reason")
        .eq("provider_id", providerId)
        .gte("blocked_date", new Date().toISOString().split("T")[0])
        .order("blocked_date");

      if (error) throw error;
      return data || [];
    },
    enabled: !!providerId,
  });

  // Fix #10: Use upsert pattern instead of delete-then-insert to prevent data loss
  const saveAvailabilityMutation = useMutation({
    mutationFn: async (schedules: AvailabilityInput[]) => {
      if (!providerId) throw new Error("Provider profile not found");

      const dataToUpsert = schedules.map((schedule) => ({
        provider_id: providerId,
        ...schedule,
      }));

      // Insert new records first, then delete old ones to prevent data loss
      let insertedIds: string[] = [];

      if (dataToUpsert.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: inserted, error: insertError } = await (supabase as any)
          .from("provider_availability")
          .insert(dataToUpsert)
          .select("id");

        if (insertError) throw insertError;
        insertedIds = (inserted || []).map((r: { id: string }) => r.id);
      }

      // Now delete old records (excluding newly inserted ones)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let deleteQuery = (supabase as any)
        .from("provider_availability")
        .delete()
        .eq("provider_id", providerId);

      if (insertedIds.length > 0) {
        deleteQuery = deleteQuery.not("id", "in", `(${insertedIds.join(",")})`);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        // Rollback: delete the newly inserted records
        if (insertedIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("provider_availability")
            .delete()
            .in("id", insertedIds);
        }
        throw deleteError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-availability", providerId] });
      toast({
        title: "Availability saved",
        description: "Your schedule has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save availability",
        variant: "destructive",
      });
    },
  });

  const addBlockedDateMutation = useMutation({
    mutationFn: async ({ date, reason }: { date: string; reason?: string }) => {
      if (!providerId) throw new Error("Provider profile not found");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("provider_blocked_dates")
        .insert({
          provider_id: providerId,
          blocked_date: date,
          reason: reason || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-blocked-dates", providerId] });
      toast({
        title: "Date blocked",
        description: "The date has been blocked successfully.",
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast({
          title: "Already blocked",
          description: "This date is already blocked.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to block date",
          variant: "destructive",
        });
      }
    },
  });

  const removeBlockedDateMutation = useMutation({
    mutationFn: async (blockedDateId: string) => {
      if (!providerId) throw new Error("Provider profile not found");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("provider_blocked_dates")
        .delete()
        .eq("id", blockedDateId)
        .eq("provider_id", providerId); // Defense-in-depth ownership filter

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-blocked-dates", providerId] });
      toast({
        title: "Date unblocked",
        description: "The date has been unblocked.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unblock date",
        variant: "destructive",
      });
    },
  });

  return {
    availability: availabilityQuery.data || [],
    blockedDates: blockedDatesQuery.data || [],
    isLoading: availabilityQuery.isLoading || blockedDatesQuery.isLoading,
    providerId,
    saveAvailability: saveAvailabilityMutation.mutate,
    isSaving: saveAvailabilityMutation.isPending,
    addBlockedDate: addBlockedDateMutation.mutate,
    removeBlockedDate: removeBlockedDateMutation.mutate,
  };
};
