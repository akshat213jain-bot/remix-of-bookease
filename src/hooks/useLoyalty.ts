import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LoyaltyPoints {
  id: string;
  user_id: string;
  total_points: number;
  lifetime_points: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  points: number;
  transaction_type: "earned" | "redeemed" | "expired" | "bonus";
  description: string | null;
  related_appointment_id: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: "pending" | "completed" | "expired";
  bonus_awarded: boolean;
  created_at: string;
  completed_at: string | null;
  referred_user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export const useLoyalty = () => {
  const { user } = useAuth();

  const { data: points, isLoading: isLoadingPoints } = useQuery({
    queryKey: ["loyalty-points", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("loyalty_points")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as LoyaltyPoints | null;
    },
    enabled: !!user?.id,
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["loyalty-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("loyalty_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as LoyaltyTransaction[];
    },
    enabled: !!user?.id,
  });

  const { data: referrals = [], isLoading: isLoadingReferrals } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with referred user info
      const enrichedReferrals = await Promise.all(
        (data || []).map(async (ref) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", ref.referred_id)
            .maybeSingle();

          return {
            ...ref,
            referred_user: profile,
          };
        })
      );

      return enrichedReferrals as Referral[];
    },
    enabled: !!user?.id,
  });

  const { data: referralCode } = useQuery({
    queryKey: ["referral-code", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.referral_code || null;
    },
    enabled: !!user?.id,
  });

  return {
    points: points?.total_points || 0,
    lifetimePoints: points?.lifetime_points || 0,
    transactions,
    referrals,
    referralCode,
    isLoading: isLoadingPoints || isLoadingTransactions || isLoadingReferrals,
    completedReferrals: referrals.filter((r) => r.status === "completed").length,
    pendingReferrals: referrals.filter((r) => r.status === "pending").length,
  };
};
