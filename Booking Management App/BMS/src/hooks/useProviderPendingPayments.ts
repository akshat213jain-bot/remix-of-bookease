import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PendingPayment {
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    amount: number;
    payment_status: string;
    appointment_status: string;
    user_id: string;
    is_video_consultation: boolean;
    consumer_name: string;
    consumer_email: string;
    created_at: string;
}

interface PendingPaymentsSummary {
    total_pending: number;
    count: number;
}

export const useProviderPendingPayments = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const pendingPaymentsQuery = useQuery({
        queryKey: ["provider-pending-payments", user?.id],
        queryFn: async (): Promise<{ pendingPayments: PendingPayment[]; summary: PendingPaymentsSummary }> => {
            const { data, error } = await supabase.functions.invoke("provider-earnings", {
                body: { action: "get_pending_payments", limit: 50 },
            });

            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    const sendReminderMutation = useMutation({
        mutationFn: async ({ appointmentId, customMessage }: { appointmentId: string; customMessage?: string }) => {
            const { data, error } = await supabase.functions.invoke("send-payment-reminder", {
                body: {
                    appointment_id: appointmentId,
                    custom_message: customMessage
                },
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            toast({
                title: "Reminder Sent",
                description: `Payment reminder has been sent to ${data.email_sent_to}`,
            });
            // Optionally refetch pending payments
            queryClient.invalidateQueries({ queryKey: ["provider-pending-payments"] });
        },
        onError: (error) => {
            toast({
                title: "Failed to Send Reminder",
                description: error instanceof Error ? error.message : "Could not send payment reminder",
                variant: "destructive",
            });
        },
    });

    return {
        pendingPayments: pendingPaymentsQuery.data?.pendingPayments || [],
        summary: pendingPaymentsQuery.data?.summary,
        isLoading: pendingPaymentsQuery.isLoading,
        isError: pendingPaymentsQuery.isError,
        error: pendingPaymentsQuery.error,
        refetch: pendingPaymentsQuery.refetch,

        sendReminder: sendReminderMutation.mutate,
        isSendingReminder: sendReminderMutation.isPending,
    };
};
