import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Smartphone, Banknote, Wallet } from "lucide-react";
import { useCurrencySettings } from "@/hooks/useSystemSettings";
import { formatCurrencyValue, getCurrencySymbol } from "@/lib/currency";

interface PaymentUpdateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointmentId: string;
    patientName: string;
    currentPaymentStatus?: string;
    currentPaymentMethod?: string;
    currentPaymentAmount?: number;
    onUpdate: (data: {
        id: string;
        payment_status: string;
        payment_method: string;
        payment_amount?: number;
    }) => void;
    isUpdating: boolean;
}

const paymentMethods = [
    { value: "cash", label: "Cash", icon: Banknote, color: "text-green-600" },
    { value: "upi", label: "UPI", icon: Smartphone, color: "text-purple-600" },
    { value: "card", label: "Card", icon: CreditCard, color: "text-blue-600" },
];

export const PaymentUpdateDialog = ({
    open,
    onOpenChange,
    appointmentId,
    patientName,
    currentPaymentStatus = "unpaid",
    currentPaymentMethod,
    currentPaymentAmount,
    onUpdate,
    isUpdating,
}: PaymentUpdateDialogProps) => {
    const currency = useCurrencySettings();
    const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">(
        currentPaymentStatus === "paid" ? "paid" : "unpaid"
    );
    const [paymentMethod, setPaymentMethod] = useState(currentPaymentMethod || "cash");
    const [paymentAmount, setPaymentAmount] = useState<string>(
        currentPaymentAmount?.toString() || ""
    );

    const handleSubmit = () => {
        onUpdate({
            id: appointmentId,
            payment_status: paymentStatus,
            payment_method: paymentMethod,
            payment_amount: paymentAmount ? parseInt(paymentAmount) : undefined,
        });
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset to current values when closing
            setPaymentStatus(currentPaymentStatus === "paid" ? "paid" : "unpaid");
            setPaymentMethod(currentPaymentMethod || "cash");
            setPaymentAmount(currentPaymentAmount?.toString() || "");
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        Update Payment
                    </DialogTitle>
                    <DialogDescription>
                        Update payment status for <span className="font-medium">{patientName}</span>'s appointment
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Payment Status */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Payment Status</Label>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant={paymentStatus === "paid" ? "default" : "outline"}
                                className={`flex-1 ${paymentStatus === "paid" ? "bg-green-600 hover:bg-green-700" : ""}`}
                                onClick={() => setPaymentStatus("paid")}
                            >
                                ✅ Paid
                            </Button>
                            <Button
                                type="button"
                                variant={paymentStatus === "unpaid" ? "default" : "outline"}
                                className={`flex-1 ${paymentStatus === "unpaid" ? "bg-red-600 hover:bg-red-700" : ""}`}
                                onClick={() => setPaymentStatus("unpaid")}
                            >
                                ❌ Unpaid
                            </Button>
                        </div>
                    </div>

                    {/* Payment Method - Only show when paid */}
                    {paymentStatus === "paid" && (
                        <>
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Payment Method</Label>
                                <RadioGroup
                                    value={paymentMethod}
                                    onValueChange={setPaymentMethod}
                                    className="grid grid-cols-3 gap-3"
                                >
                                    {paymentMethods.map((method) => (
                                        <div key={method.value}>
                                            <RadioGroupItem
                                                value={method.value}
                                                id={method.value}
                                                className="peer sr-only"
                                            />
                                            <Label
                                                htmlFor={method.value}
                                                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                                            >
                                                <method.icon className={`h-6 w-6 mb-2 ${method.color}`} />
                                                <span className="text-sm font-medium">{method.label}</span>
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>

                            {/* Payment Amount */}
                            <div className="space-y-2">
                                <Label htmlFor="amount" className="text-sm font-medium">
                                    Amount (Optional)
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{getCurrencySymbol(currency)}</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Enter amount"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Current Status Preview */}
                    <div className="p-3 rounded-lg bg-muted/50 border">
                        <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                        <div className="flex items-center gap-2">
                            <Badge
                                variant={paymentStatus === "paid" ? "default" : "destructive"}
                                className={paymentStatus === "paid" ? "bg-green-600" : ""}
                            >
                                {paymentStatus === "paid" ? "✅ Paid" : "❌ Unpaid"}
                            </Badge>
                            {paymentStatus === "paid" && (
                                <Badge variant="outline" className="capitalize">
                                    {paymentMethod}
                                </Badge>
                            )}
                            {paymentStatus === "paid" && paymentAmount && (
                                <Badge variant="secondary">
                                    {formatCurrencyValue(parseInt(paymentAmount), currency)}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isUpdating}>
                        {isUpdating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            "Save Payment"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentUpdateDialog;
