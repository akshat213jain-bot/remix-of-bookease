
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { sendNotificationEmail } from "@/ai/flows/send-notification-email";
import Link from "next/link";

function HdfcBankLogo() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" className="h-8 w-auto">
            <rect width="40" height="40" fill="#004c8f" rx="4" ry="4" y="5" />
            <rect x="5" y="10" width="30" height="5" fill="white" />
            <rect x="5" y="20" width="30" height="5" fill="white" />
            <rect x="5" y="30" width="30" height="5" fill="white" />
            <rect x="15" y="10" width="5" height="25" fill="white" />
            <text x="50" y="30" fontFamily="Arial, sans-serif" fontSize="20" fill="#004c8f" fontWeight="bold">GULSHAN BAN</text>
        </svg>
    )
}

function NowLogo() {
    return (
        <div className="flex items-center">
            <span className="text-xl font-bold text-red-600">now</span>
        </div>
    )
}

const MOCK_OTP = "123456";

export default function GetCustomerIdPage() {
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [step, setStep] = useState<"details" | "otp">("details");
  const { toast } = useToast();
  const backgroundVideo = "https://cdn.coverr.co/videos/coverr-glowing-plexus-3714/1080p.mp4";
  
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate sending OTP
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
        title: "OTP Sent (Mock)",
        description: `Your OTP is: ${MOCK_OTP}`,
        duration: 10000,
    });

    setStep("otp");
    setIsLoading(false);
  };
  
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    if (otp !== MOCK_OTP) {
        setError("Invalid OTP. Please try again.");
        setIsLoading(false);
        return;
    }

    try {
      const randomFourDigits = Math.floor(1000 + Math.random() * 9000);
      const mockCustomerId = `GUB-${randomFourDigits}`;

      await sendNotificationEmail({
        to: email,
        subject: "Your Gulshan eBank Customer ID",
        header: "Customer ID Recovery",
        message: `As requested, here is your Customer ID: <strong>${mockCustomerId}</strong>. Please keep it safe and do not share it with anyone.`,
      });

      toast({
        title: "Email Sent",
        description: "Your Customer ID has been sent to your registered email address.",
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
     <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="relative flex w-full max-w-6xl mx-auto overflow-hidden">
        {/* Left Side */}
        <div className="w-1/2 relative text-white p-12 flex-col justify-between items-start hidden lg:flex">
          {backgroundVideo && (
            <video autoPlay loop muted className="absolute top-0 left-0 w-full h-full object-cover z-0">
                <source src={backgroundVideo} type="video/mp4" />
            </video>
          )}
          <div className="absolute top-0 left-0 w-full h-full bg-black/50 z-10"></div>
          <div className="relative z-20 flex flex-col h-full">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold">Forgot Your Customer ID?</h1>
                <p className="text-gray-300">It happens. Let's get you back into your account.</p>
            </div>
             <div className="mt-auto">
                <h2 className="text-3xl font-semibold">Fast & Secure</h2>
                <p className="text-gray-300 mt-2">We'll send your ID to your registered email address after OTP verification.</p>
             </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full lg:w-1/2 bg-white p-8 sm:p-12 flex flex-col justify-center">
            <div className="text-center mb-6">
                <p className="text-lg font-semibold">Get Customer ID</p>
                <div className="flex items-center justify-center gap-4 mt-2">
                    <span className="text-xs text-gray-500">POWERED BY</span>
                    <HdfcBankLogo />
                    <NowLogo />
                </div>
            </div>

            {isSuccess ? (
                <div className="text-center">
                    <Alert variant="default" className="bg-green-50 border-green-200">
                        <AlertTitle className="font-semibold text-green-800">Email Sent!</AlertTitle>
                        <AlertDescription className="text-green-700">
                           Your Customer ID has been sent to <strong>{email}</strong>. Please check your inbox (and spam folder).
                        </AlertDescription>
                    </Alert>
                     <Link href="/" className="inline-flex items-center text-sm text-blue-600 hover:underline mt-6">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Login
                    </Link>
                </div>
            ) : (
                <form onSubmit={step === 'details' ? handleSendOtp : handleVerifyOtp} className="space-y-6">
                    {error && (
                        <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    
                    {step === 'details' ? (
                         <>
                            <p className="text-sm text-muted-foreground">
                                Enter your registered details below. We will send an OTP to your mobile to verify your identity.
                            </p>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                                    Email Address
                                  </Label>
                                  <Input
                                  id="email"
                                  type="email"
                                  placeholder="you@example.com"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  required
                                  disabled={isLoading}
                                  />
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="mobile" className="text-sm font-semibold text-gray-700">
                                    Registered Mobile Number
                                  </Label>
                                  <Input
                                  id="mobile"
                                  type="tel"
                                  placeholder="Enter your 10-digit mobile number"
                                  value={mobile}
                                  onChange={(e) => setMobile(e.target.value)}
                                  required
                                  disabled={isLoading}
                                  maxLength={10}
                                  />
                              </div>
                            </div>
                            <Button type="submit" className="w-full bg-blue-700 text-white hover:bg-blue-800 rounded-md py-3" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? "Sending OTP..." : "Send OTP"}
                            </Button>
                         </>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground">
                                An OTP has been sent to your mobile number ending in ******{mobile.slice(-4)}.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="otp" className="text-sm font-semibold text-gray-700">
                                    One-Time Password (OTP)
                                </Label>
                                <Input
                                id="otp"
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                disabled={isLoading}
                                maxLength={6}
                                className="text-center tracking-[0.5rem]"
                                />
                            </div>
                             <Button type="submit" className="w-full bg-blue-700 text-white hover:bg-blue-800 rounded-md py-3" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? "Verifying..." : "Verify OTP & Get Customer ID"}
                            </Button>
                             <Button variant="link" onClick={() => setStep('details')} className="text-blue-600 w-full" disabled={isLoading}>
                                Change Details
                            </Button>
                        </>
                    )}
                </form>
            )}
             {!isSuccess && (
                <p className="text-center text-sm text-muted-foreground mt-6">
                Remember your ID?{" "}
                <Link href="/" className="font-medium text-blue-600 hover:underline">
                    Log In
                </Link>
                </p>
            )}
        </div>
      </div>
    </div>
  );
}
