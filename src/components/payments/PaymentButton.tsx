import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyValue } from "@/lib/currency";

interface PaymentButtonProps {
    appointmentId: string;
    amount: number; // Amount in rupees (will be converted to cents)
    providerName: string;
    appointmentDate: string;
    startTime: string;
    size?: "sm" | "default" | "lg";
    variant?: "default" | "outline" | "secondary";
    className?: string;
}

export const PaymentButton = ({
    appointmentId,
    amount,
    providerName,
    appointmentDate,
    startTime,
    size = "sm",
    variant = "default",
    className = "",
}: PaymentButtonProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handlePayNow = async () => {
        if (isLoading) return;

        setIsLoading(true);

        try {
            // Convert amount from rupees to paise (cents equivalent for INR)
            const amountInPaise = Math.round(amount * 100);

            const { data, error } = await supabase.functions.invoke(
                "create-appointment-payment",
                {
                    body: {
                        appointment_id: appointmentId,
                        amount: amountInPaise,
                        provider_name: providerName,
                        appointment_date: appointmentDate,
                        start_time: startTime,
                    },
                }
            );

            if (error) {
                console.error("Payment error:", error);
                toast({
                    title: "Payment Error",
                    description: error.message || "Failed to initiate payment. Please try again.",
                    variant: "destructive",
                });
                return;
            }

            if (data?.url) {
                // Redirect to Stripe Checkout
                window.location.href = data.url;
            } else {
                toast({
                    title: "Payment Error",
                    description: "Failed to create payment session. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (err) {
            console.error("Payment error:", err);
            toast({
                title: "Payment Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            size={size}
            variant={variant}
            onClick={handlePayNow}
            disabled={isLoading}
            className={className}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                </>
            ) : (
                <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay {formatCurrencyValue(amount)}
                </>
            )}
        </Button>
    );
};

export default PaymentButton;
