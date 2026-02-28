import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface ProviderProfileWithProfile {
  id: string;
  user_id: string;
  profession: string;
  specialty: string | null;
  is_approved: boolean | null;
  is_active: boolean | null;
  created_at: string;
  profile?: Profile;
}

interface AdminAppointment {
  id: string;
  user_id: string;
  provider_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
  user_profile?: Profile;
  provider_profile?: Profile;
  provider_info?: {
    profession: string;
    specialty: string | null;
  };
}

export const useAdminData = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all appointments (admin only)
  const appointmentsQuery = useQuery({
    queryKey: ["admin-appointments"],
    queryFn: async (): Promise<AdminAppointment[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select("id, user_id, provider_id, appointment_date, start_time, end_time, status, notes, cancellation_reason, payment_status, payment_amount, is_video_consultation, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get unique user and provider IDs
      const userIds: string[] = [];
      const providerIds: string[] = [];

      data.forEach((a: AdminAppointment) => {
        if (a.user_id && !userIds.includes(a.user_id)) userIds.push(a.user_id);
        if (a.provider_id && !providerIds.includes(a.provider_id)) providerIds.push(a.provider_id);
      });

      // Fetch user profiles
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, phone, avatar_url")
          .in("user_id", userIds);

        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p]));
          data.forEach((a: AdminAppointment) => {
            a.user_profile = profileMap.get(a.user_id);
          });
        }
      }

      // Fetch provider profiles
      if (providerIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: providers } = await (supabase as any)
          .from("provider_profiles")
          .select("id, user_id, profession, specialty")
          .in("id", providerIds);

        if (providers) {
          const providerUserIds = providers.map((p: { user_id: string }) => p.user_id);
          const { data: providerProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email, avatar_url")
            .in("user_id", providerUserIds);

          const providerMap = new Map(providers.map((p: { id: string; user_id: string; profession: string; specialty: string | null }) => [p.id, p]));
          const profileMap = new Map(providerProfiles?.map(p => [p.user_id, { ...p, phone: null }]) || []);

          data.forEach((a: AdminAppointment) => {
            const provider = providerMap.get(a.provider_id) as { user_id: string; profession: string; specialty: string | null } | undefined;
            if (provider) {
              a.provider_info = { profession: provider.profession, specialty: provider.specialty };
              a.provider_profile = profileMap.get(provider.user_id) as Profile | undefined;
            }
          });
        }
      }

      return data;
    },
    enabled: role === "admin",
  });

  // Fetch pending providers
  const pendingProvidersQuery = useQuery({
    queryKey: ["admin-pending-providers"],
    queryFn: async (): Promise<ProviderProfileWithProfile[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("provider_profiles")
        .select("id, user_id, profession, specialty, is_approved, is_active, created_at")
        .eq("is_approved", false)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch profiles
      const userIds = data.map((p: ProviderProfileWithProfile) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone, avatar_url")
        .in("user_id", userIds);

      if (profiles) {
        const profileMap = new Map(profiles.map(p => [p.user_id, p]));
        data.forEach((provider: ProviderProfileWithProfile) => {
          provider.profile = profileMap.get(provider.user_id);
        });
      }

      return data;
    },
    enabled: role === "admin",
  });

  // Approve provider
  const approveProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      if (role !== "admin") throw new Error("Unauthorized: admin role required");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("provider_profiles")
        .update({ is_approved: true })
        .eq("id", providerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-providers"] });
      toast({
        title: "Provider approved",
        description: "The provider has been approved and can now receive bookings.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve provider",
        variant: "destructive",
      });
    },
  });

  // Reject provider (deactivate and mark as rejected)
  const rejectProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      if (role !== "admin") throw new Error("Unauthorized: admin role required");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("provider_profiles")
        .update({
          is_active: false,
          is_approved: null // Mark as rejected (not pending, not approved)
        })
        .eq("id", providerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-providers"] });
      toast({
        title: "Provider rejected",
        description: "The provider application has been rejected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject provider",
        variant: "destructive",
      });
    },
  });

  // Get stats
  const getStats = () => {
    const appointments = appointmentsQuery.data || [];
    const pendingProviders = pendingProvidersQuery.data || [];

    return {
      totalAppointments: appointments.length,
      pendingProviders: pendingProviders.length,
      completedAppointments: appointments.filter(a => a.status === "completed").length,
      pendingAppointments: appointments.filter(a => a.status === "pending").length,
    };
  };

  return {
    appointments: appointmentsQuery.data || [],
    pendingProviders: pendingProvidersQuery.data || [],
    isLoading: appointmentsQuery.isLoading || pendingProvidersQuery.isLoading,
    approveProvider: approveProviderMutation.mutate,
    rejectProvider: rejectProviderMutation.mutate,
    isApproving: approveProviderMutation.isPending,
    isRejecting: rejectProviderMutation.isPending,
    getStats,
  };
};
