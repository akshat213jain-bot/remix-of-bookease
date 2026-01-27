import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EarningsPeriod {
  total: number;
  count: number;
}

interface Earnings {
  daily: EarningsPeriod;
  weekly: EarningsPeriod;
  monthly: EarningsPeriod;
  yearly: EarningsPeriod;
  allTime: EarningsPeriod;
  pending: EarningsPeriod;
}

interface MonthlyTrend {
  month: string;
  year: number;
  earnings: number;
  appointments: number;
}

interface Transaction {
  id: string;
  appointment_date: string;
  start_time: string;
  amount: number;
  payment_date: string;
  payment_status: string;
  appointment_status: string;
  patient_name: string;
  patient_email?: string;
}

interface Payout {
  id: string;
  amount: number;
  date: string;
  status: string;
}

export const useProviderEarnings = () => {
  const { user } = useAuth();

  const earningsQuery = useQuery({
    queryKey: ["provider-earnings", user?.id],
    queryFn: async (): Promise<{ earnings: Earnings; monthlyTrends: MonthlyTrend[] }> => {
      const { data, error } = await supabase.functions.invoke("provider-earnings", {
        body: { action: "get_earnings" },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const transactionsQuery = useQuery({
    queryKey: ["provider-transactions", user?.id],
    queryFn: async (): Promise<{ transactions: Transaction[] }> => {
      const { data, error } = await supabase.functions.invoke("provider-earnings", {
        body: { action: "get_transactions", limit: 50 },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const payoutsQuery = useQuery({
    queryKey: ["provider-payouts", user?.id],
    queryFn: async (): Promise<{ payouts: Payout[]; summary: { total_paid: number; payout_count: number } }> => {
      const { data, error } = await supabase.functions.invoke("provider-earnings", {
        body: { action: "get_payouts", limit: 20 },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    earnings: earningsQuery.data?.earnings,
    monthlyTrends: earningsQuery.data?.monthlyTrends,
    isLoadingEarnings: earningsQuery.isLoading,

    transactions: transactionsQuery.data?.transactions,
    isLoadingTransactions: transactionsQuery.isLoading,

    payouts: payoutsQuery.data?.payouts,
    payoutsSummary: payoutsQuery.data?.summary,
    isLoadingPayouts: payoutsQuery.isLoading,
  };
};
