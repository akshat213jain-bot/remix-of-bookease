import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  customer_email: string | null;
  description: string | null;
  metadata: Record<string, string>;
  appointment: {
    id: string;
    appointment_date: string;
    start_time: string;
    user_id: string;
    provider_id: string;
    status: string;
    payment_status: string;
    user_name: string | null;
    user_email: string | null;
    provider_name: string | null;
    provider_profession: string | null;
  } | null;
}

interface Revenue {
  daily: { total: number; count: number };
  weekly: { total: number; count: number };
  monthly: { total: number; count: number };
  yearly: { total: number; count: number };
}

interface Balance {
  available: Array<{ amount: number; currency: string }>;
  pending: Array<{ amount: number; currency: string }>;
}

export const useAdminPayments = () => {
  const { toast } = useToast();
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async (): Promise<{ transactions: Transaction[]; has_more: boolean }> => {
      const { data, error } = await supabase.functions.invoke("admin-payment-data", {
        body: { action: "list_transactions", limit: 50 },
      });

      if (error) throw error;
      return data;
    },
    enabled: role === "admin",
  });

  const revenueQuery = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async (): Promise<{ revenue: Revenue }> => {
      const { data, error } = await supabase.functions.invoke("admin-payment-data", {
        body: { action: "get_revenue" },
      });

      if (error) throw error;
      return data;
    },
    enabled: role === "admin",
  });

  const balanceQuery = useQuery({
    queryKey: ["admin-balance"],
    queryFn: async (): Promise<{ balance: Balance }> => {
      const { data, error } = await supabase.functions.invoke("admin-payment-data", {
        body: { action: "get_balance" },
      });

      if (error) throw error;
      return data;
    },
    enabled: role === "admin",
  });

  const refundMutation = useMutation({
    mutationFn: async ({
      paymentIntentId,
      amount,
      reason,
    }: {
      paymentIntentId: string;
      amount?: number;
      reason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("admin-payment-data", {
        body: {
          action: "refund",
          payment_intent_id: paymentIntentId,
          refund_amount: amount,
          refund_reason: reason,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-revenue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-balance"] });
      toast({
        title: "Refund Processed",
        description: "The refund has been processed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Refund Failed",
        description: error instanceof Error ? error.message : "Failed to process refund",
        variant: "destructive",
      });
    },
  });

  return {
    transactions: transactionsQuery.data?.transactions || [],
    hasMoreTransactions: transactionsQuery.data?.has_more || false,
    isLoadingTransactions: transactionsQuery.isLoading,
    revenue: revenueQuery.data?.revenue,
    isLoadingRevenue: revenueQuery.isLoading,
    balance: balanceQuery.data?.balance,
    isLoadingBalance: balanceQuery.isLoading,
    refund: refundMutation.mutate,
    refundAsync: refundMutation.mutateAsync,
    isRefunding: refundMutation.isPending,
  };
};
