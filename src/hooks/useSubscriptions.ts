import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  appointments_included: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  appointments_remaining: number;
  starts_at: string;
  expires_at: string;
  status: "active" | "expired" | "cancelled";
  created_at: string;
  plan?: SubscriptionPlan;
}

// Fix #12: explicit columns
export const useSubscriptionPlans = () => {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name, description, price, appointments_included, duration_days, is_active, created_at")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  return { plans, isLoading };
};

export const useUserSubscription = () => {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["user-subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`
          id, user_id, plan_id, appointments_remaining, starts_at, expires_at, status, created_at,
          plan:subscription_plans(id, name, description, price, appointments_included, duration_days, is_active, created_at)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data as UserSubscription | null;
    },
    enabled: !!user?.id,
  });

  const hasActiveSubscription = !!subscription && new Date(subscription.expires_at) > new Date();
  const appointmentsRemaining = subscription?.appointments_remaining || 0;

  return {
    subscription,
    isLoading,
    hasActiveSubscription,
    appointmentsRemaining,
  };
};
