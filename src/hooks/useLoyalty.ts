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

// Fix #12: explicit columns; Fix #8: batch referral profile lookup
export const useLoyalty = () => {
  const { user } = useAuth();

  const { data: points, isLoading: isLoadingPoints } = useQuery({
    queryKey: ["loyalty-points", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("loyalty_points")
        .select("id, user_id, total_points, lifetime_points, created_at, updated_at")
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
        .select("id, user_id, points, transaction_type, description, related_appointment_id, created_at")
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
        .select("id, referrer_id, referred_id, referral_code, status, bonus_awarded, created_at, completed_at")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Batch fetch referred user profiles instead of N+1
      const referredIds = [...new Set(data.map(r => r.referred_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", referredIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(ref => ({
        ...ref,
        referred_user: profileMap.get(ref.referred_id) || null,
      })) as Referral[];
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
