import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Heart, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TipDialogProps {
    appointmentId: string;
    providerName: string;
    appointmentTotal: number;
    onTipSent?: () => void;
}

const TIP_PRESETS = [
    { value: 10, label: "10%", type: "percentage" },
    { value: 15, label: "15%", type: "percentage" },
    { value: 20, label: "20%", type: "percentage" },
    { value: 50, label: "₹50", type: "fixed" },
    { value: 100, label: "₹100", type: "fixed" },
    { value: 200, label: "₹200", type: "fixed" },
];

export const TipDialog = ({
    appointmentId,
    providerName,
    appointmentTotal,
    onTipSent,
}: TipDialogProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const calculateTipAmount = () => {
        if (customAmount) return parseFloat(customAmount);
        if (selectedPreset === null) return 0;

        const preset = TIP_PRESETS[selectedPreset];
        if (preset.type === "percentage") {
            return Math.round(appointmentTotal * (preset.value / 100));
        }
        return preset.value;
    };

    const handleSubmitTip = async () => {
        const amount = calculateTipAmount();
        if (amount <= 0) {
            toast({
                title: "Invalid amount",
                description: "Please select or enter a tip amount",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("create-tip-payment", {
                body: {
                    appointment_id: appointmentId,
                    amount,
                    message: message || undefined,
                },
            });

            if (error) throw error;

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast({
                    title: "Tip Sent! 🎉",
                    description: `Your ₹${amount} tip has been sent to ${providerName}`,
                });
                setIsOpen(false);
                onTipSent?.();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to send tip",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const tipAmount = calculateTipAmount();

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    Leave a Tip
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-pink-500" />
                        Tip {providerName}
                    </DialogTitle>
                    <DialogDescription>
                        Show your appreciation with a tip! 100% goes to the provider.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Preset amounts */}
                    <div className="grid grid-cols-3 gap-2">
                        {TIP_PRESETS.map((preset, index) => (
                            <Button
                                key={index}
                                variant={selectedPreset === index ? "default" : "outline"}
                                onClick={() => {
                                    setSelectedPreset(index);
                                    setCustomAmount("");
                                }}
                                className={cn(
                                    "h-12",
                                    selectedPreset === index && "ring-2 ring-primary"
                                )}
                            >
                                {preset.label}
                                {preset.type === "percentage" && (
                                    <span className="ml-1 text-xs text-muted-foreground">
                                        (₹{Math.round(appointmentTotal * (preset.value / 100))})
                                    </span>
                                )}
                            </Button>
                        ))}
                    </div>

                    {/* Custom amount */}
                    <div className="space-y-2">
                        <Label>Or enter custom amount</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                ₹
                            </span>
                            <Input
                                type="number"
                                placeholder="Enter amount"
                                value={customAmount}
                                onChange={(e) => {
                                    setCustomAmount(e.target.value);
                                    setSelectedPreset(null);
                                }}
                                className="pl-7"
                                min="1"
                            />
                        </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                        <Label>Add a message (optional)</Label>
                        <Textarea
                            placeholder="Thanks for the great service!"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {/* Tip summary */}
                    {tipAmount > 0 && (
                        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                            <span className="text-sm font-medium">Tip Amount</span>
                            <Badge variant="secondary" className="text-lg">
                                ₹{tipAmount}
                            </Badge>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmitTip}
                        disabled={tipAmount <= 0 || isLoading}
                        className="gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                Send ₹{tipAmount} Tip
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
