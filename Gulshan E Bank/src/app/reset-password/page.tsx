
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
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

export default function ResetPasswordPage() {
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const backgroundVideo = "https://cdn.coverr.co/videos/coverr-glowing-plexus-3714/1080p.mp4";

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setIsSuccess(false);

    const email = `${customerId}@gulshan-ebank.com`;

    try {
      // We attempt to send the reset email. Firebase will tell us if the user doesn't exist.
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for Customer ID ${customerId}, a password reset link has been sent to the associated email address.`,
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      // For security, we don't want to confirm/deny if a user exists.
      // So we show a success message even if the user is not found.
       if (err.code === "auth/user-not-found") {
         setIsSuccess(true);
         toast({
            title: "Password Reset Email Sent",
            description: `If an account exists for Customer ID ${customerId}, a password reset link has been sent to the associated email address.`,
         });
      } else {
         setError("An unexpected error occurred. Please try again later.");
      }
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
                <h1 className="text-4xl font-bold">Forgot Your Password?</h1>
                <p className="text-gray-300">No worries. We'll help you get back into your account securely.</p>
            </div>
             <div className="mt-auto">
                <h2 className="text-3xl font-semibold">Secure & Swift Recovery</h2>
                <p className="text-gray-300 mt-2">Your security is our top priority.</p>
             </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full lg:w-1/2 bg-white p-8 sm:p-12 flex flex-col justify-center">
            <div className="text-center mb-6">
                <p className="text-lg font-semibold">Set/Reset Password</p>
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
                            A password reset link has been sent to the email address associated with your account. Please check your inbox (and spam folder) to proceed.
                        </AlertDescription>
                    </Alert>
                     <Link href="/" className="inline-flex items-center text-sm text-blue-600 hover:underline mt-6">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Login
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleFormSubmit} className="space-y-6">
                {error && (
                    <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <p className="text-sm text-muted-foreground">
                    Enter your Customer ID below. We will send a secure link to your registered email address to reset your password.
                </p>
                <div className="space-y-2">
                    <Label htmlFor="reset-id" className="text-sm font-semibold text-gray-700">
                    Customer ID
                    </Label>
                    <Input
                    id="reset-id"
                    type="text"
                    placeholder="e.g., GUB-1234"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    disabled={isLoading}
                    />
                </div>
                <Button type="submit" className="w-full bg-blue-700 text-white hover:bg-blue-800 rounded-md py-3" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
                </form>
            )}
             {!isSuccess && (
                <p className="text-center text-sm text-muted-foreground mt-6">
                Remember your password?{" "}
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

    