import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CouponInputProps {
    amount: number;
    serviceId?: string;
    onCouponApplied: (discount: {
        couponId: string;
        discountAmount: number;
        finalAmount: number;
    }) => void;
    onCouponRemoved: () => void;
    className?: string;
}

interface CouponValidation {
    valid: boolean;
    coupon_id?: string;
    discount_type?: string;
    discount_value?: number;
    discount_amount?: number;
    final_amount?: number;
    error_message?: string;
}

export const CouponInput = ({
    amount,
    serviceId,
    onCouponApplied,
    onCouponRemoved,
    className,
}: CouponInputProps) => {
    const [code, setCode] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
    const { toast } = useToast();

    const validateCoupon = async () => {
        if (!code.trim()) {
            toast({
                title: "Enter a code",
                description: "Please enter a coupon code",
                variant: "destructive",
            });
            return;
        }

        setIsValidating(true);
        try {
            const { data, error } = await supabase.functions.invoke<CouponValidation>(
                "validate-coupon",
                {
                    body: {
                        code: code.trim(),
                        amount,
                        service_id: serviceId,
                    },
                }
            );

            if (error) throw error;

            if (data?.valid) {
                setAppliedCoupon(data);
                onCouponApplied({
                    couponId: data.coupon_id!,
                    discountAmount: data.discount_amount!,
                    finalAmount: data.final_amount!,
                });
                toast({
                    title: "Coupon applied!",
                    description: `You saved ${formatDiscount(data)}`,
                });
            } else {
                toast({
                    title: "Invalid coupon",
                    description: data?.error_message || "This coupon code is not valid",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to validate coupon",
                variant: "destructive",
            });
        } finally {
            setIsValidating(false);
        }
    };

    const removeCoupon = () => {
        setCode("");
        setAppliedCoupon(null);
        onCouponRemoved();
    };

    const formatDiscount = (coupon: CouponValidation) => {
        if (coupon.discount_type === "percentage") {
            return `${coupon.discount_value}% (₹${coupon.discount_amount?.toFixed(2)})`;
        }
        return `₹${coupon.discount_amount?.toFixed(2)}`;
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Enter coupon code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="pl-10"
                        disabled={!!appliedCoupon || isValidating}
                    />
                </div>
                {appliedCoupon ? (
                    <Button variant="outline" onClick={removeCoupon} className="shrink-0">
                        <X className="h-4 w-4 mr-1" />
                        Remove
                    </Button>
                ) : (
                    <Button
                        onClick={validateCoupon}
                        disabled={isValidating || !code.trim()}
                        className="shrink-0"
                    >
                        {isValidating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            "Apply"
                        )}
                    </Button>
                )}
            </div>

            {appliedCoupon && (
                <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                        <Check className="h-3 w-3 mr-1" />
                        {code}
                    </Badge>
                    <span className="text-green-600">
                        -{formatDiscount(appliedCoupon)}
                    </span>
                </div>
            )}
        </div>
    );
};
