import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2, CreditCard, Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const GIFT_AMOUNTS = [500, 1000, 2000, 5000];

const GIFT_DESIGNS = [
    { id: "default", name: "Classic", color: "bg-gradient-to-r from-purple-500 to-pink-500" },
    { id: "birthday", name: "Birthday", color: "bg-gradient-to-r from-yellow-400 to-orange-500" },
    { id: "thank-you", name: "Thank You", color: "bg-gradient-to-r from-green-400 to-teal-500" },
    { id: "celebration", name: "Celebration", color: "bg-gradient-to-r from-blue-500 to-indigo-600" },
];

export const GiftCardPurchase = () => {
    const [amount, setAmount] = useState<number>(1000);
    const [customAmount, setCustomAmount] = useState("");
    const [recipientEmail, setRecipientEmail] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [senderName, setSenderName] = useState("");
    const [message, setMessage] = useState("");
    const [selectedDesign, setSelectedDesign] = useState("default");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const finalAmount = customAmount ? parseFloat(customAmount) : amount;

    const handlePurchase = async () => {
        if (!finalAmount || finalAmount < 100) {
            toast({
                title: "Invalid Amount",
                description: "Minimum gift card amount is ₹100",
                variant: "destructive",
            });
            return;
        }

        if (!recipientEmail) {
            toast({
                title: "Email Required",
                description: "Please enter recipient's email address",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("gift-card", {
                body: {
                    action: "purchase",
                    amount: finalAmount,
                    recipient_email: recipientEmail,
                    recipient_name: recipientName,
                    sender_name: senderName,
                    personal_message: message,
                },
            });

            if (error) throw error;

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to purchase gift card",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    Send a Gift Card
                </CardTitle>
                <CardDescription>
                    Give the gift of booking! Perfect for any occasion.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Amount Selection */}
                <div className="space-y-3">
                    <Label>Select Amount</Label>
                    <div className="grid grid-cols-4 gap-2">
                        {GIFT_AMOUNTS.map((amt) => (
                            <Button
                                key={amt}
                                variant={amount === amt && !customAmount ? "default" : "outline"}
                                onClick={() => {
                                    setAmount(amt);
                                    setCustomAmount("");
                                }}
                                className={cn(
                                    "h-12",
                                    amount === amt && !customAmount && "ring-2 ring-primary"
                                )}
                            >
                                ₹{amt}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">or</span>
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2">₹</span>
                            <Input
                                type="number"
                                placeholder="Custom amount"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                className="pl-7"
                                min="100"
                            />
                        </div>
                    </div>
                </div>

                {/* Design Selection */}
                <div className="space-y-3">
                    <Label>Card Design</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {GIFT_DESIGNS.map((design) => (
                            <button
                                key={design.id}
                                onClick={() => setSelectedDesign(design.id)}
                                className={cn(
                                    "p-4 rounded-lg border-2 transition-all",
                                    selectedDesign === design.id
                                        ? "border-primary"
                                        : "border-transparent"
                                )}
                            >
                                <div
                                    className={cn(
                                        "h-16 rounded-md flex items-center justify-center text-white font-semibold",
                                        design.color
                                    )}
                                >
                                    ₹{finalAmount || 0}
                                </div>
                                <p className="text-sm mt-2 text-center">{design.name}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recipient Details */}
                <div className="space-y-3">
                    <Label>Recipient Details</Label>
                    <Input
                        type="email"
                        placeholder="Recipient's email *"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                    />
                    <Input
                        placeholder="Recipient's name"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                    />
                </div>

                {/* Sender Details */}
                <div className="space-y-3">
                    <Label>Your Details</Label>
                    <Input
                        placeholder="Your name"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                    />
                </div>

                {/* Personal Message */}
                <div className="space-y-3">
                    <Label>Personal Message (optional)</Label>
                    <Textarea
                        placeholder="Write a personal message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                    />
                </div>

                {/* Summary */}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                    <div className="flex justify-between">
                        <span>Gift Card Value</span>
                        <span className="font-semibold">₹{finalAmount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Send to</span>
                        <span>{recipientEmail || "—"}</span>
                    </div>
                </div>

                {/* Purchase Button */}
                <Button
                    className="w-full h-12 gap-2"
                    onClick={handlePurchase}
                    disabled={isLoading || !finalAmount || finalAmount < 100}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <CreditCard className="h-4 w-4" />
                            Purchase Gift Card - ₹{finalAmount || 0}
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};

// Gift Card Balance Check Component
export const GiftCardRedeem = () => {
    const [code, setCode] = useState("");
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const checkBalance = async () => {
        if (!code.trim()) {
            toast({
                title: "Enter Code",
                description: "Please enter a gift card code",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("gift-card", {
                body: {
                    action: "check_balance",
                    code: code.trim(),
                },
            });

            if (error) throw error;

            if (data.error) {
                toast({
                    title: "Error",
                    description: data.error,
                    variant: "destructive",
                });
            } else {
                setBalance(data.balance);
                toast({
                    title: "Balance Found!",
                    description: `This gift card has ₹${data.balance} remaining`,
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to check balance",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Check Gift Card Balance
                </CardTitle>
                <CardDescription>
                    Enter your gift card code to check the remaining balance
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="font-mono text-lg tracking-wider"
                    />
                    <Button onClick={checkBalance} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                    </Button>
                </div>

                {balance !== null && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                        <p className="text-sm text-green-600">Available Balance</p>
                        <p className="text-3xl font-bold text-green-700">₹{balance}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
