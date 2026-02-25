import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AccountStatus {
  has_account: boolean;
  account_id?: string;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
  };
}

export const useStripeConnect = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get account status
  const statusQuery = useQuery({
    queryKey: ["stripe-connect-status", user?.id],
    queryFn: async (): Promise<AccountStatus> => {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "get_account_status" },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  // Start onboarding
  const onboardMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "create_account_link" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
      queryClient.invalidateQueries({ queryKey: ["stripe-connect-status", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Onboarding failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get dashboard link
  const dashboardMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "create_login_link" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to open dashboard",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    refetch: statusQuery.refetch,

    startOnboarding: onboardMutation.mutate,
    isOnboarding: onboardMutation.isPending,

    openDashboard: dashboardMutation.mutate,
    isOpeningDashboard: dashboardMutation.isPending,
  };
};
