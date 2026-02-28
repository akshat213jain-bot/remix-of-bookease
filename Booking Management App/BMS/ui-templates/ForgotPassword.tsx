import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Mail, ArrowLeft, Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

// Validation schemas
const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

type Step = "email" | "otp" | "reset" | "success";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  
  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (): boolean => {
    try {
      emailSchema.parse(email);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ email: error.errors[0].message });
      }
      return false;
    }
  };

  const validatePasswords = (): boolean => {
    const passwordErrors: Record<string, string> = {};
    
    try {
      passwordSchema.parse(newPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        passwordErrors.newPassword = error.errors[0].message;
      }
    }
    
    if (newPassword !== confirmPassword) {
      passwordErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(passwordErrors);
    return Object.keys(passwordErrors).length === 0;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-password-reset-otp", {
        body: { email: email.trim().toLowerCase() }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.error) {
        toast.error(data.error);
        setIsLoading(false);
        return;
      }
      
      // For demo purposes, show the OTP
      if (data?.demo_otp) {
        setDemoOtp(data.demo_otp);
      }
      
      if (data?.reset_token) {
        setResetToken(data.reset_token);
      }
      
      toast.success("Verification code sent to your email");
      setStep("otp");
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("verify-password-reset-otp", {
        body: { 
          email: email.trim().toLowerCase(),
          otp,
          reset_token: resetToken
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.error) {
        toast.error(data.error);
        setOtp("");
        setIsLoading(false);
        return;
      }
      
      if (data?.verified) {
        toast.success("Email verified successfully");
        setStep("reset");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Invalid verification code. Please try again.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setOtp("");
    
    try {
      const { data, error } = await supabase.functions.invoke("send-password-reset-otp", {
        body: { email: email.trim().toLowerCase() }
      });
      
      if (error) throw error;
      
      if (data?.demo_otp) {
        setDemoOtp(data.demo_otp);
      }
      
      if (data?.reset_token) {
        setResetToken(data.reset_token);
      }
      
      toast.success("New verification code sent to your email");
    } catch (error) {
      console.error("Error resending OTP:", error);
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswords()) return;
    
    setIsLoading(true);
    
    try {
      // Use Supabase's updateUser to reset password
      // First we need to sign in with the reset token then update
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        // If user is not authenticated, we need to use a different approach
        // Call our edge function to handle the password update
        const { data, error: resetError } = await supabase.functions.invoke("reset-password", {
          body: {
            email: email.trim().toLowerCase(),
            reset_token: resetToken,
            new_password: newPassword
          }
        });
        
        if (resetError || data?.error) {
          throw new Error(data?.error || "Failed to reset password");
        }
      }
      
      toast.success("Password reset successfully!");
      setStep("success");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <form onSubmit={handleSendOtp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
        <p className="text-xs text-muted-foreground">
          We'll send a verification code to this email
        </p>
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending code...
          </>
        ) : (
          "Send Verification Code"
        )}
      </Button>
    </form>
  );

  const renderOtpStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to <strong>{email}</strong>
        </p>
      </div>

      {/* Demo OTP notice */}
      {demoOtp && (
        <div className="p-3 bg-accent border border-border rounded-lg text-center">
          <p className="text-xs text-accent-foreground">
            Demo mode: Your verification code is <strong>{demoOtp}</strong>
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <InputOTP
          value={otp}
          onChange={setOtp}
          maxLength={6}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button 
        onClick={handleVerifyOtp} 
        className="w-full" 
        disabled={otp.length !== 6 || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify Code"
        )}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          onClick={() => {
            setStep("email");
            setOtp("");
            setDemoOtp(null);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="inline h-4 w-4 mr-1" />
          Change email
        </button>
        <button
          onClick={handleResendOtp}
          className="text-primary hover:underline"
          disabled={isLoading}
        >
          Resend code
        </button>
      </div>
    </div>
  );

  const renderResetStep = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Enter new password"
            className="pl-10 pr-10"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="text-sm text-destructive">{errors.newPassword}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm new password"
            className="pl-10 pr-10"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
        )}
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Resetting password...
          </>
        ) : (
          "Reset Password"
        )}
      </Button>
    </form>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Password Reset Successful</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Your password has been reset successfully. You can now sign in with your new password.
        </p>
      </div>
      <Button onClick={() => navigate("/auth")} className="w-full">
        Go to Sign In
      </Button>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case "email":
        return "Forgot Password";
      case "otp":
        return "Verify Email";
      case "reset":
        return "Create New Password";
      case "success":
        return "Success!";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "email":
        return "Enter your email address and we'll send you a verification code";
      case "otp":
        return "Enter the code we sent to verify your identity";
      case "reset":
        return "Create a strong password for your account";
      case "success":
        return "Your password has been updated";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="p-4">
        <Link to="/auth" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">BookEase</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>{getStepTitle()}</CardTitle>
              <CardDescription>{getStepDescription()}</CardDescription>
            </CardHeader>
            <CardContent>
              {step === "email" && renderEmailStep()}
              {step === "otp" && renderOtpStep()}
              {step === "reset" && renderResetStep()}
              {step === "success" && renderSuccessStep()}
            </CardContent>
          </Card>

          {/* Step indicator */}
          {step !== "success" && (
            <div className="flex justify-center gap-2 mt-6">
              {["email", "otp", "reset"].map((s, i) => (
                <div
                  key={s}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    ["email", "otp", "reset"].indexOf(step) >= i
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
