
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, User, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { sendNotificationEmail } from "@/ai/flows/send-notification-email";


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

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="24px"
      height="24px"
      {...props}
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
	c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
	s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
	C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
	c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
	c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [realEmail, setRealEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedCustomerId, setGeneratedCustomerId] = useState("");
  const backgroundVideo = "https://cdn.coverr.co/videos/coverr-glowing-plexus-3714/1080p.mp4";

  const completeRegistration = async (displayName: string, userRealEmail: string) => {
      const randomFourDigits = Math.floor(1000 + Math.random() * 9000);
      const mockCustomerId = `GUB-${randomFourDigits}`;
      setGeneratedCustomerId(mockCustomerId);
      
      const authEmail = `${mockCustomerId}@gulshan-ebank.com`;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
        await updateProfile(userCredential.user, { displayName });
        
        await sendNotificationEmail({
          to: userRealEmail,
          subject: "Welcome to Gulshan eBank!",
          header: "Your New Customer ID",
          message: `Welcome aboard! Your new Customer ID is: <strong>${mockCustomerId}</strong>. Please keep it safe and use it for all future logins.`,
          button: {
            text: 'Login to Your Account',
            url: window.location.origin,
          },
        });

        toast({
          title: "Account Created!",
          description: "Your Customer ID has been generated and sent to your email.",
        });

        setIsSuccess(true);
      } catch (error: any) {
        handleAuthError(error);
        throw error; // Re-throw to be caught by the calling function's catch block
      }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await completeRegistration(name, realEmail);
    } catch (error: any) {
      // Error is already handled in completeRegistration, just need to stop loading
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      // We sign in with a popup to get the user's real email and name
      const result = await signInWithPopup(auth, provider);
      
      // Immediately sign the user out because we need to create a new account
      // with our custom Customer ID email format.
      await auth.signOut();

      const user = result.user;
      if (user.email && user.displayName) {
        // This is a temporary password. The user will have to reset it.
        // In a real app, you might direct them to a "create password" page.
        const tempPassword = Math.random().toString(36).slice(-8); 
        setPassword(tempPassword); // set password for completeRegistration
        await completeRegistration(user.displayName, user.email);
        
        // Also send a password reset email since they used Google
        await sendNotificationEmail({
            to: user.email,
            subject: "Set Your Gulshan eBank Password",
            header: "Important: Set Your Password",
            message: `Welcome to Gulshan eBank! Because you signed up with Google, you need to set a password for your new Customer ID. Please use the "Set/Reset Password" link on the login page to create your password. Your Customer ID is <strong>${generatedCustomerId}</strong>.`
        });
      } else {
        throw new Error("Could not retrieve user information from Google.");
      }
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    let errorMessage = "An unknown error occurred.";
    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "An account with this Customer ID alias already exists. This is an internal error, please try again.";
        break;
      case "auth/invalid-email":
        errorMessage = "The generated email address is not valid. This is an internal error.";
        break;
      case "auth/weak-password":
        errorMessage = "The password is too weak. It must be at least 6 characters long.";
        break;
      case "auth/popup-closed-by-user":
        errorMessage = "The sign-up pop-up was closed. Please try again.";
        break;
      default:
        errorMessage = error.message;
        break;
    }
    setError(errorMessage);
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
                <h1 className="text-4xl font-bold">Secure, Digital, and Trustworthy Banking</h1>
            </div>
             <div className="mt-auto">
                <h2 className="text-3xl font-semibold">Join Gulshan eBank Today</h2>
                <p className="text-gray-300 mt-2">Experience the future of banking in just a few clicks.</p>
             </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full lg:w-1/2 bg-white p-8 sm:p-12 flex flex-col justify-center">
            <div className="text-center mb-6">
                <p className="text-lg font-semibold">Create your Gulshan eBank Account</p>
                <div className="flex items-center justify-center gap-4 mt-2">
                    <span className="text-xs text-gray-500">POWERED BY</span>
                    <HdfcBankLogo />
                    <NowLogo />
                </div>
            </div>
            
            {isSuccess ? (
                <div className="text-center space-y-6">
                    <Alert variant="default" className="bg-green-50 border-green-200 text-left">
                        <AlertTitle className="font-semibold text-green-800">Registration Successful!</AlertTitle>
                        <AlertDescription className="text-green-700">
                           Your account has been created. Your Customer ID has been sent to <strong>{realEmail || auth.currentUser?.email}</strong>.
                        </AlertDescription>
                    </Alert>
                    <div className="p-6 border-2 border-dashed rounded-lg">
                        <Label htmlFor="customerId" className="text-sm font-semibold text-gray-700">Your New Customer ID</Label>
                        <p id="customerId" className="text-3xl font-bold tracking-widest text-primary my-2">{generatedCustomerId}</p>
                        <p className="text-xs text-muted-foreground">Please save this ID for future logins.</p>
                    </div>
                     <Link href="/" className="inline-flex items-center text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md py-3 px-6">
                        Proceed to Login
                    </Link>
                </div>
            ) : (
              <>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Signup Failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading || isGoogleLoading} className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address (for notifications)</Label>
                    <Input id="email" type="email" value={realEmail} onChange={(e) => setRealEmail(e.target.value)} required disabled={isLoading || isGoogleLoading} className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password"  className="text-sm font-semibold text-gray-700">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading || isGoogleLoading} className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading || isGoogleLoading} className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                  </div>

                  <Button type="submit" className="w-full bg-blue-700 text-white hover:bg-blue-800 rounded-md py-3" disabled={isLoading || isGoogleLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} disabled={isLoading || isGoogleLoading}>
                  {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <GoogleIcon className="mr-2 h-4 w-4" />
                  )}
                  Google
                </Button>
                
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <Link href="/" className="font-medium text-blue-600 hover:underline">
                    Log In
                  </Link>
                </p>
              </>
            )}
        </div>
      </div>
    </div>
  );
}

    