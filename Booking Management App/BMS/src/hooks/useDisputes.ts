import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Dispute {
  id: string;
  appointment_id: string;
  user_id: string;
  provider_id: string;
  dispute_type: string;
  description: string;
  status: string;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  appointment?: {
    appointment_date: string;
    start_time: string;
  };
  user?: {
    full_name: string;
    email: string;
  };
  provider?: {
    profession: string;
    profile?: {
      full_name: string;
    };
  };
}

export const useDisputes = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const disputesQuery = useQuery({
    queryKey: ["disputes", user?.id, role],
    queryFn: async (): Promise<Dispute[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("disputes")
        .select(`
          id, appointment_id, user_id, provider_id, dispute_type, description, status, resolution, resolved_by, resolved_at, created_at, updated_at,
          appointment:appointments(appointment_date, start_time),
          provider:provider_profiles(profession, user_id)
        `)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Batch fetch user profiles and provider profiles
      const allUserIds = new Set<string>();
      data.forEach((d: any) => {
        allUserIds.add(d.user_id);
        if (d.provider?.user_id) allUserIds.add(d.provider.user_id);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", Array.from(allUserIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map((d: any) => ({
        ...d,
        user: profileMap.get(d.user_id) || undefined,
        provider: d.provider ? {
          ...d.provider,
          profile: profileMap.get(d.provider.user_id) || undefined,
        } : undefined,
      }));
    },
    enabled: !!user?.id,
  });

  const createDisputeMutation = useMutation({
    mutationFn: async (dispute: {
      appointment_id: string;
      provider_id: string;
      dispute_type: string;
      description: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("disputes")
        .insert({
          ...dispute,
          user_id: user.id,
        })
        .select("id, appointment_id, user_id, provider_id, dispute_type, description, status, created_at")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute submitted successfully");
    },
    onError: (error) => {
      toast.error("Failed to submit dispute: " + error.message);
    },
  });

  // Fix #9: Client-side admin guard before resolving disputes
  const resolveDisputeMutation = useMutation({
    mutationFn: async ({
      disputeId,
      resolution,
    }: {
      disputeId: string;
      resolution: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (role !== "admin") throw new Error("Only admins can resolve disputes");

      const { error } = await supabase
        .from("disputes")
        .update({
          status: "resolved",
          resolution,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", disputeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute resolved successfully");
    },
    onError: (error) => {
      toast.error("Failed to resolve dispute: " + error.message);
    },
  });

  return {
    disputes: disputesQuery.data || [],
    isLoading: disputesQuery.isLoading,
    error: disputesQuery.error,
    createDispute: createDisputeMutation.mutate,
    resolveDispute: resolveDisputeMutation.mutate,
    isCreating: createDisputeMutation.isPending,
    isResolving: resolveDisputeMutation.isPending,
  };
};
