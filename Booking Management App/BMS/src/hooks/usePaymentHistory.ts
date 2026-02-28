import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentTransaction {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  payment_status: string;
  payment_amount: number | null;
  payment_date: string | null;
  provider_id: string;
  status: string;
  is_video_consultation: boolean;
  provider_name?: string;
  provider_profession?: string;
}

// Fix #6: Explicit columns, no stripe_payment_intent_id exposed
export const usePaymentHistory = () => {
  const { user } = useAuth();

  const paymentHistoryQuery = useQuery({
    queryKey: ["user-payment-history", user?.id],
    queryFn: async (): Promise<PaymentTransaction[]> => {
      if (!user?.id) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: appointments, error } = await (supabase as any)
        .from("appointments")
        .select("id, appointment_date, start_time, end_time, payment_status, payment_amount, payment_date, payment_method, provider_id, status, is_video_consultation")
        .eq("user_id", user.id)
        .not("payment_amount", "is", null)
        .order("payment_date", { ascending: false, nullsFirst: false })
        .limit(200);

      if (error) throw error;
      if (!appointments || appointments.length === 0) return [];

      // Get provider IDs
      const providerIds = [...new Set(appointments.map((a: PaymentTransaction) => a.provider_id))];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: providers } = await (supabase as any)
        .from("provider_profiles")
        .select("id, user_id, profession")
        .in("id", providerIds);

      if (providers && providers.length > 0) {
        const providerUserIds = providers.map((p: { user_id: string }) => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", providerUserIds);

        const providerMap = new Map(providers.map((p: { id: string; user_id: string; profession: string }) => [p.id, p]));
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        appointments.forEach((apt: PaymentTransaction) => {
          const provider = providerMap.get(apt.provider_id) as { user_id: string; profession: string } | undefined;
          if (provider) {
            const profile = profileMap.get(provider.user_id) as { full_name: string } | undefined;
            apt.provider_name = profile?.full_name;
            apt.provider_profession = provider.profession;
          }
        });
      }

      return appointments;
    },
    enabled: !!user?.id,
  });

  const getTotals = () => {
    const payments = paymentHistoryQuery.data || [];
    const paid = payments.filter(p => p.payment_status === "paid");
    const refunded = payments.filter(p => p.payment_status === "refunded");
    
    return {
      totalPaid: paid.reduce((sum, p) => sum + (p.payment_amount || 0), 0),
      totalRefunded: refunded.reduce((sum, p) => sum + (p.payment_amount || 0), 0),
      transactionCount: paid.length,
    };
  };

  return {
    payments: paymentHistoryQuery.data || [],
    isLoading: paymentHistoryQuery.isLoading,
    error: paymentHistoryQuery.error,
    getTotals,
  };
};
