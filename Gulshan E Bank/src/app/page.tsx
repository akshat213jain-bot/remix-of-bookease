
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, QrCode, CreditCard, Landmark, Cookie, ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

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

type LoginView = "netbanking" | "creditcard" | "loan";

const NetBankingLogin = ({ 
    onLogin, 
    error, 
    isLoading,
}: { 
    onLogin: (customerId: string, password: string) => Promise<void>, 
    error: string | null, 
    isLoading: boolean,
}) => {
    const [customerId, setCustomerId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(customerId, password);
    };

    return (
        <>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customerId" className="text-sm font-semibold text-gray-700">Customer ID/User ID</Label>
                <Input
                  id="customerId"
                  name="customerId"
                  type="text"
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  placeholder="Enter your Customer ID"
                />
                 <Link href="/get-customer-id" passHref className="text-xs text-blue-600 hover:underline">
                    Get Customer ID
                </Link>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password"  className="text-sm font-semibold text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <Link href="/reset-password" passHref className="text-xs text-blue-600 hover:underline">
                    Set/Reset Password
                </Link>
              </div>

               <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-green-700 font-medium">Your secure image & text is now no longer required!</p>
               </div>

              <Button type="submit" className="w-full bg-blue-700 text-white hover:bg-blue-800 rounded-md py-3" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
             <p className="text-center text-sm text-gray-600 mt-6">
                Not registered for NetBanking?{" "}
                <Link href="/signup" className="font-medium text-blue-600 hover:underline">
                Register Now
                </Link>
            </p>
        </>
    );
};

const OtherLogin = ({ title, fieldLabel, onBack }: { title: string, fieldLabel: string, onBack: () => void }) => {
    const { toast } = useToast();
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: "Login Temporarily Unavailable",
            description: `Login for ${title} is not yet active. Please use NetBanking.`,
            variant: "destructive"
        });
    };

    return (
        <div>
            <button onClick={onBack} className="flex items-center text-sm text-blue-600 hover:underline mb-4">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Main Login
            </button>
            <h3 className="text-xl font-semibold mb-4">{title} Login</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="other-id" className="text-sm font-semibold text-gray-700">{fieldLabel}</Label>
                    <Input id="other-id" type="text" required className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="other-password" className="text-sm font-semibold text-gray-700">PIN / Password</Label>
                    <Input id="other-password" type="password" required className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <Button type="submit" className="w-full bg-blue-700 text-white hover:bg-blue-800 rounded-md py-3">
                    Login
                </Button>
            </form>
        </div>
    );
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(true);
  const [loginView, setLoginView] = useState<LoginView>("netbanking");
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const backgroundVideo = "https://cdn.coverr.co/videos/coverr-glowing-plexus-3714/1080p.mp4";
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  

  const handleLogin = async (customerId: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      // Format the customer ID as an email for Firebase Auth
      const email = `${customerId}@gulshan-ebank.com`;
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push("/dashboard");
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    let errorMessage = "An unknown error occurred.";
    switch (error.code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        errorMessage = "Invalid Customer ID or password. Please try again.";
        break;
      case "auth/invalid-email":
        errorMessage = "The Customer ID / User ID is not a valid format.";
        break;
      default:
        errorMessage = error.message;
        break;
    }
    setError(errorMessage);
  }
  
  const renderLoginView = () => {
    switch(loginView) {
        case 'creditcard':
            return <OtherLogin title="Credit Card" fieldLabel="Credit Card Number" onBack={() => setLoginView('netbanking')} />;
        case 'loan':
            return <OtherLogin title="Loan Account" fieldLabel="Loan Account Number" onBack={() => setLoginView('netbanking')} />;
        case 'netbanking':
        default:
            return <NetBankingLogin 
                        onLogin={handleLogin} 
                        error={error} 
                        isLoading={isLoading} 
                    />;
    }
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="relative flex w-full max-w-6xl mx-auto overflow-hidden">
          {/* Left Side */}
          <div className="w-1/2 relative text-white p-12 flex-col justify-between items-start hidden lg:flex">
            {isVideoLoading && <Skeleton className="absolute top-0 left-0 w-full h-full object-cover z-0" />}
            {backgroundVideo && (
              <video 
                key={backgroundVideo} 
                autoPlay 
                loop 
                muted 
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
                onLoadedData={() => setIsVideoLoading(false)}
              >
                  <source src={backgroundVideo} type="video/mp4" />
              </video>
            )}
            <div className="absolute top-0 left-0 w-full h-full bg-black/50 z-10"></div>
            <div className="relative z-20 flex flex-col h-full">
              <div className="space-y-4">
                  <h1 className="text-4xl font-bold">Welcome to the new-age banking experience!</h1>
              </div>
              <div className="mt-auto">
                  <h2 className="text-3xl font-semibold">Switch Effortlessly</h2>
                  <p className="text-gray-300 mt-2">Switching is easy between old and new interface</p>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="w-full lg:w-1/2 bg-white p-8 sm:p-12">
              <div className="text-center mb-6">
                  <p className="text-lg font-semibold">Welcome to NetBanking</p>
                  <div className="flex items-center justify-center gap-4 mt-2">
                      <span className="text-xs text-gray-500">MADE DIGITAL BY</span>
                      <HdfcBankLogo />
                      <NowLogo />
                  </div>
              </div>

              <div className="border rounded-lg p-3 flex items-center justify-between mb-6 cursor-pointer hover:bg-gray-50" onClick={() => setIsQrModalOpen(true)}>
                  <div className="flex items-center gap-3">
                      <QrCode className="w-8 h-8 text-blue-600" />
                      <div>
                          <p className="font-semibold">Scan QR code to Login</p>
                          <p className="text-xs text-gray-500">Recommended</p>
                      </div>
                  </div>
                  <div className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-md">NEW</div>
              </div>

              {renderLoginView()}

              {loginView === 'netbanking' && (
                  <div className="text-center mt-6">
                      <p className="text-sm text-gray-500 mb-2">No Gulshan Bank Savings Account? Log in using:</p>
                      <div className="flex justify-center gap-4">
                          <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => setLoginView("creditcard")}>
                              <CreditCard className="mr-2 h-4 w-4" /> Credit card
                          </Button>
                          <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => setLoginView("loan")}>
                              <Landmark className="mr-2 h-4 w-4" /> Loan Account
                          </Button>
                      </div>
                  </div>
              )}
          </div>
        </div>
        {showCookieBanner && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-3 flex justify-between items-center text-sm">
              <p>
                <Cookie className="inline-block mr-2" />
                We use cookies to enhance your digital banking experience. By browsing this site, you agree to our use of cookies. <Link href="#" onClick={(e) => { e.preventDefault(); }} className="underline">View Cookie Policy</Link>
              </p>
              <button onClick={() => setShowCookieBanner(false)}><X className="h-5 w-5" /></button>
          </div>
        )}
      </div>
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
          <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                  <DialogTitle>Scan QR Code to Log In</DialogTitle>
                  <DialogDescription>
                      Use the scanner in your Gulshan eBank mobile app to log in instantly.
                  </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center p-4 gap-4">
                  <Image src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://console.firebase.google.com/" alt="QR Code" width={250} height={250} data-ai-hint="QR code" />
                  <p className="text-sm text-muted-foreground">Waiting for scan...</p>
              </div>
          </DialogContent>
      </Dialog>
    </>
  );
}

    