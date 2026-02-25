import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface WaitlistEntry {
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
}

interface CreateWaitlistInput {
  provider_id: string;
  preferred_date?: string;
  preferred_day_of_week?: number;
  preferred_start_time?: string;
  preferred_end_time?: string;
  is_flexible?: boolean;
}

// Fix #14: Explicit columns
export const useWaitlist = (providerId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const waitlistQuery = useQuery({
    queryKey: ["waitlist", user?.id, providerId],
    queryFn: async (): Promise<WaitlistEntry[]> => {
      if (!user?.id) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("slot_waitlist")
        .select("id, user_id, provider_id, preferred_date, preferred_day_of_week, preferred_start_time, preferred_end_time, is_flexible, is_active, notified_at, created_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (providerId) {
        query = query.eq("provider_id", providerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const joinMutation = useMutation({
    mutationFn: async (input: CreateWaitlistInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("slot_waitlist")
        .insert({
          user_id: user.id,
          provider_id: input.provider_id,
          preferred_date: input.preferred_date || null,
          preferred_day_of_week: input.preferred_day_of_week ?? null,
          preferred_start_time: input.preferred_start_time || null,
          preferred_end_time: input.preferred_end_time || null,
          is_flexible: input.is_flexible || false,
          is_active: true,
        })
        .select("id, user_id, provider_id, preferred_date, preferred_day_of_week, preferred_start_time, preferred_end_time, is_flexible, is_active, created_at")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist", user?.id] });
      toast({
        title: "Added to waitlist!",
        description: "We'll notify you when a matching slot becomes available.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to join waitlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (waitlistId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("slot_waitlist")
        .update({ is_active: false })
        .eq("id", waitlistId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist", user?.id] });
      toast({
        title: "Removed from waitlist",
        description: "You won't receive notifications for this slot anymore.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to leave waitlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isOnWaitlist = (checkProviderId: string) => {
    return (waitlistQuery.data || []).some(
      (entry) => entry.provider_id === checkProviderId && entry.is_active
    );
  };

  return {
    waitlist: waitlistQuery.data || [],
    isLoading: waitlistQuery.isLoading,
    joinWaitlist: joinMutation.mutate,
    joinWaitlistAsync: joinMutation.mutateAsync,
    isJoining: joinMutation.isPending,
    leaveWaitlist: leaveMutation.mutate,
    isLeaving: leaveMutation.isPending,
    isOnWaitlist,
  };
};
