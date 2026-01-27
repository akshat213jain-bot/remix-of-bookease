import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, Loader2, Copy, Check, QrCode, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";

interface TwoFactorSetupProps {
    isEnabled?: boolean;
    onStatusChange?: (enabled: boolean) => void;
}

interface SetupResponse {
    success?: boolean;
    secret?: string;
    qr_url?: string;
    backup_codes?: string[];
    valid?: boolean;
    message?: string;
    error?: string;
}

export const TwoFactorSetup = ({ isEnabled = false, onStatusChange }: TwoFactorSetupProps) => {
    const [enabled, setEnabled] = useState(isEnabled);
    const [isLoading, setIsLoading] = useState(false);
    const [setupData, setSetupData] = useState<SetupResponse | null>(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [step, setStep] = useState<"initial" | "setup" | "verify" | "backup">("initial");
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const { toast } = useToast();

    const startSetup = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke<SetupResponse>("setup-2fa", {
                body: { action: "generate" },
            });

            if (error) throw error;

            if (data?.success) {
                setSetupData(data);
                setStep("setup");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to start 2FA setup",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const verifyAndEnable = async () => {
        if (verificationCode.length !== 6) {
            toast({
                title: "Invalid code",
                description: "Please enter a 6-digit code",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke<SetupResponse>("setup-2fa", {
                body: { action: "enable", code: verificationCode },
            });

            if (error) throw error;

            if (data?.success) {
                setEnabled(true);
                setStep("backup");
                onStatusChange?.(true);
                toast({
                    title: "2FA Enabled",
                    description: "Two-factor authentication is now active",
                });
            } else {
                toast({
                    title: "Invalid code",
                    description: data?.error || "The code you entered is incorrect",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to enable 2FA",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const disable2FA = async () => {
        setIsLoading(true);
        try {
            const code = prompt("Enter your 2FA code to disable:");
            if (!code) {
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase.functions.invoke<SetupResponse>("setup-2fa", {
                body: { action: "disable", code },
            });

            if (error) throw error;

            if (data?.success) {
                setEnabled(false);
                setSetupData(null);
                setStep("initial");
                onStatusChange?.(false);
                toast({
                    title: "2FA Disabled",
                    description: "Two-factor authentication has been disabled",
                });
            } else {
                toast({
                    title: "Invalid code",
                    description: data?.error || "The code you entered is incorrect",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to disable 2FA",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCode(text);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const renderSetupStep = () => {
        switch (step) {
            case "setup":
                return (
                    <div className="space-y-4">
                        <Alert>
                            <QrCode className="h-4 w-4" />
                            <AlertTitle>Scan this QR code</AlertTitle>
                            <AlertDescription>
                                Use an authenticator app like Google Authenticator or Authy to scan this code.
                            </AlertDescription>
                        </Alert>

                        {setupData?.qr_url && (
                            <div className="flex justify-center p-4 bg-white rounded-lg">
                                <img src={setupData.qr_url} alt="2FA QR Code" className="w-48 h-48" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Or enter this secret manually:</Label>
                            <div className="flex gap-2">
                                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                                    {setupData?.secret}
                                </code>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyToClipboard(setupData?.secret || "")}
                                >
                                    {copiedCode === setupData?.secret ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <Button onClick={() => setStep("verify")} className="w-full">
                            Continue to Verification
                        </Button>
                    </div>
                );

            case "verify":
                return (
                    <div className="space-y-4">
                        <Alert>
                            <Key className="h-4 w-4" />
                            <AlertTitle>Enter verification code</AlertTitle>
                            <AlertDescription>
                                Enter the 6-digit code from your authenticator app to complete setup.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="code">Verification Code</Label>
                            <Input
                                id="code"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                placeholder="000000"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                                className="text-center text-2xl tracking-widest"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep("setup")} className="flex-1">
                                Back
                            </Button>
                            <Button
                                onClick={verifyAndEnable}
                                disabled={verificationCode.length !== 6 || isLoading}
                                className="flex-1"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Enable"}
                            </Button>
                        </div>
                    </div>
                );

            case "backup":
                return (
                    <div className="space-y-4">
                        <Alert className="border-amber-200 bg-amber-50">
                            <AlertTitle className="text-amber-800">Save your backup codes</AlertTitle>
                            <AlertDescription className="text-amber-700">
                                Store these codes safely. You can use them to access your account if you lose your phone.
                            </AlertDescription>
                        </Alert>

                        <div className="grid grid-cols-2 gap-2">
                            {setupData?.backup_codes?.map((code, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm"
                                >
                                    <span className="flex-1">{code}</span>
                                    <button
                                        onClick={() => copyToClipboard(code)}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        {copiedCode === code ? (
                                            <Check className="h-3 w-3" />
                                        ) : (
                                            <Copy className="h-3 w-3" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={() => {
                                const allCodes = setupData?.backup_codes?.join("\n") || "";
                                copyToClipboard(allCodes);
                                toast({ title: "All codes copied!" });
                            }}
                            variant="outline"
                            className="w-full"
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy All Codes
                        </Button>

                        <Button onClick={() => setStep("initial")} className="w-full">
                            Done
                        </Button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                    </div>
                    {enabled && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Enabled
                        </Badge>
                    )}
                </div>
                <CardDescription>
                    Add an extra layer of security to your account by requiring a code from your
                    authenticator app when signing in.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {enabled ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-green-600" />
                                <span>Two-factor authentication is active</span>
                            </div>
                            <Switch checked={true} disabled />
                        </div>
                        <Button variant="destructive" onClick={disable2FA} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Disable 2FA
                        </Button>
                    </div>
                ) : (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button onClick={startSetup} disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Enable 2FA
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
                                <DialogDescription>
                                    Secure your account with an authenticator app
                                </DialogDescription>
                            </DialogHeader>
                            {renderSetupStep()}
                        </DialogContent>
                    </Dialog>
                )}
            </CardContent>
        </Card>
    );
};
